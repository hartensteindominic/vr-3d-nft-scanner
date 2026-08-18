const projectId='f9f636bc1db354b9bfddddd2ad1d4eae';
let signClient=null;
const $=id=>document.getElementById(id);
function status(t,e=false){const x=$('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}}
function setAddress(a){if(a)window.hyperstreamSetWallet?.(a)}
function setConnected(b,a){setAddress(a);if(b){b.disabled=false;b.textContent='🟢 WALLET CONNECTED'}status('🟢 Wallet connected ✓')}
async function connectInjected(b){
 const eth=window.ethereum;
 if(!eth)return false;
 status('🦊 Requesting MetaMask approval…');
 const accounts=await eth.request({method:'eth_requestAccounts'});
 const address=accounts?.[0];
 if(!address)throw Error('MetaMask returned no account.');
 window.walletProvider=eth;
 setConnected(b,address);
 return true;
}
async function getClient(){
 if(signClient)return signClient;
 status('Loading secure wallet connection…');
 const mod=await import('https://esm.sh/@walletconnect/sign-client@2.23.4?bundle');
 const SignClient=mod.default||mod.SignClient;
 if(!SignClient)throw Error('Wallet connection library failed to load.');
 signClient=await SignClient.init({projectId,metadata:{name:'HyperStream 3D NFT Studio',description:'Connect MetaMask mobile to HyperStream',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/',icons:[]}});
 return signClient;
}
async function connectWallet(){
 const b=$('connectWalletBtn');if(b){b.disabled=true;b.textContent='⏳ CONNECTING…'}
 try{
  if(await connectInjected(b))return;
  const client=await getClient();
  const existing=client.session.getAll().find(s=>s.namespaces?.eip155?.accounts?.length);
  if(existing){const a=existing.namespaces.eip155.accounts[0].split(':')[2];window.walletClient=client;window.walletSession=existing;setConnected(b,a);return;}
  const {uri,approval}=await client.connect({requiredNamespaces:{eip155:{methods:['eth_sendTransaction','personal_sign','eth_signTypedData','eth_signTypedData_v4'],chains:['eip155:11155111'],events:['accountsChanged','chainChanged']}}});
  if(!uri)throw Error('No wallet connection request was created.');
  window.walletConnectUri=uri;
  status('📱 Wallet connection request ready. Open MetaMask on your phone and use its WalletConnect scanner.');
  const session=await approval();
  const account=session?.namespaces?.eip155?.accounts?.[0];
  const address=account?.split(':')[2];
  if(!address)throw Error('MetaMask approved, but no wallet address was returned.');
  window.walletClient=client;window.walletSession=session;window.walletProvider=null;
  setConnected(b,address);
 }catch(e){console.error(e);status('WALLET CONNECTION FAILED\n'+(e?.message||e),true);if(b){b.disabled=false;b.textContent='🦊 CONNECT WALLET'}}
}
window.walletClient=null;window.walletProvider=null;window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=$('connectWalletBtn');if(b){b.type='button';b.addEventListener('click',connectWallet)}});
