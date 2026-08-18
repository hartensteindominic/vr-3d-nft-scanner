import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ethers } from 'ethers';
import { CONFIG } from './config.js';
import { uploadToIPFS, uploadMetadata, buildMetadata } from './ipfs.js';

// ============================================================
// VR 3D NFT Scanner – Real AR + VR Hologram Experience
// Place scanned objects in the real world via WebXR AR
// ============================================================

let camera, scene, renderer, controls;
let controller1, controller2;
let raycaster;
let holograms = [];
let currentModel = null;
let currentModelData = null;

// AR specific
let hitTestSource = null;
let hitTestSourceRequested = false;
let reticle = null;
let isARMode = false;
let ground = null;
let grid = null;

// Wallet
let provider = null;
let signer = null;
let userAddress = null;
let contract = null;

const CONTRACT_ABI = [
  "function mintHologram(address to, string memory uri) public returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event HologramMinted(address indexed to, uint256 indexed tokenId, string tokenURI)"
];

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

initThree();
initUI();
animate();

function initThree() {
  const container = $('#viewport-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.FogExp2(0x05050a, 0.035);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.55, 3.8);

  // Lighting
  scene.add(new THREE.AmbientLight(0x606080, 0.45));

  const key = new THREE.DirectionalLight(0xc4b5fd, 1.4);
  key.position.set(4, 8, 6);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x22d3ee, 0.55);
  fill.position.set(-5, 3, -2);
  scene.add(fill);

  const rim = new THREE.PointLight(0x7c3aed, 1.1, 18);
  rim.position.set(0, 2.5, -3);
  scene.add(rim);

  // Ground (hidden in AR)
  const groundGeo = new THREE.CircleGeometry(12, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a14,
    metalness: 0.6,
    roughness: 0.35,
    transparent: true,
    opacity: 0.92
  });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  grid = new THREE.GridHelper(20, 40, 0x4c1d95, 0x1a1030);
  grid.position.y = 0.01;
  grid.material.opacity = 0.4;
  grid.material.transparent = true;
  scene.add(grid);

  // Renderer – important: alpha true for AR
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Environment
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  // Controls (desktop only)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.5;
  controls.maxDistance = 12;

  // ===== VR Button =====
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.display = 'none';
  document.body.appendChild(vrBtn);
  $('#btn-enter-vr').addEventListener('click', () => {
    isARMode = false;
    vrBtn.click();
  });

  // ===== AR Button =====
  const arBtn = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  });
  arBtn.style.display = 'none';
  document.body.appendChild(arBtn);

  $('#btn-enter-ar').addEventListener('click', () => {
    isARMode = true;
    arBtn.click();
  });

  // Session start / end
  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  // Controllers
  const factory = new XRControllerModelFactory();
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  controller1.addEventListener('select', onSelect); // used for AR placement
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  scene.add(controller2);

  [0, 1].forEach(i => {
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    scene.add(grip);
  });

  raycaster = new THREE.Raycaster();

  // Reticle for AR placement
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.16, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.7 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Platforms (visible only in non-AR)
  createPlatform(0, 0, -1.9, 0.9);
  createPlatform(-2.6, 0, -0.8, 0.55);
  createPlatform(2.6, 0, -0.8, 0.55);

  // Hero Duck
  loadHologramFromURL(
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    new THREE.Vector3(0, 1.25, -1.9),
    'Sample Duck Hologram',
    1.0
  );

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setTimeout(() => {
    const overlay = $('#loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 600);
    }
  }, 1400);
}

function onSessionStart() {
  const session = renderer.xr.getSession();
  const isAR = session.mode === 'immersive-ar' || isARMode;

  if (isAR) {
    // Real AR mode
    scene.background = null;
    scene.fog = null;
    if (ground) ground.visible = false;
    if (grid) grid.visible = false;

    // Hide virtual platforms
    scene.traverse(obj => {
      if (obj.userData?.isPlatform) obj.visible = false;
    });

    $('#xr-mode-label').textContent = 'AR';
    toast('AR active – point at a surface and tap to place hologram', 'info');
  } else {
    $('#xr-mode-label').textContent = 'VR';
  }
}

