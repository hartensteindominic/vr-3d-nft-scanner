import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
import {XRButton} from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/webxr/XRButton.js';

const mount = document.createElement('div');
mount.id = 'vr-market-mount';
mount.innerHTML = '<button id="enter-vr" class="vr-launch">ENTER VR MARKET</button><span class="vr-hint">WebXR · Quest / compatible headset</span>';
document.querySelector('.top-status')?.append(mount);

const button = mount.querySelector('#enter-vr');
const hint = mount.querySelector('.vr-hint');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02030a);
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 100);
camera.position.set(0, 1.6, 4.8);
const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(1,1);
renderer.xr.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.className = 'vr-canvas';

document.body.appendChild(renderer.domElement);
const xrButton = XRButton.createButton(renderer, {optionalFeatures:['local-floor','bounded-floor','hand-tracking']});
xrButton.style.display = 'none';
document.body.appendChild(xrButton);

scene.add(new THREE.HemisphereLight(0x8be9ff, 0x090014, 2.2));
const key = new THREE.PointLight(0x55eaff, 45, 18); key.position.set(0,4,2); scene.add(key);
const rim = new THREE.PointLight(0xc56cff, 30, 16); rim.position.set(-4,2,-3); scene.add(rim);

function textSprite(text, color='#62f6ff', scale=0.011){
  const c=document.createElement('canvas'); c.width=1024; c.height=128;
  const ctx=c.getContext('2d'); ctx.clearRect(0,0,c.width,c.height);
  ctx.font='700 52px system-ui'; ctx.fillStyle=color; ctx.textAlign='center'; ctx.fillText(text,c.width/2,76);
  const tex=new THREE.CanvasTexture(c); tex.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true}); const s=new THREE.Sprite(mat); s.scale.set(5*scale/0.011,0.62,1); return s;
}

function panel(w,h,color=0x071126){
  const g=new THREE.Group();
  const box=new THREE.Mesh(new THREE.BoxGeometry(w,h,.08),new THREE.MeshStandardMaterial({color,metalness:.7,roughness:.25,emissive:0x071b32,emissiveIntensity:1}));
  g.add(box);
  const edge=new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry),new THREE.LineBasicMaterial({color:0x62f6ff,transparent:true,opacity:.7})); g.add(edge);
  return g;
}

const world = new THREE.Group(); scene.add(world);
const floor=new THREE.Mesh(new THREE.CircleGeometry(8,96),new THREE.MeshStandardMaterial({color:0x030712,metalness:.9,roughness:.28,emissive:0x040a19,emissiveIntensity:1}));
floor.rotation.x=-Math.PI/2; world.add(floor);
const ring=new THREE.Mesh(new THREE.RingGeometry(2.7,2.74,96),new THREE.MeshBasicMaterial({color:0x62f6ff,transparent:true,opacity:.75})); ring.rotation.x=-Math.PI/2; ring.position.y=.012; world.add(ring);

const title=textSprite('HYPERSTREAM // VR DIGITAL MATTER EXCHANGE'); title.position.set(0,3.35,-3); title.scale.set(5.6,.7,1); world.add(title);
const subtitle=textSprite('SCAN  •  PREVIEW  •  COLLECT  •  TRADE', '#a78bfa'); subtitle.position.set(0,2.85,-3); subtitle.scale.set(4.2,.52,1); world.add(subtitle);

const items=[
  ['NEON RELIC','ARTIFACT','0.080 MATIC',0x62f6ff],
  ['QUANTUM BLOOM','HOLOGRAM','0.120 MATIC',0xff4fd8],
  ['VOXEL FOX','CREATURE','0.250 MATIC',0xa78bfa],
  ['DIMENSIONAL STRATA','ENVIRONMENT','0.180 MATIC',0x6dffb2]
];
items.forEach((it,i)=>{
  const x=(i-1.5)*2.05;
  const card=panel(1.75,1.85,0x080d1d); card.position.set(x,1.25,-2.25); world.add(card);
  const orb=new THREE.Mesh(new THREE.IcosahedronGeometry(.43,2),new THREE.MeshStandardMaterial({color:it[3],emissive:it[3],emissiveIntensity:1.7,metalness:.55,roughness:.2,wireframe:i===3}));
  orb.position.set(0,.23,.12); card.add(orb);
  const n=textSprite(it[0],'#eef6ff'); n.position.set(0,-.38,.12); n.scale.set(1.35,.22,1); card.add(n);
  const m=textSprite(it[1], '#62f6ff'); m.position.set(0,-.67,.12); m.scale.set(1.1,.18,1); card.add(m);
  const p=textSprite(it[2], '#6dffb2'); p.position.set(0,-.92,.12); p.scale.set(.95,.16,1); card.add(p);
  card.userData={name:it[0],price:it[2]};
});

const scanner=panel(2.4,1.4,0x060b18); scanner.position.set(0,1.15,0); world.add(scanner);
const scanOrb=new THREE.Mesh(new THREE.SphereGeometry(.48,32,32),new THREE.MeshStandardMaterial({color:0x62f6ff,emissive:0x0a9db0,emissiveIntensity:2,transparent:true,opacity:.82})); scanner.add(scanOrb); 
const scanLabel=textSprite('LIVE SCANNER','#62f6ff'); scanLabel.position.set(0,-.58,.12); scanLabel.scale.set(1.25,.2,1); scanner.add(scanLabel);
const scanSub=textSprite('RGB → DEPTH → GLB','#aab5d1'); scanSub.position.set(0,-.84,.12); scanSub.scale.set(1.15,.16,1); scanner.add(scanSub);

const prompt=textSprite('MOVE YOUR HEAD TO EXPLORE','#eef6ff'); prompt.position.set(0,.15,-.8); prompt.scale.set(2.6,.32,1); world.add(prompt);

function resize(){const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h)}
addEventListener('resize',resize); resize();
let t=0;
renderer.setAnimationLoop((time)=>{
  t=time*.001; scanOrb.rotation.y=t*1.5; scanOrb.position.y=.23+Math.sin(t*2)*.06;
  ring.scale.setScalar(1+.035*Math.sin(t*1.5));
  world.children.forEach((o,i)=>{if(o.userData?.name)o.rotation.y=Math.sin(t*.35+i)*.025});
  renderer.render(scene,camera);
});

button.onclick=async()=>{
  if(!('xr' in navigator)){hint.textContent='WebXR is not available in this browser'; return;}
  try{
    const supported=await navigator.xr.isSessionSupported('immersive-vr');
    if(!supported){hint.textContent='Immersive VR is not supported here'; return;}
    renderer.domElement.style.display='block'; xrButton.click();
  }catch(err){hint.textContent='VR launch failed: '+err.message}
};
renderer.xr.addEventListener('sessionstart',()=>{button.textContent='VR ACTIVE';hint.textContent='Look around the exchange';});
renderer.xr.addEventListener('sessionend',()=>{button.textContent='ENTER VR MARKET';hint.textContent='WebXR · Quest / compatible headset';});
