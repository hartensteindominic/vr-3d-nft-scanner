let evmClient=null;
const $=id=>document.getElementById(id);
function status(t,e=false){const x=$('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
function setConnected(b,a,provider){setAddress(a);window.walletProvider=provider;window.walletAddress=a;if(b){b.disabled=false;b.textContent='🟢 WALLET CONNECTED'}status('🟢 MetaMask connected ✓')}
async function getClient(){
 if(evmClient)return evmClient;
 status('Loading MetaMask Connect…');
 const mod=await import('https://esm.sh/@metamask/connect-evm@2.1.1?bundle');
 const createEVMClient=mod.createEVMClient;
 if(!createEVMClient)throw Error('MetaMask Connect EVM failed to load.');
 evmClient=await createEVMClient({dapp:{name:'HyperStream 3D NFT Studio',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/'},ui:{showInstallModal:false}});
 return evmClient;
}
async function connectWallet(){
 const b=$('connectWalletBtn');if(b){b.disabled=true;b.textContent='⏳ CONNECTING…'}
 try{
  const client=await getClient();
  status('🦊 Sending connection request…');
  const result=await client.connect({chainIds:['0xaa36a7']});
  const address=result?.accounts?.[0];
  if(!address)throw Error('MetaMask connected but returned no wallet address.');
  const provider=client.getProvider();
  if(!provider)throw Error('MetaMask connected but no EVM provider was returned.');
  window.walletClient=client;window.walletSession=result;setConnected(b,address,provider);
 }catch(e){
  console.error(e);
  status('WALLET CONNECTION FAILED\n'+(e?.message||e),true);
  if(b){b.disabled=false;b.textContent='🦊 CONNECT WALLET'}
 }
}
window.walletClient=null;window.walletProvider=null;window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=$('connectWalletBtn');if(b){b.type='button';b.addEventListener('click',connectWallet)}});
