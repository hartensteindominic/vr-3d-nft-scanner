let metamaskSDK=null;
const $=id=>document.getElementById(id);
function status(t,e=false){const x=$('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}const w=$('walletStatus');if(w){w.textContent=t;w.className='walletstatus'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
function setConnected(b,a,provider){setAddress(a);window.walletProvider=provider;window.walletAddress=a;if(b){b.disabled=false;b.textContent='🟢 WALLET CONNECTED'}status('🟢 MetaMask connected ✓')}
async function getSDK(){
 if(metamaskSDK)return metamaskSDK;
 status('Loading MetaMask…');
 const mod=await import('https://esm.sh/@metamask/sdk@0.33.1?bundle');
 const SDK=mod.MetaMaskSDK||mod.default;
 if(!SDK)throw Error('MetaMask SDK could not load.');
 metamaskSDK=new SDK({
  dappMetadata:{name:'HyperStream 3D NFT Studio',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/',iconUrl:'https://hartensteindominic.github.io/vr-3d-nft-scanner/favicon.ico'},
  checkInstallationImmediately:false,
  preferDesktop:false,
  shouldShimWeb3:true
 });
 return metamaskSDK;
}
async function connectWallet(){
 const b=$('connectWalletBtn');if(b){b.disabled=true;b.textContent='⏳ CONNECTING…'}
 try{
  // MetaMask browser / extension: use the injected provider directly.
  if(window.ethereum){
   status('🦊 Requesting MetaMask approval…');
   const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
   if(!accounts?.[0])throw Error('MetaMask returned no account.');
   window.walletClient=null;
   setConnected(b,accounts[0],window.ethereum);
   return;
  }
  // iPhone Safari / Quest: MetaMask SDK handles the official MetaMask mobile handoff.
  const sdk=await getSDK();
  status('🦊 Opening MetaMask…');
  const provider=await sdk.getProvider();
  if(!provider)throw Error('MetaMask did not provide a connection.');
  const accounts=await provider.request({method:'eth_requestAccounts'});
  if(!accounts?.[0])throw Error('MetaMask opened but did not return an account.');
  window.walletClient=sdk;
  setConnected(b,accounts[0],provider);
 }catch(e){
  console.error('HyperStream MetaMask error:',e);
  const message=e?.message||String(e);
  status('MetaMask connection failed.\n'+message,true);
  if(b){b.disabled=false;b.textContent='🦊 CONNECT WALLET'}
 }
}
window.walletClient=null;window.walletProvider=null;window.walletSession=null;window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=$('connectWalletBtn');if(b){b.type='button';b.addEventListener('click',connectWallet)}});