function onSessionEnd() {
  // Restore normal view
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.FogExp2(0x05050a, 0.035);
  if (ground) ground.visible = true;
  if (grid) grid.visible = true;

  scene.traverse(obj => {
    if (obj.userData?.isPlatform) obj.visible = true;
  });

  reticle.visible = false;
  hitTestSource = null;
  hitTestSourceRequested = false;
  isARMode = false;
  $('#xr-mode-label').textContent = 'Web';
}

function createPlatform(x, y, z, radius = 0.7) {
  const geo = new THREE.CylinderGeometry(radius, radius + 0.05, 0.06, 48);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x2e1065,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.5,
    metalness: 0.7,
    roughness: 0.25,
    transparent: true,
    opacity: 0.85
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 0.03, z);
  mesh.userData.isPlatform = true;
  scene.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius + 0.08, radius + 0.22, 48),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.04, z);
  ring.userData.isPlatform = true;
  scene.add(ring);
}

function loadHologramFromURL(url, position, name, scaleMul = 0.9) {
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    addHologramToScene(gltf.scene, position, name, scaleMul);
  });
}

function loadHologramFromFile(file) {
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    if (currentModel) {
      scene.remove(currentModel);
      holograms = holograms.filter(h => h !== currentModel);
    }
    currentModel = addHologramToScene(gltf.scene, new THREE.Vector3(0, 1.25, -1.9), file.name, 0.95);
    currentModelData = { name: file.name, size: file.size, url, file };
    updateModelInfo();
    $('#btn-prepare-mint').disabled = false;
    $('#btn-clear-model').classList.remove('hidden');
    toast('Model loaded – ready for AR / VR / Mint', 'success');
  }, undefined, () => toast('Failed to load model', 'error'));
}

function addHologramToScene(model, position, name, scaleMul = 0.9) {
  model.position.copy(position);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar((1.35 * scaleMul) / maxDim);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.y += (position.y - center.y) * 0.3;

  model.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      if (c.material) {
        c.material.transparent = true;
        c.material.opacity = 0.94;
        c.material.emissive = c.material.emissive || new THREE.Color(0x1a1030);
        c.material.emissiveIntensity = 0.18;
      }
    }
  });

  model.userData = {
    name,
    isHologram: true,
    originalY: model.position.y,
    floatOffset: Math.random() * Math.PI * 2
  };

  scene.add(model);
  holograms.push(model);
  updateStats();
  return model;
}

// Controller interactions
function onSelectStart(e) {
  if (isARMode || renderer.xr.getSession()?.mode === 'immersive-ar') return; // handled by onSelect for placement

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

// AR placement on tap
function onSelect() {
  if (reticle.visible && currentModel) {
    // Place current model (or a clone) at reticle
    currentModel.position.setFromMatrixPosition(reticle.matrix);
    currentModel.visible = true;
    currentModel.userData.originalY = currentModel.position.y;
    toast('Hologram placed in your space', 'success');
  } else if (reticle.visible && holograms.length > 0) {
    // Place the first hologram if no current
    const h = holograms[0];
    h.position.setFromMatrixPosition(reticle.matrix);
    h.userData.originalY = h.position.y;
    toast('Hologram placed', 'success');
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
  renderer.setAnimationLoop((timestamp, frame) => {
    // AR hit-test
    if (frame && renderer.xr.isPresenting) {
      const session = renderer.xr.getSession();
      const isAR = session.mode === 'immersive-ar';

      if (isAR) {
        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then((refSpace) => {
            session.requestHitTestSource({ space: refSpace }).then((source) => {
              hitTestSource = source;
            });
          });
          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);
          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const pose = hit.getPose(renderer.xr.getReferenceSpace());
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else {
            reticle.visible = false;
          }
        }
      }
    }

    // Gentle float (only when not in AR or when placed)
    const t = performance.now() * 0.001;
    holograms.forEach(h => {
      if (h.userData.originalY !== undefined && !isARMode) {
        h.position.y = h.userData.originalY + Math.sin(t * 0.9 + h.userData.floatOffset) * 0.09;
        h.rotation.y += 0.003;
      } else if (h.userData.originalY !== undefined) {
        // Subtle rotation only in AR
        h.rotation.y += 0.002;
      }
    });

    if (controls && !renderer.xr.isPresenting) controls.update();
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
    });
  });

  $('#btn-start-scan-guide')?.addEventListener('click', () => {
    toast('Open Polycam or Scaniverse → scan → export GLB → Upload here', 'info');
  });

  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  dropZone?.addEventListener('click', () => fileInput.click());
  dropZone?.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone?.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone?.addEventListener('drop', e => {
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

  $$('.panel-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.closest('.floating-panel');
      panel.classList.toggle('collapsed');
      btn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
    });
  });
}

