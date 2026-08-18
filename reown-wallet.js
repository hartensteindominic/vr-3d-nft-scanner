const projectId='f9f636bc1db354b9bfddddd2ad1d4eae';
let signClient=null;
function status(t,e=false){const x=document.getElementById('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
async function getSignClient(){
 if(signClient)return signClient;
 status('Connecting WalletConnect…');
 const mod=await import('https://esm.sh/@walletconnect/sign-client@2.23.4?bundle');
 const SignClient=mod.default||mod.SignClient;
 if(!SignClient)throw Error('WalletConnect failed to load.');
 signClient=await SignClient.init({projectId,metadata:{name:'HyperStream 3D NFT Studio',description:'3D NFT Studio for MetaMask mobile',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/',icons:[]}});
 signClient.on('session_delete',()=>{window.walletProvider=null;status('Wallet disconnected.')});
 return signClient;
}
async function connectWallet(){
 const b=document.getElementById('connectWalletBtn');if(b)b.disabled=true;
 try{
  const client=await getSignClient();
  const {uri,approval}=await client.connect({requiredNamespaces:{eip155:{methods:['eth_sendTransaction','personal_sign','eth_signTypedData','eth_signTypedData_v4'],chains:['eip155:11155111'],events:['accountsChanged','chainChanged']}}});
  if(!uri)throw Error('WalletConnect did not create a connection request.');
  status('📱 Open MetaMask on your phone and approve the connection.');
  const universal='https://metamask.app.link/wc?uri='+encodeURIComponent(uri);
  window.location.href=universal;
  const session=await approval();
  const accounts=session?.namespaces?.eip155?.accounts||[];
  const address=accounts[0]?.split(':')[2];
  if(address){setAddress(address);status('🦊 Wallet connected ✓');}
  window.walletProvider=client;
  if(b)b.textContent='🟢 WALLET CONNECTED';
 }catch(e){console.error(e);status('WALLET CONNECTION FAILED\n'+(e.message||e),true);if(b){b.disabled=false;b.textContent='🦊 CONNECT WALLET'}}
}
window.walletProvider=null;
window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=document.getElementById('connectWalletBtn');if(b)b.addEventListener('click',connectWallet)});
