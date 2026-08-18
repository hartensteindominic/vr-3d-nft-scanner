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
// 3D NFT Studio – Scan real objects → Mint 3D NFTs → AR/VR → Trade
// ============================================================

let camera, scene, renderer, controls;
let controller1, controller2;
let raycaster;
let models = [];
let currentModel = null;
let currentModelData = null;
let autoRotate = true;

let hitTestSource = null;
let hitTestSourceRequested = false;
let reticle = null;
let isARMode = false;
let ground = null;
let grid = null;

let provider = null;
let signer = null;
let userAddress = null;
let contract = null;

let demoListings = [];
let myLibrary = [];
let myListings = [];
let activityFeed = [];

const SAMPLE_MODELS = [
  {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    name: 'Damaged Helmet',
    pos: [0, 1.35, -2.0],
    scale: 1.1
  },
  {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Avocado/glTF-Binary/Avocado.glb',
    name: 'Avocado',
    pos: [-2.4, 1.15, -0.9],
    scale: 2.2
  },
  {
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/WaterBottle/glTF-Binary/WaterBottle.glb',
    name: 'Water Bottle',
    pos: [2.4, 1.2, -0.9],
    scale: 1.8
  }
];

const CONTRACT_ABI = [
  'function mintHologram(address to, string memory uri) public returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function totalSupply() view returns (uint256)',
  'event HologramMinted(address indexed to, uint256 indexed tokenId, string tokenURI)'
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
  scene.background = new THREE.Color(0x05050c);
  scene.fog = new THREE.FogExp2(0x05050c, 0.028);

  camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 4.2);

  scene.add(new THREE.AmbientLight(0x8899aa, 0.5));

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(5, 10, 7);
  key.castShadow = true;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0xa5b4fc, 0.45);
  fill.position.set(-6, 4, -3);
  scene.add(fill);

  const rim = new THREE.PointLight(0x818cf8, 0.9, 20);
  rim.position.set(0, 3, -4);
  scene.add(rim);

  const groundGeo = new THREE.CircleGeometry(14, 64);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a12,
    metalness: 0.55,
    roughness: 0.4,
    transparent: true,
    opacity: 0.9
  });
  ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  grid = new THREE.GridHelper(24, 48, 0x4338ca, 0x1e1b4b);
  grid.position.y = 0.01;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.15, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.2;
  controls.maxDistance = 14;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.6;

  const vrBtn = VRButton.createButton(renderer);
  vrBtn.style.display = 'none';
  document.body.appendChild(vrBtn);
  $('#btn-enter-vr').addEventListener('click', () => {
    isARMode = false;
    vrBtn.click();
  });

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
    new THREE.RingGeometry(0.1, 0.14, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.8 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  createPlatform(0, 0, -2.0, 0.95);
  createPlatform(-2.4, 0, -0.9, 0.55);
  createPlatform(2.4, 0, -0.9, 0.55);

  // Load multiple high-quality sample 3D models
  SAMPLE_MODELS.forEach((s, i) => {
    loadModelFromURL(s.url, new THREE.Vector3(...s.pos), s.name, s.scale);
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  setTimeout(() => {
    const overlay = $('#loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => (overlay.style.display = 'none'), 600);
    }
  }, 1800);
}

function onSessionStart() {
  const session = renderer.xr.getSession();
  const isAR = session.mode === 'immersive-ar' || isARMode;
  if (isAR) {
    scene.background = null;
    scene.fog = null;
    if (ground) ground.visible = false;
    if (grid) grid.visible = false;
    scene.traverse(o => { if (o.userData?.isPlatform) o.visible = false; });
    $('#xr-mode-label').textContent = 'AR';
    toast('AR active — point at a surface and tap to place', 'info');
  } else {
    $('#xr-mode-label').textContent = 'VR';
    toast('VR mode — grab models with controllers', 'info');
  }
}

function onSessionEnd() {
  scene.background = new THREE.Color(0x05050c);
  scene.fog = new THREE.FogExp2(0x05050c, 0.028);
  if (ground) ground.visible = true;
  if (grid) grid.visible = true;
  scene.traverse(o => { if (o.userData?.isPlatform) o.visible = true; });
  reticle.visible = false;
  hitTestSource = null;
  hitTestSourceRequested = false;
  isARMode = false;
  $('#xr-mode-label').textContent = 'Web';
}

function createPlatform(x, y, z, radius = 0.7) {
  const geo = new THREE.CylinderGeometry(radius, radius + 0.04, 0.05, 48);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    emissive: 0x312e81,
    emissiveIntensity: 0.4,
    metalness: 0.75,
    roughness: 0.3,
    transparent: true,
    opacity: 0.88
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 0.025, z);
  mesh.userData.isPlatform = true;
  scene.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius + 0.06, radius + 0.18, 48),
    new THREE.MeshBasicMaterial({
      color: 0x6366f1,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.2
    })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(x, 0.03, z);
  ring.userData.isPlatform = true;
  scene.add(ring);
}

