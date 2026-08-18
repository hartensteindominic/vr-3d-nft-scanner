import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ======================================================
// VR 3D NFT Scanner – Hologram Gallery Prototype
// ======================================================
// This is the foundation for viewing scanned 3D objects
// as interactive holograms. Later we will load real NFTs
// from IPFS using tokenURI metadata.
// ======================================================

let camera, scene, renderer, controls;
let controller1, controller2;
let raycaster;
let holograms = [];
let selectedObject = null;

const loadingEl = document.getElementById('loading');
const enterVrBtn = document.getElementById('enter-vr');

init();
animate();

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a12);
  scene.fog = new THREE.Fog(0x0a0a12, 8, 25);

  // Camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.6, 3);

  // Lights – holographic feel
  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xa78bfa, 1.2);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0x06b6d4, 0.8, 20);
  pointLight.position.set(-3, 2, -2);
  scene.add(pointLight);

  // Floor / platform
  const floorGeo = new THREE.CircleGeometry(6, 64);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    metalness: 0.3,
    roughness: 0.7,
    transparent: true,
    opacity: 0.85
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Subtle grid
  const grid = new THREE.GridHelper(12, 24, 0x7c3aed, 0x2a2a40);
  grid.position.y = 0.01;
  scene.add(grid);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Orbit controls (desktop)
  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.2, 0);
  controls.update();

  // VR Button (official Three.js)
  const vrButton = VRButton.createButton(renderer);
  vrButton.style.display = 'none'; // we use our own button
  document.body.appendChild(vrButton);

  enterVrBtn.addEventListener('click', () => {
    if (renderer.xr.isPresenting) {
      renderer.xr.getSession()?.end();
    } else {
      vrButton.click(); // trigger the official button
    }
  });

  // Controllers
  const controllerModelFactory = new XRControllerModelFactory();

  controller1 = renderer.xr.getController(0);
  controller1.addEventListener('selectstart', onSelectStart);
  controller1.addEventListener('selectend', onSelectEnd);
  scene.add(controller1);

  controller2 = renderer.xr.getController(1);
  controller2.addEventListener('selectstart', onSelectStart);
  controller2.addEventListener('selectend', onSelectEnd);
  scene.add(controller2);

  const controllerGrip1 = renderer.xr.getControllerGrip(0);
  controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
  scene.add(controllerGrip1);

  const controllerGrip2 = renderer.xr.getControllerGrip(1);
  controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
  scene.add(controllerGrip2);

  // Raycaster for interaction
  raycaster = new THREE.Raycaster();

  // Load sample hologram (Khronos Duck – replace later with real NFT GLBs from IPFS)
  loadHologram(
    'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb',
    new THREE.Vector3(0, 1.1, -1.5),
    'Sample Duck Hologram'
  );

  // Add a couple of placeholder hologram platforms
  createHologramPlatform(new THREE.Vector3(-2.2, 0, -1.2));
  createHologramPlatform(new THREE.Vector3(2.2, 0, -1.2));
  createHologramPlatform(new THREE.Vector3(0, 0, -2.8));

  window.addEventListener('resize', onWindowResize);

  // Hide loading once ready
  setTimeout(() => {
    if (loadingEl) loadingEl.style.display = 'none';
  }, 1500);
}

function createHologramPlatform(position) {
  const geo = new THREE.CylinderGeometry(0.6, 0.65, 0.08, 32);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    emissive: 0x4c1d95,
    emissiveIntensity: 0.4,
    metalness: 0.6,
    roughness: 0.3,
    transparent: true,
    opacity: 0.7
  });
  const platform = new THREE.Mesh(geo, mat);
  platform.position.copy(position);
  platform.position.y = 0.04;
  scene.add(platform);

  // Soft glow ring
  const ringGeo = new THREE.RingGeometry(0.7, 0.85, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(position);
  ring.position.y = 0.05;
  scene.add(ring);
}

function loadHologram(url, position, name) {
  const loader = new GLTFLoader();
  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.position.copy(position);
      model.scale.setScalar(0.8);

      // Make it feel more holographic
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.transparent = true;
            child.material.opacity = 0.92;
            child.material.emissive = new THREE.Color(0x222244);
            child.material.emissiveIntensity = 0.15;
          }
        }
      });

      model.userData = { name, isHologram: true, originalY: position.y };
      scene.add(model);
      holograms.push(model);

      // Gentle floating animation base
      model.userData.floatOffset = Math.random() * Math.PI * 2;
    },
    undefined,
    (error) => {
      console.error('Error loading hologram:', error);
      // Fallback cube if model fails
      const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x7c3aed,
        emissive: 0x4c1d95,
        transparent: true,
        opacity: 0.8
      });
      const cube = new THREE.Mesh(geo, mat);
      cube.position.copy(position);
      cube.userData = { name: 'Fallback Hologram', isHologram: true, originalY: position.y };
      scene.add(cube);
      holograms.push(cube);
    }
  );
}

function onSelectStart(event) {
  const controller = event.target;
  const intersections = getIntersections(controller);

  if (intersections.length > 0) {
    const object = intersections[0].object;
    // Climb up to the root hologram if needed
    let target = object;
    while (target.parent && !target.userData.isHologram) {
      target = target.parent;
    }
    if (target.userData.isHologram) {
      selectedObject = target;
      controller.attach(selectedObject);
      controller.userData.selected = selectedObject;
    }
  }
}

function onSelectEnd(event) {
  const controller = event.target;
  if (controller.userData.selected) {
    scene.attach(controller.userData.selected);
    controller.userData.selected = undefined;
    selectedObject = null;
  }
}

function getIntersections(controller) {
  const tempMatrix = new THREE.Matrix4();
  tempMatrix.identity().extractRotation(controller.matrixWorld);
  raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
  return raycaster.intersectObjects(holograms, true);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render() {
  // Gentle floating animation for holograms
  const time = performance.now() * 0.001;
  holograms.forEach((h) => {
    if (h.userData.originalY !== undefined) {
      h.position.y = h.userData.originalY + Math.sin(time + (h.userData.floatOffset || 0)) * 0.08;
      h.rotation.y += 0.003;
    }
  });

  if (controls) controls.update();
  renderer.render(scene, camera);
}

// ======================================================
// Future integration points (do not remove)
// ======================================================
// 1. Wallet connection → fetch owned tokenIds
// 2. For each NFT: fetch tokenURI → metadata → animation_url / model URL (IPFS)
// 3. loadHologram(ipfsGateway + cid, position, metadata.name)
// 4. Marketplace: call list / buy functions on smart contract
// ======================================================
