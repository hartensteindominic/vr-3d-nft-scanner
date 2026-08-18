import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/exporters/GLTFExporter.js';
import { XRButton } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/webxr/XRButton.js';
import { ethers } from 'https://cdn.jsdelivr.net/npm/ethers@6.15.0/+esm';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const state = { wallet:null, chainId:null, stream:null, frames:0, model:null, file:null, collection:'My Collection', favorites:JSON.parse(localStorage.getItem('hs-favorites')||'[]') };
const SEPOLIA = '0xaa36a7';
const CONTRACT = localStorage.getItem('hs-contract') || '0x6ebd920e2383e11a06440ed632c51225b5f1909b';
const ABI = ['function mint(address to,string memory uri) public returns (uint256)','function safeMint(address to,string memory uri) public returns (uint256)'];

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03030a);
scene.fog = new THREE.FogExp2(0x03030a, 0.018);
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.05, 500);
camera.position.set(0, 1.8, 8);
const renderer = new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.xr.enabled=true; $('#stage').appendChild(renderer.domElement);
const controls = new OrbitControls(camera,renderer.domElement); controls.enableDamping=true; controls.minDistance=1.5; controls.maxDistance=30; controls.target.set(0,1,0);
scene.add(new THREE.HemisphereLight(0x99aaff,0x080812,2.2));
const key = new THREE.PointLight(0x62f6ff,90,40); key.position.set(3,6,4); scene.add(key);
const rim = new THREE.PointLight(0xff4dd8,60,30); rim.position.set(-5,2,-5); scene.add(rim);
const floor = new THREE.Mesh(new THREE.CircleGeometry(18,96),new THREE.MeshStandardMaterial({color:0x070811,metalness:.7,roughness:.7})); floor.rotation.x=-Math.PI/2; floor.position.y=-1.7; scene.add(floor);
const grid = new THREE.GridHelper(36,72,0x20304a,0x0d1424); grid.position.y=-1.68; scene.add(grid);
const core = new THREE.Group(); scene.add(core);

function toast(msg,type='info'){ const t=document.createElement('div'); t.className='toast '+type; t.textContent=msg; $('#toasts').append(t); setTimeout(()=>t.remove(),3200); }
function setStatus(text){ $('#status').textContent=text; }
function save(){ localStorage.setItem('hs-state',JSON.stringify({collection:state.collection,frames:state.frames})); }
function makeOrbital(){ core.clear(); const group=new THREE.Group(); const mat=new THREE.MeshStandardMaterial({color:0x65efff,emissive:0x163b45,emissiveIntensity:2,metalness:.7,roughness:.18}); const gem=new THREE.Mesh(new THREE.IcosahedronGeometry(1.15,3),mat); group.add(gem); for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.TorusGeometry(1.8+i*.38,.015,8,100),new THREE.MeshBasicMaterial({color:i===1?0xff59d9:0x63efff,transparent:true,opacity:.65})); r.rotation.set(.4+i*.5,.2+i*.7,0); group.add(r)} for(let i=0;i<80;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.025,6,6),new THREE.MeshBasicMaterial({color:0x8b7cff})); const a=Math.random()*Math.PI*2, rad=2.2+Math.random()*3; p.position.set(Math.cos(a)*rad,(Math.random()-.5)*3,Math.sin(a)*rad); group.add(p)} core.add(group); state.model=group; }
makeOrbital();

function renderModel(obj){ core.clear(); obj.scale.setScalar(2.4/Math.max(1,obj.getObjectByProperty?.('type','Mesh')?.geometry?.boundingSphere?.radius||1)); obj.position.y=0; core.add(obj); state.model=obj; toast('3D object loaded','ok'); }
const loader = new GLTFLoader();
function loadGLB(file){ const url=URL.createObjectURL(file); loader.load(url,g=>{renderModel(g.scene); URL.revokeObjectURL(url);},undefined,e=>toast('Could not load that 3D file','bad')); }

async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){ toast('Camera is not available in this browser','bad'); return; }
  try{
    if(state.stream) stopCamera();
    state.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    $('#camera').srcObject=state.stream; $('#camera').play(); $('#cameraCard').classList.add('live'); setStatus('CAMERA LIVE • MOVE AROUND THE OBJECT'); toast('Camera connected','ok');
  }catch(e){ toast('Camera blocked. Allow camera access and reload the page.','bad'); setStatus('CAMERA PERMISSION NEEDED'); }
}
function stopCamera(){state.stream?.getTracks().forEach(t=>t.stop());state.stream=null;$('#camera').srcObject=null;$('#cameraCard').classList.remove('live');}
function captureFrame(){ if(!state.stream){startCamera();return;} state.frames++; $('#frameCount').textContent=state.frames; $('#scanRing').style.setProperty('--p',Math.min(100,state.frames*8)+'%'); setStatus(`CAPTURE ${state.frames}/12 • KEEP MOVING`); const pulse=$('#capturePulse'); pulse.classList.remove('go'); void pulse.offsetWidth; pulse.classList.add('go'); if(state.frames>=12){toast('Scan pass complete. Export the spatial capture as GLB.','ok');setStatus('SCAN READY • EXPORT GLB');} save(); }
function resetScan(){state.frames=0;$('#frameCount').textContent='0';$('#scanRing').style.setProperty('--p','0%');setStatus('READY TO SCAN');}

