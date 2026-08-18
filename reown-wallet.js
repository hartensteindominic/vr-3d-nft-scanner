/* HyperStream MetaMask Connect EVM
 * Quest/desktop without the extension: MetaMask Connect uses QR + relay.
 * iPhone browser: MetaMask Connect uses the MetaMask Mobile deeplink.
 * Inside MetaMask Mobile: use the injected provider directly.
 */
let evmClient=null;
const $=id=>document.getElementById(id);
function status(t,e=false){const x=$('status');if(x){x.textContent=t;x.className='status'+(e?' error':'')}const w=$('walletStatus');if(w){w.textContent=t;w.className='walletstatus'+(e?' error':'')}}
function setConnected(b,a,provider){window.walletProvider=provider;window.walletAddress=a;window.hyperstreamSetWallet?.(a);if(b){b.disabled=false;b.textContent='🟢 WALLET CONNECTED'}status('🟢 MetaMask connected ✓')}
async function getClient(){
  if(evmClient)return evmClient;
  status('Loading MetaMask…');
  const mod=await import('https://esm.sh/@metamask/connect-evm@2.1.1?bundle');
  const createEVMClient=mod.createEVMClient;
  if(typeof createEVMClient!=='function')throw Error('MetaMask Connect could not load.');
  evmClient=await createEVMClient({
    dapp:{name:'HyperStream 3D NFT Studio',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/'},
    api:{supportedNetworks:{'eip155:11155111':'https://ethereum-sepolia.publicnode.com'}},
    analytics:{enabled:false},
    ui:{showInstallModal:false}
  });
  return evmClient;
}
async function connectWallet(){
  const b=$('connectWalletBtn');
  if(b){b.disabled=true;b.textContent='⏳ CONNECTING…'}
  try{
    if(window.ethereum){
      status('🦊 Requesting MetaMask approval…');
      const accounts=await window.ethereum.request({method:'eth_requestAccounts'});
      if(accounts?.[0]){setConnected(b,accounts[0],window.ethereum);return;}
    }
    const client=await getClient();
    status('🦊 Connecting MetaMask…');
    const result=await client.connect({chainIds:['0xaa36a7']});
    const address=result?.accounts?.[0];
    if(!address)throw Error('MetaMask did not return an account.');
    const provider=client.getProvider();
    if(!provider)throw Error('MetaMask connected but no provider was returned.');
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
