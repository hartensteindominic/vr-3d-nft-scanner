import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { ethers } from 'ethers';
import { CONFIG } from './config.js';
import { uploadToIPFS, uploadMetadata, buildMetadata } from './ipfs.js';

// ============================================================
// VR 3D NFT Scanner – Full Integration
// Real-world scan → GLB → IPFS → Smart Contract Mint
// ============================================================

let camera, scene, renderer, controls;
let controller1, controller2;
let raycaster;
let holograms = [];
let currentModel = null;
let currentModelData = null;

// Wallet
let provider = null;
let signer = null;
let userAddress = null;
let contract = null;

// Minimal ABI for our contract
const CONTRACT_ABI = [
  "function mintHologram(address to, string memory uri) public returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event HologramMinted(address indexed to, uint256 indexed tokenId, string tokenURI)"
];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

initThree();
initUI();
animate();

// -------------------- THREE.JS --------------------
function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050508);
  scene.fog = new THREE.Fog(0x050508, 10, 30);

  camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  camera.position.set(0, 1.6, 3.5);

  scene.add(new THREE.AmbientLight(0x404060, 0.5));
  const dir = new THREE.DirectionalLight(0xa78bfa, 1.1);
  dir.position.set(5, 10, 7);
  scene.add(dir);
  const point = new THREE.PointLight(0x06b6d4, 0.7, 20);
  point.position.set(-4, 2, -2);
  scene.add(point);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.MeshStandardMaterial({ color: 0x0c0c16, metalness: 0.4, roughness: 0.6, transparent: true, opacity: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const grid = new THREE.GridHelper(16, 32, 0x7c3aed, 0x1a1a2e);
  grid.position.y = 0.01;
  scene.add(grid);

  const container = $('#viewport-container');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  resize();
  window.addEventListener('resize', resize);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0);
  controls.enableDamping = true;

  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.display = 'none';
  document.body.appendChild(vrBtn);
  $('#btn-enter-vr').addEventListener('click', () => vrBtn.click());

  const factory = new XRControllerModelFactory();
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  scene.add(controller1);
  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  scene.add(controller2);

  const grip1 = renderer.xr.getControllerGrip(0);
  grip1.add(factory.createControllerModel(grip1));
  scene.add(grip1);
  const grip2 = renderer.xr.getControllerGrip(1);
  grip2.add(factory.createControllerModel(grip2));
  scene.add(grip2);

  raycaster = new THREE.Raycaster();

  loadHologramFromURL(
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    new THREE.Vector3(0, 1.15, -1.8),
    'Sample Duck (Demo)'
  );

  createPlatform(new THREE.Vector3(-2.5, 0, -1.5));
  createPlatform(new THREE.Vector3(2.5, 0, -1.5));
  createPlatform(new THREE.Vector3(0, 0, -3.2));

  setTimeout(() => {
    const overlay = $('#loading-overlay');
    if (overlay) overlay.style.display = 'none';
  }, 1200);
}

function createPlatform(pos) {
  const geo = new THREE.CylinderGeometry(0.7, 0.75, 0.07, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed, emissive: 0x4c1d95, emissiveIntensity: 0.35,
    metalness: 0.6, roughness: 0.3, transparent: true, opacity: 0.75
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.position.y = 0.035;
  scene.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 0.95, 32),
    new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.25 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(pos);
  ring.position.y = 0.04;
  scene.add(ring);
}

function loadHologramFromURL(url, position, name) {
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => addHologramToScene(gltf.scene, position, name));
}

function loadHologramFromFile(file) {
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    if (currentModel) {
      scene.remove(currentModel);
      holograms = holograms.filter(h => h !== currentModel);
    }
    currentModel = addHologramToScene(gltf.scene, new THREE.Vector3(0, 1.2, -1.5), file.name);
    currentModelData = { name: file.name, size: file.size, type: file.type, url, file };
    updateModelInfo();
    $('#btn-prepare-mint').disabled = false;
    $('#btn-clear-model').classList.remove('hidden');
    toast('Model loaded – ready for IPFS + mint', 'success');
  }, undefined, () => toast('Could not parse GLB/GLTF', 'error'));
}

function addHologramToScene(model, position, name) {
  model.position.copy(position);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) model.scale.setScalar(1.2 / maxDim);

  model.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      if (c.material) {
        c.material.transparent = true;
        c.material.opacity = 0.93;
        c.material.emissive = c.material.emissive || new THREE.Color(0x111122);
        c.material.emissiveIntensity = 0.12;
      }
    }
  });

  model.userData = { name, isHologram: true, originalY: position.y, floatOffset: Math.random() * Math.PI * 2 };
  scene.add(model);
  holograms.push(model);
  updateStats();
  return model;
}

