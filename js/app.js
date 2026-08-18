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
// VR 3D NFT Scanner – Duck-style floating holograms + real AR/VR
// Scan real objects → GLB → IPFS → Mint → Place in AR → Trade
// ============================================================

let camera, scene, renderer, controls;
let controller1, controller2;
let raycaster;
let holograms = [];
let currentModel = null;
let currentModelData = null;
let duckModel = null;

// AR
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

// Demo marketplace + library
let demoListings = [];
let myLibrary = [];
let myListings = [];

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
initParticles();
seedDemoMarketplace();
animate();

function initThree() {
  const container = $('#viewport-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05050a);
  scene.fog = new THREE.FogExp2(0x05050a, 0.035);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.55, 3.8);

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

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.5;
  controls.maxDistance = 12;

  // VR
  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.display = 'none';
  document.body.appendChild(vrBtn);
  $('#btn-enter-vr').addEventListener('click', () => {
    isARMode = false;
    vrBtn.click();
  });

  // AR with hit-test
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

  renderer.xr.addEventListener('sessionstart', onSessionStart);
  renderer.xr.addEventListener('sessionend', onSessionEnd);

  const factory = new XRControllerModelFactory();
  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  controller1.addEventListener('select', onSelect);
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

  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.12, 0.16, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.75 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  createPlatform(0, 0, -1.9, 0.9);
  createPlatform(-2.6, 0, -0.8, 0.55);
  createPlatform(2.6, 0, -0.8, 0.55);

  // Hero Duck – the visual language of the whole app
  loadHologramFromURL(
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    new THREE.Vector3(0, 1.25, -1.9),
    'Sample Duck Hologram',
    1.0,
    true
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
    scene.background = null;
    scene.fog = null;
    if (ground) ground.visible = false;
    if (grid) grid.visible = false;
    scene.traverse(obj => {
      if (obj.userData?.isPlatform) obj.visible = false;
    });
    $('#xr-mode-label').textContent = 'AR';
    toast('AR active – point at a surface and tap to place hologram', 'info');
  } else {
    $('#xr-mode-label').textContent = 'VR';
    toast('VR mode – grab holograms with controllers', 'info');
  }
}

function onSessionEnd() {
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

function loadHologramFromURL(url, position, name, scaleMul = 0.9, isDuck = false) {
  const loader = new GLTFLoader();
  loader.load(url, (gltf) => {
    const h = addHologramToScene(gltf.scene, position, name, scaleMul);
    if (isDuck) duckModel = h;
  }, undefined, (err) => {
    console.warn('Failed to load sample', err);
    toast('Sample model could not load – check network', 'error');
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
    $('#btn-list-current').disabled = false;
    toast('Model loaded – ready for AR / VR / Mint (Duck-style hologram)', 'success');
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

  // Duck-style holographic treatment
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

function onSelectStart(e) {
  if (isARMode || renderer.xr.getSession()?.mode === 'immersive-ar') return;
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

function onSelect() {
  if (reticle.visible) {
    const target = currentModel || (holograms.length > 0 ? holograms[0] : null);
    if (target) {
      target.position.setFromMatrixPosition(reticle.matrix);
      target.visible = true;
      target.userData.originalY = target.position.y;
      toast('Hologram placed in your space', 'success');
    }
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

    // Gentle duck-style float + slow spin
    const t = performance.now() * 0.001;
    holograms.forEach(h => {
      if (h.userData.originalY !== undefined && !isARMode) {
        h.position.y = h.userData.originalY + Math.sin(t * 0.9 + h.userData.floatOffset) * 0.09;
        h.rotation.y += 0.003;
      } else if (h.userData.originalY !== undefined) {
        h.rotation.y += 0.002;
      }
    });

    if (controls && !renderer.xr.isPresenting) controls.update();
    renderer.render(scene, camera);
  });
}

// -------------------- UI --------------------
function initUI() {
  // Nav views
  $$('.nav-btn, [data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (!view) return;
      setView(view);
    });
  });

  $$('.close-panel').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      hideAllPanels();
      setNavActive('gallery');
      $('#hero-overlay')?.classList.remove('hidden');
    });
  });

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
    $('#scan-guide-modal')?.classList.remove('hidden');
  });
  $('#close-scan-guide')?.addEventListener('click', () => {
    $('#scan-guide-modal')?.classList.add('hidden');
  });
  $('#scan-guide-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'scan-guide-modal') e.target.classList.add('hidden');
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
  $('#btn-ai-desc')?.addEventListener('click', generateAIDescription);
  $('#btn-view-duck')?.addEventListener('click', focusDuck);
  $('#btn-list-current')?.addEventListener('click', listCurrentForSale);
  $('#btn-refresh-library')?.addEventListener('click', renderLibrary);

  // Market tabs
  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $('#browse-tab')?.classList.toggle('hidden', tab !== 'browse');
      $('#mylistings-tab')?.classList.toggle('hidden', tab !== 'mylistings');
      $('#activity-tab')?.classList.toggle('hidden', tab !== 'activity');
    });
  });

  // Filters (demo)
  $('#market-filter')?.addEventListener('change', renderMarketplace);
  $('#market-sort')?.addEventListener('change', renderMarketplace);
}