function loadModelFromURL(url, position, name, scaleMul = 1) {
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => addModelToScene(gltf.scene, position, name, scaleMul),
    undefined,
    (err) => console.warn('Sample load failed', name, err)
  );
}

function loadModelFromFile(file) {
  const url = URL.createObjectURL(file);
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      if (currentModel) {
        scene.remove(currentModel);
        models = models.filter(m => m !== currentModel);
      }
      currentModel = addModelToScene(gltf.scene, new THREE.Vector3(0, 1.3, -2.0), file.name, 1.0);
      currentModelData = { name: file.name, size: file.size, url, file };
      updateModelInfo();
      $('#btn-prepare-mint').disabled = false;
      $('#btn-clear-model').classList.remove('hidden');
      $('#btn-list-current').disabled = false;
      $('#object-toolbar')?.classList.remove('hidden');
      focusModel(currentModel);
      toast('3D model loaded — ready to mint', 'success');
      setProgress(2);
    },
    undefined,
    () => toast('Failed to load model', 'error')
  );
}

function addModelToScene(model, position, name, scaleMul = 1) {
  model.position.copy(position);

  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar((1.4 * scaleMul) / maxDim);

  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.y += position.y - center.y + 0.15;

  // Preserve original materials — slight polish only
  model.traverse((c) => {
    if (c.isMesh) {
      c.castShadow = true;
      c.receiveShadow = true;
      if (c.material) {
        if (Array.isArray(c.material)) {
          c.material.forEach(m => {
            if (m) m.envMapIntensity = 1.1;
          });
        } else {
          c.material.envMapIntensity = 1.1;
        }
      }
    }
  });

  model.userData = {
    name,
    isModel: true,
    originalY: model.position.y,
    floatOffset: Math.random() * Math.PI * 2,
    spinning: autoRotate
  };

  scene.add(model);
  models.push(model);
  updateStats();
  return model;
}

function onSelectStart(e) {
  if (isARMode || renderer.xr.getSession()?.mode === 'immersive-ar') return;
  const controller = e.target;
  const hits = getIntersections(controller);
  if (hits.length) {
    let obj = hits[0].object;
    while (obj.parent && !obj.userData.isModel) obj = obj.parent;
    if (obj.userData.isModel) {
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
    const target = currentModel || models[0];
    if (target) {
      target.position.setFromMatrixPosition(reticle.matrix);
      target.visible = true;
      target.userData.originalY = target.position.y;
      toast('Model placed in your space', 'success');
    }
  }
}

function getIntersections(controller) {
  const m = new THREE.Matrix4();
  m.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(m);
  return raycaster.intersectObjects(models, true);
}

function animate() {
  renderer.setAnimationLoop((timestamp, frame) => {
    if (frame && renderer.xr.isPresenting) {
      const session = renderer.xr.getSession();
      if (session.mode === 'immersive-ar') {
        if (!hitTestSourceRequested) {
          session.requestReferenceSpace('viewer').then(refSpace => {
            session.requestHitTestSource({ space: refSpace }).then(source => {
              hitTestSource = source;
            });
          });
          hitTestSourceRequested = true;
        }
        if (hitTestSource) {
          const results = frame.getHitTestResults(hitTestSource);
          if (results.length > 0) {
            const pose = results[0].getPose(renderer.xr.getReferenceSpace());
            reticle.visible = true;
            reticle.matrix.fromArray(pose.transform.matrix);
          } else {
            reticle.visible = false;
          }
        }
      }
    }

    const t = performance.now() * 0.001;
    models.forEach(m => {
      if (m.userData.originalY !== undefined && !isARMode) {
        m.position.y = m.userData.originalY + Math.sin(t * 0.7 + m.userData.floatOffset) * 0.05;
        if (m.userData.spinning !== false && autoRotate) {
          m.rotation.y += 0.004;
        }
      } else if (m.userData.originalY !== undefined) {
        m.rotation.y += 0.002;
      }
    });

    if (controls && !renderer.xr.isPresenting) controls.update();
    renderer.render(scene, camera);
  });
}

// -------------------- UI --------------------
function initUI() {
  $$('.nav-btn, [data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) setView(view);
    });
  });

  $$('.close-panel').forEach(btn => {
    btn.addEventListener('click', () => {
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
      $('#guided-scan')?.classList.toggle('hidden', mode !== 'guided');
      $('#upload-mode')?.classList.toggle('hidden', mode !== 'upload');
    });
  });

  $('#btn-start-scan-guide')?.addEventListener('click', () => {
    $('#scan-guide-modal')?.classList.remove('hidden');
  });
  $('#close-scan-guide')?.addEventListener('click', () => {
    $('#scan-guide-modal')?.classList.add('hidden');
  });
  $('#scan-guide-modal')?.addEventListener('click', e => {
    if (e.target.id === 'scan-guide-modal') e.target.classList.add('hidden');
  });

  const dropZone = $('#drop-zone');
  const fileInput = $('#file-input');
  dropZone?.addEventListener('click', () => fileInput.click());
  dropZone?.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
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
  $('#btn-list-current')?.addEventListener('click', listCurrentForSale);
  $('#btn-reset-camera')?.addEventListener('click', resetCamera);
  $('#btn-focus-model')?.addEventListener('click', () => focusModel(currentModel || models[0]));
  $('#btn-toggle-rotate')?.addEventListener('click', () => {
    autoRotate = !autoRotate;
    models.forEach(m => (m.userData.spinning = autoRotate));
    toast(autoRotate ? 'Auto-rotate on' : 'Auto-rotate off', 'info');
  });
  $('#btn-place-ar-hint')?.addEventListener('click', () => {
    toast('Enter AR, point at a surface, then tap to place', 'info');
  });

  $$('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      $('#browse-tab')?.classList.toggle('hidden', tab !== 'browse');
      $('#mylistings-tab')?.classList.toggle('hidden', tab !== 'mylistings');
      $('#activity-tab')?.classList.toggle('hidden', tab !== 'activity');
      if (tab === 'activity') renderActivity();
    });
  });

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
  if (view === 'create') $('#create-panel')?.classList.remove('hidden');
  else if (view === 'library') {
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
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
}