async function connectWallet(){
  if(!window.ethereum){toast('Install MetaMask or open HyperStream in a wallet browser.','bad');return;}
  try{
    const provider=new ethers.BrowserProvider(window.ethereum); await provider.send('eth_requestAccounts',[]); const signer=await provider.getSigner(); state.wallet=await signer.getAddress(); const network=await provider.getNetwork(); state.chainId='0x'+network.chainId.toString(16); $('#wallet').textContent=state.wallet.slice(0,6)+'…'+state.wallet.slice(-4); $('#walletDot').classList.add('on');
    if(state.chainId!==SEPOLIA) toast('Wallet connected. Switch to Sepolia for test minting.','warn'); else toast('MetaMask connected on Sepolia','ok');
  }catch(e){toast(e.shortMessage||e.message||'Wallet connection failed','bad')}
}
async function switchSepolia(){ if(!window.ethereum)return connectWallet(); try{await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:SEPOLIA}]});toast('Switched to Sepolia','ok')}catch(e){toast('Switch to Sepolia in MetaMask to mint','warn')} }
async function mint(){
  if(!state.wallet){await connectWallet(); if(!state.wallet)return;}
  if(state.chainId!==SEPOLIA){await switchSepolia();return;}
  const name=$('#nftName').value.trim()||'HyperStream Object'; const desc=$('#nftDesc').value.trim()||'A 3D creation made in HyperStream.';
  const metadata={name,description:desc,creator:state.wallet,collection:state.collection,frames:state.frames,createdAt:new Date().toISOString(),animation_url:state.file?.name||null};
  const uri='data:application/json;base64,'+btoa(unescape(encodeURIComponent(JSON.stringify(metadata))));
  try{ const provider=new ethers.BrowserProvider(window.ethereum); const signer=await provider.getSigner(); const c=new ethers.Contract(CONTRACT,ABI,signer); let tx; try{tx=await c.mint(state.wallet,uri)}catch{tx=await c.safeMint(state.wallet,uri)}; toast('Mint transaction submitted','ok'); $('#tx').textContent=tx.hash; await tx.wait(); toast('NFT minted on Sepolia 🎉','ok'); $('#txLink').href='https://sepolia.etherscan.io/tx/'+tx.hash; $('#txLink').hidden=false; }catch(e){toast(e.shortMessage||e.message||'Mint failed','bad')}
}
function exportGLB(){ if(!state.model){toast('Nothing to export','bad');return;} const exporter=new GLTFExporter(); exporter.parse(state.model,(result)=>{const blob=new Blob([result],{type:'model/gltf-binary'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(($('#nftName').value||'hyperstream-object').replace(/[^a-z0-9-_]/gi,'-'))+'.glb';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('GLB exported','ok')},{binary:true}); }
function downloadSnapshot(){const a=document.createElement('a');a.href=renderer.domElement.toDataURL('image/png');a.download='hyperstream-preview.png';a.click();}

$('#cameraBtn').onclick=startCamera; $('#stopCamera').onclick=()=>{stopCamera();setStatus('CAMERA OFF')}; $('#capture').onclick=captureFrame; $('#resetScan').onclick=resetScan; $('#connect').onclick=connectWallet; $('#wallet').onclick=connectWallet; $('#switch').onclick=switchSepolia; $('#mint').onclick=mint; $('#export').onclick=exportGLB; $('#snapshot').onclick=downloadSnapshot;
$('#file').onchange=e=>{const f=e.target.files?.[0];if(!f)return;state.file=f;$('#fileName').textContent=f.name;if(/\.glb$|\.gltf$/i.test(f.name))loadGLB(f);else if(f.type.startsWith('image/')){const img=new THREE.TextureLoader().load(URL.createObjectURL(f));core.clear();const m=new THREE.Mesh(new THREE.PlaneGeometry(4,3),new THREE.MeshBasicMaterial({map:img}));core.add(m);state.model=m;}toast('Asset added to your studio','ok')};
$('#createCollection').onclick=()=>{const n=prompt('Name your collection',state.collection);if(n){state.collection=n;$('#collectionName').textContent=n;save();toast('Collection updated','ok')}};
$('#clear').onclick=()=>{localStorage.removeItem('hs-state');state.collection='My Collection';resetScan();toast('Studio reset')};
$('#enterXR').onclick=()=>{if(renderer.xr.isPresenting)renderer.xr.getSession()?.end();else if(navigator.xr){renderer.xr.setSession(renderer.xr.getSession()||null).catch(()=>toast('Use the WebXR button in a compatible Quest browser','warn'))}else toast('WebXR is not available on this device','warn')};
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
window.addEventListener('beforeunload',stopCamera);
window.ethereum?.on?.('accountsChanged',a=>{if(!a.length){state.wallet=null;$('#wallet').textContent='CONNECT WALLET';$('#walletDot').classList.remove('on')}});
window.ethereum?.on?.('chainChanged',c=>{state.chainId=c});

function animate(){requestAnimationFrame(animate);core.rotation.y+=.0018;controls.update();renderer.render(scene,camera)} animate();

const saved=JSON.parse(localStorage.getItem('hs-state')||'null'); if(saved){state.collection=saved.collection||state.collection;state.frames=saved.frames||0;$('#collectionName').textContent=state.collection;$('#frameCount').textContent=state.frames}
setStatus('READY TO CREATE');