function setView(view) {
  hideAllPanels();
  setNavActive(view);

  if (view === 'gallery') {
    $('#hero-overlay')?.classList.remove('hidden');
  } else {
    $('#hero-overlay')?.classList.add('hidden');
  }

  if (view === 'create') {
    $('#create-panel')?.classList.remove('hidden');
  } else if (view === 'library') {
    $('#library-panel')?.classList.remove('hidden');
    renderLibrary();
  } else if (view === 'marketplace') {
    $('#marketplace-panel')?.classList.remove('hidden');
    renderMarketplace();
  } else if (view === 'about') {
    $('#about-panel')?.classList.remove('hidden');
  }
}

function hideAllPanels() {
  $$('.side-panel').forEach(p => p.classList.add('hidden'));
}

function setNavActive(view) {
  $$('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
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
    el.innerHTML = '<p class="empty">No model loaded yet — scan or upload to begin</p>';
    return;
  }
  el.innerHTML = `<strong>${currentModelData.name}</strong><br/><span style="color:var(--muted)">${(currentModelData.size/1024).toFixed(1)} KB • Ready for mint</span>`;
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
  $('#btn-list-current').disabled = true;
  updateStats();
}

function updateStats() {
  $('#objects-count').textContent = `${holograms.length} Hologram${holograms.length !== 1 ? 's' : ''}`;
}

function focusDuck() {
  if (duckModel) {
    controls.target.copy(duckModel.position);
    camera.position.set(duckModel.position.x + 0.8, duckModel.position.y + 0.6, duckModel.position.z + 2.2);
    controls.update();
    toast('Focused on Duck sample hologram', 'info');
  }
}

function generateAIDescription() {
  const name = $('#nft-name').value.trim() || currentModelData?.name || 'Scanned Object';
  const category = $('#nft-category')?.value || 'object';
  const templates = [
    `A meticulously captured digital twin of "${name}". This hologram preserves the exact geometry, surface detail and presence of the original real-world ${category}. Ideal for AR placement, VR inspection and permanent on-chain ownership.`,
    `Born from a real-world scan, this ${name} hologram floats as a luminous digital twin. Every curve and texture has been transferred into a tradeable 3D NFT that you can place on any surface via WebXR AR or explore immersively in VR.`,
    `"${name}" – a unique scanned artifact turned into a floating hologram NFT. Own the digital twin, display it in augmented reality, trade it freely. Captured with photogrammetry and styled in the signature soft-emissive duck aesthetic of this platform.`
  ];
  const desc = templates[Math.floor(Math.random() * templates.length)];
  $('#nft-desc').value = desc;
  toast('AI description generated', 'success');
}

// -------------------- Wallet + IPFS + Mint --------------------
async function connectWallet() {
  if (!window.ethereum) {
    toast('Please install MetaMask or another Web3 wallet', 'error');
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
    renderLibrary();
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
  status.textContent = 'Uploading model + metadata to IPFS...';

  try {
    const modelUpload = await uploadToIPFS(currentModelData.file, currentModelData.name);
    const attributes = [
      { trait_type: 'Category', value: $('#nft-category')?.value || 'object' },
      { trait_type: 'Rarity', value: $('#nft-rarity')?.value || 'common' },
      { trait_type: 'Source', value: 'Real-world scan' }
    ];
    const metadata = buildMetadata({
      name,
      description: desc,
      modelCid: modelUpload.cid,
      attributes
    });
    const metaUpload = await uploadMetadata(metadata);

    currentModelData.ipfs = {
      modelCid: modelUpload.cid,
      metadataCid: metaUpload.cid,
      tokenURI: `ipfs://${metaUpload.cid}`,
      demo: modelUpload.demo || metaUpload.demo
    };
    currentModelData.displayName = name;
    currentModelData.description = desc;

    status.className = 'status-box success';
    status.innerHTML = `IPFS ready<br/><small>${metaUpload.cid.slice(0, 22)}...</small>`;
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
      addToLibrary(currentModelData);
      return;
    } catch (err) {
      status.className = 'status-box error';
      status.textContent = err.reason || err.message;
      toast('Mint failed', 'error');
      return;
    }
  }

  // Demo mint
  status.className = 'status-box success';
  status.innerHTML = `Demo mint complete<br/><small>Add Pinata keys + contract for real mint</small>`;
  toast('Demo mint done – added to your library', 'success');
  addToLibrary(currentModelData);
}

function addToLibrary(data) {
  const entry = {
    id: 'lib-' + Date.now(),
    name: data.displayName || data.name,
    description: data.description || '',
    tokenURI: data.ipfs?.tokenURI || 'ipfs://demo',
    demo: true
  };
  myLibrary.unshift(entry);
  renderLibrary();
}