function handleFile(file) {
  if (!file.name.toLowerCase().match(/\.(glb|gltf)$/)) {
    toast('Please upload a .glb or .gltf file', 'error');
    return;
  }
  loadHologramFromFile(file);
}

function updateModelInfo() {
  const el = $('#current-model-info');
  if (!currentModelData) {
    el.innerHTML = '<p class="empty">No model loaded</p>';
    return;
  }
  el.innerHTML = `<strong>${currentModelData.name}</strong><br/><span style="color:var(--muted)">${(currentModelData.size/1024).toFixed(1)} KB • Ready</span>`;
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

// -------------------- WALLET + IPFS + MINT --------------------
async function connectWallet() {
  if (!window.ethereum) {
    toast('Please install MetaMask', 'error');
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();

    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x13882' }] });
    } catch (_) {}

    if (CONFIG.contractAddress) {
      contract = new ethers.Contract(CONFIG.contractAddress, CONTRACT_ABI, signer);
    }

    $('#btn-connect').classList.add('hidden');
    $('#wallet-info').classList.remove('hidden');
    $('#wallet-address').textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    toast('Wallet connected', 'success');
  } catch (err) {
    toast('Connection failed', 'error');
  }
}

async function prepareAndUpload() {
  if (!currentModelData?.file) {
    toast('Load a model first', 'error');
    return;
  }

  const name = $('#nft-name').value.trim() || currentModelData.name;
  const desc = $('#nft-desc').value.trim() || 'Real-world scanned hologram NFT';
  const status = $('#mint-status');
  status.classList.remove('hidden');
  status.className = 'status-box info';
  status.textContent = 'Uploading to IPFS...';

  try {
    const modelUpload = await uploadToIPFS(currentModelData.file, currentModelData.name);
    const metadata = buildMetadata({ name, description: desc, modelCid: modelUpload.cid });
    const metaUpload = await uploadMetadata(metadata);

    currentModelData.ipfs = {
      modelCid: modelUpload.cid,
      metadataCid: metaUpload.cid,
      tokenURI: `ipfs://${metaUpload.cid}`,
      demo: modelUpload.demo || metaUpload.demo
    };

    status.className = 'status-box success';
    status.innerHTML = `IPFS ready<br/><small>${metaUpload.cid.slice(0, 18)}...</small>`;
    $('#btn-mint').disabled = false;
    toast('Uploaded to IPFS – ready to mint', 'success');
  } catch (err) {
    status.className = 'status-box error';
    status.textContent = err.message;
    toast('IPFS upload failed', 'error');
  }
}

async function mintNFT() {
  if (!signer) { toast('Connect wallet first', 'error'); return; }
  if (!currentModelData?.ipfs) { toast('Upload to IPFS first', 'error'); return; }

  const status = $('#mint-status');
  status.className = 'status-box info';

  if (CONFIG.contractAddress && contract && !currentModelData.ipfs.demo) {
    try {
      status.textContent = 'Minting on-chain...';
      const tx = await contract.mintHologram(userAddress, currentModelData.ipfs.tokenURI);
      await tx.wait();
      status.className = 'status-box success';
      status.innerHTML = `Minted!<br/><small>${tx.hash.slice(0, 14)}...</small>`;
      toast('NFT minted successfully!', 'success');
      return;
    } catch (err) {
      status.className = 'status-box error';
      status.textContent = err.reason || err.message;
      toast('Mint failed', 'error');
      return;
    }
  }

  status.className = 'status-box success';
  status.innerHTML = `Demo mint complete<br/><small>Add Pinata keys + contract for real mint</small>`;
  toast('Demo mint done', 'success');
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (type === 'success') el.style.borderColor = 'var(--success)';
  if (type === 'error') el.style.borderColor = 'var(--danger)';
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