function onSelectStart(e) {
  const controller = e.target;
  const hits = getIntersections(controller);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.isHologram) obj = obj.parent;
    if (obj.userData.isHologram) {
      controller.attach(obj);
      controller.userData.selected = obj;
    }
  }
}

function onSelectEnd(e) {
  const controller = e.target;
  if (controller.userData.selected) {
    scene.attach(controller.userData.selected);
    controller.userData.selected = undefined;
  }
}

function getIntersections(controller) {
  const m = new THREE.Matrix4();
  m.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(m);
  return raycaster.intersectObjects(holograms, true);
}

function animate() {
  renderer.setAnimationLoop(() => {
    const t = performance.now() * 0.001;
    holograms.forEach(h => {
      if (h.userData.originalY !== undefined) {
        h.position.y = h.userData.originalY + Math.sin(t + (h.userData.floatOffset || 0)) * 0.07;
        h.rotation.y += 0.0025;
      }
    });
    controls?.update();
    renderer.render(scene, camera);
  });
}

// -------------------- UI --------------------
function initUI() {
  $$('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.mode;
      $('#guided-scan').classList.toggle('hidden', mode !== 'guided');
      $('#upload-mode').classList.toggle('hidden', mode !== 'upload');
      $('#camera-mode').classList.toggle('hidden', mode !== 'camera');
    });
  });

  $('#btn-start-scan-guide')?.addEventListener('click', () => {
    const steps = $$('.step');
    let i = 0;
    steps.forEach(s => s.classList.remove('active'));
    const interval = setInterval(() => {
      if (i > 0) steps[i-1].classList.remove('active');
      if (i < steps.length) {
        steps[i].classList.add('active');
        i++;
      } else {
        clearInterval(interval);
        toast('Scan with Polycam/Scaniverse → Export GLB → Upload here', 'info');
      }
    }, 1500);
  });

  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  dropZone?.addEventListener('click', () => fileInput.click());
  dropZone?.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });
  fileInput?.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  $('#btn-clear-model')?.addEventListener('click', clearCurrentModel);
  $('#btn-connect')?.addEventListener('click', connectWallet);
  $('#btn-prepare-mint')?.addEventListener('click', prepareAndUpload);
  $('#btn-mint')?.addEventListener('click', mintNFT);
  $('#modal-close')?.addEventListener('click', () => $('#modal-overlay').classList.add('hidden'));
}

function handleFile(file) {
  if (!file.name.toLowerCase().match(/\.(glb|gltf)$/)) {
    toast('Please upload a .glb or .gltf file', 'error');
    return;
  }
  const status = $('#upload-status');
  status.classList.remove('hidden');
  status.className = 'status-box info';
  status.textContent = `Loading ${file.name}...`;
  loadHologramFromFile(file);
}

function updateModelInfo() {
  const el = $('#current-model-info');
  if (!currentModelData) {
    el.innerHTML = '<p class="empty">No model loaded yet</p>';
    return;
  }
  el.innerHTML = `<strong>${currentModelData.name}</strong><br/>Size: ${(currentModelData.size/1024).toFixed(1)} KB<br/>Ready for IPFS + mint`;
}

function clearCurrentModel() {
  if (currentModel) {
    scene.remove(currentModel);
    holograms = holograms.filter(h => h !== currentModel);
    currentModel = null;
  }
  if (currentModelData?.url) URL.revokeObjectURL(currentModelData.url);
  currentModelData = null;
  updateModelInfo();
  $('#btn-prepare-mint').disabled = true;
  $('#btn-mint').disabled = true;
  $('#btn-clear-model').classList.add('hidden');
  updateStats();
}

function updateStats() {
  $('#objects-count').textContent = `${holograms.length} Hologram${holograms.length !== 1 ? 's' : ''}`;
}

// -------------------- WALLET --------------------
async function connectWallet() {
  if (!window.ethereum) {
    toast('Install MetaMask or another web3 wallet', 'error');
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    // Switch to Amoy if possible
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x13882' }]
      });
    } catch (_) {}

    if (CONFIG.contractAddress) {
      contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, signer);
    }

    $('#btn-connect').classList.add('hidden');
    $('#wallet-info').classList.remove('hidden');
    $('#wallet-address').textContent = `${userAddress.slice(0,6)}...${userAddress.slice(-4)}`;
    toast('Wallet connected', 'success');
    refreshCollection();
  } catch (err) {
    console.error(err);
    toast('Connection failed', 'error');
  }
}