function renderLibrary() {
  const list = $('#library-list');
  if (!list) return;
  if (myLibrary.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Connect wallet & mint to build your library of digital twins.</p></div>`;
    return;
  }
  list.innerHTML = myLibrary.map(item => `
    <div class="nft-card" data-id="${item.id}">
      <div class="card-thumb">◈</div>
      <div class="card-info">
        <strong>${item.name}</strong>
        <span>${item.demo ? 'Demo NFT' : 'On-chain'} • ${item.tokenURI.slice(0, 18)}...</span>
      </div>
    </div>
  `).join('');
}

function seedDemoMarketplace() {
  demoListings = [
    {
      id: 'duck-1',
      name: 'Classic Duck Hologram',
      category: 'collectible',
      price: '0.08',
      seller: '0xDuck...Sample',
      description: 'The original floating duck – visual language of this entire experience.'
    },
    {
      id: 'cam-1',
      name: 'Vintage Camera Twin',
      category: 'object',
      price: '0.15',
      seller: '0xScan...Creator',
      description: 'Photogrammetry scan of a classic film camera.'
    },
    {
      id: 'sculpt-1',
      name: 'Ceramic Vase #03',
      category: 'art',
      price: '0.22',
      seller: '0xArt...Studio',
      description: 'Hand-thrown ceramic captured in high detail.'
    },
    {
      id: 'toy-1',
      name: 'Retro Robot Toy',
      category: 'collectible',
      price: '0.05',
      seller: '0xPlay...Ground',
      description: 'Childhood robot scanned and turned into a hologram NFT.'
    },
    {
      id: 'plant-1',
      name: 'Monstera Leaf Study',
      category: 'object',
      price: '0.03',
      seller: '0xNature...Lab',
      description: 'Organic form captured for AR botanical displays.'
    }
  ];
  renderMarketplace();
}

function renderMarketplace() {
  const list = $('#market-list');
  if (!list) return;

  let items = [...demoListings];
  const filter = $('#market-filter')?.value || 'all';
  const sort = $('#market-sort')?.value || 'recent';

  if (filter !== 'all') {
    items = items.filter(i => i.category === filter);
  }
  if (sort === 'price-low') items.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  if (sort === 'price-high') items.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

  list.innerHTML = items.map(item => `
    <div class="market-card" data-id="${item.id}">
      <div class="card-thumb">${item.id.startsWith('duck') ? '🦆' : '◈'}</div>
      <div class="card-info">
        <strong>${item.name}</strong>
        <span>${item.seller} • ${item.category}</span>
        <div class="card-actions">
          <button class="btn btn-secondary small buy-btn" data-id="${item.id}">Buy</button>
        </div>
      </div>
      <div class="card-price">${item.price} MATIC</div>
    </div>
  `).join('');

  list.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = demoListings.find(i => i.id === id);
      if (item) {
        toast(`Demo purchase of "${item.name}" for ${item.price} MATIC`, 'success');
        myLibrary.unshift({
          id: 'bought-' + Date.now(),
          name: item.name,
          description: item.description,
          tokenURI: 'ipfs://demo-bought',
          demo: true
        });
      }
    });
  });
}

function listCurrentForSale() {
  if (!currentModelData) {
    toast('Load and prepare a model first', 'error');
    return;
  }
  const name = currentModelData.displayName || currentModelData.name;
  const price = (Math.random() * 0.2 + 0.02).toFixed(2);
  myListings.unshift({ name, price, id: 'my-' + Date.now() });
  demoListings.unshift({
    id: 'user-' + Date.now(),
    name,
    category: $('#nft-category')?.value || 'object',
    price,
    seller: userAddress ? `${userAddress.slice(0,6)}...${userAddress.slice(-4)}` : 'You',
    description: currentModelData.description || ''
  });
  const myListEl = $('#my-listings');
  if (myListEl) {
    myListEl.innerHTML = myListings.map(l => `
      <div class="market-card">
        <div class="card-thumb">◈</div>
        <div class="card-info"><strong>${l.name}</strong><span>Your listing</span></div>
        <div class="card-price">${l.price} MATIC</div>
      </div>
    `).join('');
  }
  toast(`Listed "${name}" for ${price} MATIC (demo)`, 'success');
  renderMarketplace();
}

function initParticles() {
  const container = $('#particles');
  if (!container) return;
  for (let i = 0; i < 28; i++) {
    const span = document.createElement('span');
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDelay = (Math.random() * 14) + 's';
    span.style.animationDuration = (10 + Math.random() * 10) + 's';
    span.style.width = span.style.height = (2 + Math.random() * 3) + 'px';
    container.appendChild(span);
  }
}

function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  if (type === 'success') el.style.borderColor = 'var(--success)';
  if (type === 'error') el.style.borderColor = 'var(--danger)';
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}