function setProgress(step) {
  $$('.prog-step').forEach(el => {
    const s = parseInt(el.dataset.step, 10);
    el.classList.toggle('active', s <= step);
  });
}

function handleFile(file) {
  if (!file.name.toLowerCase().match(/\.(glb|gltf)$/)) {
    toast('Please upload a .glb or .gltf file', 'error');
    return;
  }
  loadModelFromFile(file);
}

function updateModelInfo() {
  const el = $('#current-model-info');
  if (!currentModelData) {
    el.innerHTML = '<p class="empty">No model loaded</p>';
    return;
  }
  const kb = (currentModelData.size / 1024).toFixed(1);
  el.innerHTML = `<strong>${currentModelData.name}</strong><br/><span style="color:var(--muted)">${kb} KB · Ready</span>`;
}

function clearCurrentModel() {
  if (currentModel) {
    scene.remove(currentModel);
    models = models.filter(m => m !== currentModel);
    currentModel = null;
  }
  if (currentModelData?.url) URL.revokeObjectURL(currentModelData.url);
  currentModelData = null;
  updateModelInfo();
  $('#btn-prepare-mint').disabled = true;
  $('#btn-mint').disabled = true;
  $('#btn-clear-model').classList.add('hidden');
  $('#btn-list-current').disabled = true;
  $('#object-toolbar')?.classList.add('hidden');
  setProgress(1);
  updateStats();
}

function updateStats() {
  const n = models.length;
  $('#objects-count').textContent = `${n} Model${n !== 1 ? 's' : ''}`;
  const hero = $('#hero-count');
  if (hero) hero.textContent = n;
}

function focusModel(m) {
  if (!m) return;
  controls.target.copy(m.position);
  camera.position.set(m.position.x + 1.2, m.position.y + 0.7, m.position.z + 2.4);
  controls.update();
}

function resetCamera() {
  camera.position.set(0, 1.6, 4.2);
  controls.target.set(0, 1.15, 0);
  controls.update();
  toast('Camera reset', 'info');
}

