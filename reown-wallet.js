const projectId='f9f636bc1db354b9bfddddd2ad1d4eae';
let signClient=null,qrBox=null,qrLib=null;
function status(t,e=false){const x=document.getElementById('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
function closeQR(){if(qrBox){qrBox.remove();qrBox=null}}
async function showQR(uri){
 if(!qrBox){
  qrBox=document.createElement('div');qrBox.id='wcQuestQr';qrBox.innerHTML='<div style="position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.88);display:grid;place-items:center;padding:20px"><div style="background:#0b101b;border:1px solid #64f6ff;border-radius:22px;padding:24px;text-align:center;max-width:360px;width:90%;box-shadow:0 0 50px #64f6ff33"><h2 style="margin:0 0 8px;color:#64f6ff">📱 SCAN WITH METAMASK</h2><p style="margin:8px 0 16px">Open MetaMask on your phone → Scan → scan this QR code.</p><canvas id="wcQrCanvas" style="background:#fff;border-radius:14px;width:280px;height:280px;max-width:80vw"></canvas><br><button id="wcQrClose" style="margin-top:16px;padding:12px 18px;border:0;border-radius:10px;font-weight:800">CLOSE</button></div></div>';
  document.body.appendChild(qrBox);qrBox.querySelector('#wcQrClose').onclick=closeQR;
 }
 try{
  if(!qrLib){const m=await import('https://esm.sh/qrcode@1.5.4');qrLib=m.default||m}
  await qrLib.toCanvas(document.getElementById('wcQrCanvas'),uri,{width:280,margin:2,errorCorrectionLevel:'M'});
  status('📱 MetaMask phone: Scan this QR code, then approve.');
 }catch(e){closeQR();throw Error('QR generator failed: '+(e.message||e))}
}
async function getSignClient(){
 if(signClient)return signClient;
 status('Connecting WalletConnect…');
 const mod=await import('https://esm.sh/@walletconnect/sign-client@2.23.4?bundle');
 const SignClient=mod.default||mod.SignClient;
 if(!SignClient)throw Error('WalletConnect failed to load.');
 signClient=await SignClient.init({projectId,metadata:{name:'HyperStream 3D NFT Studio',description:'3D NFT Studio for MetaMask mobile',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/',icons:[]}});
 return signClient;
}
async function connectWallet(){
 const b=document.getElementById('connectWalletBtn');if(b)b.disabled=true;
 try{
  const client=await getSignClient();
  const {uri,approval}=await client.connect({requiredNamespaces:{eip155:{methods:['eth_sendTransaction','personal_sign','eth_signTypedData','eth_signTypedData_v4'],chains:['eip155:11155111'],events:['accountsChanged','chainChanged']}}});
  if(!uri)throw Error('WalletConnect did not create a QR request.');
  await showQR(uri);
  const session=await approval();
  closeQR();
  const accounts=session?.namespaces?.eip155?.accounts||[];
  const address=accounts[0]?.split(':')[2];
  if(!address)throw Error('MetaMask connected but returned no wallet address.');
  setAddress(address);status('🦊 Wallet connected ✓');
  if(b)b.textContent='🟢 WALLET CONNECTED';
  // Keep the SignClient for session state. Minting uses the connected wallet session separately when available.
  window.walletProvider=client;
 }catch(e){closeQR();console.error(e);status('WALLET CONNECTION FAILED\n'+(e.message||e),true);if(b){b.disabled=false;b.textContent='🦊 CONNECT WALLET'}}
}
window.walletProvider=null;
window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('connectWalletBtn');if(b)b.addEventListener('click',connectWallet)});