function refreshCollection() {
  const list = $('#collection-list');
  list.innerHTML = `<div class="collection-item"><div class="thumb"></div><div><strong>Your NFTs</strong><br/><span class="small">Will appear here after minting</span></div></div>`;
}

// -------------------- IPFS + MINT --------------------
async function prepareAndUpload() {
  if (!currentModelData?.file) {
    toast('Load a model first', 'error');
    return;
  }

  const name = $('#nft-name').value.trim() || currentModelData.name;
  const desc = $('#nft-desc').value.trim() || 'Real-world scanned 3D object minted as hologram NFT';
  const status = $('#mint-status');
  status.classList.remove('hidden');
  status.className = 'status-box info';
  status.innerHTML = 'Uploading model to IPFS...';

  try {
    // 1. Upload the GLB
    const modelUpload = await uploadToIPFS(currentModelData.file, currentModelData.name);
    status.innerHTML = modelUpload.demo
      ? `Demo mode: fake model CID <code>${modelUpload.cid}</code><br/>Add Pinata keys in js/config.js for real upload.`
      : `Model uploaded: <code>${modelUpload.cid}</code>`;

    // 2. Build + upload metadata
    status.innerHTML += '<br/>Uploading metadata...';
    const metadata = buildMetadata({
      name,
      description: desc,
      modelCid: modelUpload.cid
    });
    const metaUpload = await uploadMetadata(metadata);

    // Store for mint step
    currentModelData.ipfs = {
      modelCid: modelUpload.cid,
      metadataCid: metaUpload.cid,
      tokenURI: metaUpload.demo ? `ipfs://${metaUpload.cid}` : `ipfs://${metaUpload.cid}`,
      demo: modelUpload.demo || metaUpload.demo
    };

    status.className = 'status-box success';
    status.innerHTML = `
      <strong>Ready to mint</strong><br/>
      Model CID: <code>${modelUpload.cid}</code><br/>
      Metadata CID: <code>${metaUpload.cid}</code><br/>
      tokenURI: ipfs://${metaUpload.cid}<br/>
      ${metaUpload.demo ? '<br/><em>Demo mode – add Pinata API keys + contract address for real mint</em>' : ''}
    `;

    $('#btn-mint').disabled = false;
    toast('IPFS upload complete – you can mint now', 'success');
  } catch (err) {
    console.error(err);
    status.className = 'status-box error';
    status.textContent = 'IPFS upload failed: ' + err.message;
    toast('IPFS upload failed', 'error');
  }
}

async function mintNFT() {
  if (!signer) {
    toast('Connect wallet first', 'error');
    return;
  }
  if (!currentModelData?.ipfs) {
    toast('Run Prepare / Upload first', 'error');
    return;
  }

  const status = $('#mint-status');
  status.classList.remove('hidden');
  status.className = 'status-box info';

  // Real mint if contract is configured
  if (CONFIG.contractAddress && contract && !currentModelData.ipfs.demo) {
    try {
      status.textContent = 'Sending mint transaction...';
      const tx = await contract.mintHologram(userAddress, currentModelData.ipfs.tokenURI);
      status.textContent = 'Waiting for confirmation...';
      const receipt = await tx.wait();
      status.className = 'status-box success';
      status.innerHTML = `
        <strong>Minted successfully!</strong><br/>
        Tx: <a href="${CONFIG.blockExplorer}/tx/${receipt.hash}" target="_blank" rel="noopener">${receipt.hash.slice(0,12)}...</a>
      `;
      toast('NFT minted on-chain!', 'success');
      refreshCollection();
      return;
    } catch (err) {
      console.error(err);
      status.className = 'status-box error';
      status.textContent = 'Mint failed: ' + (err.reason || err.message);
      toast('Mint failed', 'error');
      return;
    }
  }

  // Demo path
  status.className = 'status-box success';
  status.innerHTML = `
    <strong>Demo Mint Complete</strong><br/>
    tokenURI: ${currentModelData.ipfs.tokenURI}<br/><br/>
    To go live:<br/>
    1. Get free Pinata keys → put in <code>js/config.js</code><br/>
    2. Deploy <code>contracts/VRHologramNFT.sol</code> on Remix (Amoy)<br/>
    3. Paste contract address into <code>js/config.js</code><br/>
    4. Reload and mint for real
  `;
  toast('Demo mint done – follow steps for real on-chain mint', 'success');
}

function toast(msg, type = 'info') {
  const container = $('#toast-container');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (type === 'success') el.style.borderColor = 'var(--success)';
  if (type === 'error') el.style.borderColor = 'var(--danger)';
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

window.__scanner = { scene, holograms, currentModelData, CONFIG };