function generateAIDescription() {
  const name = $('#nft-name').value.trim() || currentModelData?.name || '3D Object';
  const category = $('#nft-category')?.value || 'object';
  const templates = [
    `A high-fidelity 3D digital twin of "${name}". Captured from the real world and prepared as a tradeable NFT. View in AR, inspect in VR, and own the permanent on-chain record of this ${category}.`,
    `"${name}" — a scanned ${category} turned into a premium 3D NFT. Exact geometry and surface detail preserved for AR placement and immersive VR viewing. Minted for collectors and creators who want real-world objects on-chain.`,
    `Digital twin NFT of ${name}. Photogrammetry-grade 3D model ready for augmented reality, virtual reality, and secondary markets. Unique real-world origin, permanent IPFS storage.`
  ];
  $('#nft-desc').value = templates[Math.floor(Math.random() * templates.length)];
  toast('Description generated', 'success');
}

async function connectWallet() {
  if (!window.ethereum) {
    toast('Install MetaMask or another Web3 wallet', 'error');
    return;
  }
  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    signer = await provider.getSigner();
    userAddress = await signer.getAddress();
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
    $('#wallet-address').textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
    toast('Wallet connected', 'success');
    addActivity('Wallet connected');
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
  const desc = $('#nft-desc').value.trim() || '3D scanned object NFT';
  const status = $('#mint-status');
  status.classList.remove('hidden');
  status.className = 'status-box info';
  status.textContent = 'Uploading model + metadata to IPFS...';
  setProgress(3);

  try {
    const modelUpload = await uploadToIPFS(currentModelData.file, currentModelData.name);
    const attributes = [
      { trait_type: 'Category', value: $('#nft-category')?.value || 'object' },
      { trait_type: 'Rarity', value: $('#nft-rarity')?.value || 'common' },
      { trait_type: 'Type', value: '3D Model' },
      { trait_type: 'Source', value: 'Real-world scan / upload' }
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
    status.innerHTML = `IPFS ready<br/><small>${metaUpload.cid.slice(0, 24)}...</small>`;
    $('#btn-mint').disabled = false;
    toast('Uploaded to IPFS — ready to mint', 'success');
    addActivity(`Uploaded ${name} to IPFS`);
  } catch (err) {
    status.className = 'status-box error';
    status.textContent = err.message;
    toast('IPFS upload failed', 'error');
  }
}

async function mintNFT() {
  if (!signer) {
    toast('Connect wallet first', 'error');
    return;
  }
  if (!currentModelData?.ipfs) {
    toast('Upload to IPFS first', 'error');
    return;
  }
  const status = $('#mint-status');
  status.className = 'status-box info';

  if (CONFIG.contractAddress && contract && !currentModelData.ipfs.demo) {
    try {
      status.textContent = 'Minting on-chain...';
      const tx = await contract.mintHologram(userAddress, currentModelData.ipfs.tokenURI);
      await tx.wait();
      status.className = 'status-box success';
      status.innerHTML = `Minted!<br/><small>${tx.hash.slice(0, 16)}...</small>`;
      toast('3D NFT minted!', 'success');
      addToLibrary(currentModelData);
      addActivity(`Minted ${currentModelData.displayName}`);
      maybeListAfterMint();
      return;
    } catch (err) {
      status.className = 'status-box error';
      status.textContent = err.reason || err.message;
      toast('Mint failed', 'error');
      return;
    }
  }

  status.className = 'status-box success';
  status.innerHTML = `Demo mint complete<br/><small>Add Pinata + contract for live mint</small>`;
  toast('Demo mint done — added to library', 'success');
  addToLibrary(currentModelData);
  addActivity(`Demo minted ${currentModelData.displayName || currentModelData.name}`);
  maybeListAfterMint();
}

function maybeListAfterMint() {
  const price = parseFloat($('#list-price')?.value);
  if (price > 0 && currentModelData) {
    listAtPrice(currentModelData.displayName || currentModelData.name, price.toFixed(2));
  }
}

function addToLibrary(data) {
  myLibrary.unshift({
    id: 'lib-' + Date.now(),
    name: data.displayName || data.name,
    description: data.description || '',
    tokenURI: data.ipfs?.tokenURI || 'ipfs://demo',
    demo: true
  });
  renderLibrary();
}

function renderLibrary() {
  const list = $('#library-list');
  if (!list) return;
  if (!myLibrary.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">◆</div><p>Mint your first 3D NFT to fill this library.</p></div>`;
    return;
  }
  list.innerHTML = myLibrary
    .map(
      item => `
    <div class="nft-card" data-id="${item.id}">
      <div class="card-thumb">◆</div>
      <div class="card-info">
        <strong>${item.name}</strong>
        <span>${item.demo ? 'Demo' : 'On-chain'} · ${item.tokenURI.slice(0, 16)}...</span>
      </div>
    </div>`
    )
    .join('');
}

function seedDemoMarketplace() {
  demoListings = [
    { id: 'm1', name: 'Ceramic Vessel #07', category: 'art', price: '0.18', seller: '0xArt...9f2a', description: 'Hand-scanned ceramic.' },
    { id: 'm2', name: 'Vintage Lens', category: 'object', price: '0.12', seller: '0xScan...44b1', description: 'Camera lens digital twin.' },
    { id: 'm3', name: 'Product Prototype A', category: 'product', price: '0.45', seller: '0xLab...c801', description: 'Industrial design scan.' },
    { id: 'm4', name: 'Collectible Figure', category: 'collectible', price: '0.09', seller: '0xToy...2d9e', description: 'Limited figure scan.' },
    { id: 'm5', name: 'Botanical Study', category: 'object', price: '0.04', seller: '0xGreen...a1f0', description: 'Organic form capture.' }
  ];
  activityFeed = [
    { text: 'Marketplace online', time: 'just now' },
    { text: 'Sample gallery loaded', time: '1 min ago' }
  ];
  renderMarketplace();
}

function renderMarketplace() {
  const list = $('#market-list');
  if (!list) return;
  let items = [...demoListings];
  const filter = $('#market-filter')?.value || 'all';
  const sort = $('#market-sort')?.value || 'recent';
  if (filter !== 'all') items = items.filter(i => i.category === filter);
  if (sort === 'price-low') items.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
  if (sort === 'price-high') items.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));

  list.innerHTML = items
    .map(
      item => `
    <div class="market-card" data-id="${item.id}">
      <div class="card-thumb">◆</div>
      <div class="card-info">
        <strong>${item.name}</strong>
        <span>${item.seller} · ${item.category}</span>
        <div class="card-actions">
          <button class="btn btn-secondary small buy-btn" data-id="${item.id}">Buy</button>
        </div>
      </div>
      <div class="card-price">${item.price} MATIC</div>
    </div>`
    )
    .join('');

  list.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const item = demoListings.find(i => i.id === btn.dataset.id);
      if (item) {
        toast(`Purchased "${item.name}" for ${item.price} MATIC (demo)`, 'success');
        myLibrary.unshift({
          id: 'bought-' + Date.now(),
          name: item.name,
          description: item.description,
          tokenURI: 'ipfs://demo-bought',
          demo: true
        });
        addActivity(`Bought ${item.name}`);
      }
    });
  });
}

