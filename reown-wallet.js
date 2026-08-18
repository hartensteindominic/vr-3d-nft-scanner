let evmClient=null;
const $=id=>document.getElementById(id);
function status(t,e=false){const x=$('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}const w=$('walletStatus');if(w){w.textContent=t;w.className='walletstatus'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
function setConnected(b,a,provider){setAddress(a);window.walletProvider=provider;window.walletAddress=a;if(b){b.disabled=false;b.textContent='🟢 WALLET CONNECTED'}status('🟢 Wallet connected ✓')}
async function getClient(){
 if(evmClient)return evmClient;
 status('Loading wallet connection…');
 const mod=await import('https://esm.sh/@metamask/connect-evm@2.1.1?bundle');
 const createEVMClient=mod.createEVMClient;
 if(typeof createEVMClient!=='function')throw Error('MetaMask Connect could not load.');
 evmClient=await createEVMClient({dapp:{name:'HyperStream 3D NFT Studio',url:window.location.origin+window.location.pathname}});
 return evmClient;
}
async function connectWallet(){
 const b=$('connectWalletBtn');if(b){b.disabled=true;b.textContent='⏳ CONNECTING…'}
 try{
  // If the page is already running inside MetaMask, use its injected provider directly.
  if(window.ethereum){
   status('🦊 Requesting MetaMask approval…');
   const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
   if(accounts?.[0]){setConnected(b,accounts[0],window.ethereum);return;}
  }
  // Otherwise let MetaMask Connect choose the correct mobile/desktop transport.
  const client=await getClient();
  status('🦊 Opening MetaMask connection…');
  const result=await client.connect();
  const address=result?.accounts?.[0];
  if(!address)throw Error('MetaMask did not return an account.');
  const provider=client.getProvider();
  if(!provider)throw Error('Wallet connected but no provider was returned.');
  window.walletClient=client;window.walletSession=result;
  setConnected(b,address,provider);
 }catch(e){
  console.error('HyperStream wallet error:',e);
  const message=e?.message||String(e);
  status('Wallet connection failed.\n'+message,true);
  if(b){b.disabled=false;b.textContent='🦊 CONNECT WALLET'}
 }
}
window.walletClient=null;window.walletProvider=null;window.walletSession=null;window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=$('connectWalletBtn');if(b){b.type='button';b.addEventListener('click',connectWallet)}});