function listCurrentForSale() {
  if (!currentModelData) {
    toast('Load a model first', 'error');
    return;
  }
  const name = currentModelData.displayName || currentModelData.name;
  const inputPrice = parseFloat($('#list-price')?.value);
  const price = inputPrice > 0 ? inputPrice.toFixed(2) : (Math.random() * 0.15 + 0.03).toFixed(2);
  listAtPrice(name, price);
}

function listAtPrice(name, price) {
  myListings.unshift({ name, price, id: 'my-' + Date.now() });
  demoListings.unshift({
    id: 'user-' + Date.now(),
    name,
    category: $('#nft-category')?.value || 'object',
    price,
    seller: userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : 'You',
    description: currentModelData?.description || ''
  });
  const el = $('#my-listings');
  if (el) {
    el.innerHTML = myListings
      .map(
        l => `
      <div class="market-card">
        <div class="card-thumb">◆</div>
        <div class="card-info"><strong>${l.name}</strong><span>Your listing</span></div>
        <div class="card-price">${l.price} MATIC</div>
      </div>`
      )
      .join('');
  }
  toast(`Listed "${name}" at ${price} MATIC`, 'success');
  addActivity(`Listed ${name} at ${price} MATIC`);
  renderMarketplace();
}

function addActivity(text) {
  activityFeed.unshift({ text, time: 'just now' });
  if (activityFeed.length > 12) activityFeed.pop();
}

function renderActivity() {
  const list = $('#activity-list');
  if (!list) return;
  list.innerHTML = activityFeed
    .map(
      a => `
    <div class="activity-item">
      <span class="dot"></span>
      <p>${a.text}</p>
      <time>${a.time}</time>
    </div>`
    )
    .join('');
}

function initParticles() {
  const container = $('#particles');
  if (!container) return;
  for (let i = 0; i < 24; i++) {
    const span = document.createElement('span');
    span.style.left = Math.random() * 100 + '%';
    span.style.animationDelay = Math.random() * 14 + 's';
    span.style.animationDuration = 11 + Math.random() * 9 + 's';
    span.style.width = span.style.height = 2 + Math.random() * 2.5 + 'px';
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
  setTimeout(() => el.remove(), 4000);
}
