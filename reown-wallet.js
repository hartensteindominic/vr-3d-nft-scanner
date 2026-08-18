/* HyperStream 3D · MetaMask Connect
 * One wallet path for Quest + iPhone:
 * Quest/desktop without extension -> QR + relay
 * iPhone Safari/Chrome -> MetaMask Mobile deeplink + relay
 * MetaMask in-app browser/extension -> direct provider
 */
let evmClient=null;
const $=id=>document.getElementById(id);
function status(t,e=false){
  const x=$('status'); if(x){x.textContent=t;x.className='status'+(e?' error':'')}
  const w=$('walletStatus'); if(w){w.textContent=t;w.className='walletstatus'+(e?' error':'')}
}
function setConnected(button,address,provider){
  window.walletProvider=provider; window.walletAddress=address;
  window.hyperstreamSetWallet?.(address);
  if(button){button.disabled=false;button.textContent='🟢 WALLET CONNECTED'}
  status('🟢 MetaMask connected ✓');
}
async function getClient(){
  if(evmClient)return evmClient;
  status('Loading MetaMask Connect…');
  const mod=await import('https://esm.sh/@metamask/connect-evm@2.1.1?bundle');
  const createEVMClient=mod.createEVMClient;
  if(typeof createEVMClient!=='function')throw Error('MetaMask Connect could not load.');
  // Current MetaMask Connect EVM uses connect({chainIds}) for EVM chains.
  // Do not pass the legacy supportedNetworks option that caused the error.
  evmClient=await createEVMClient({
    dapp:{name:'HyperStream 3D NFT Studio',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/'},
    analytics:{enabled:false},
    ui:{showInstallModal:false}
  });
  return evmClient;
}
async function connectWallet(){
  const button=$('connectWalletBtn');
  if(button){button.disabled=true;button.textContent='⏳ CONNECTING…'}
  try{
    // Let MetaMask Connect choose the transport automatically:
    // Quest QR, iPhone deeplink, or injected MetaMask provider.
    const client=await getClient();
    status('🦊 Opening MetaMask…');
    const result=await client.connect({chainIds:['0xaa36a7']});
    const address=result?.accounts?.[0];
    if(!address)throw Error('MetaMask did not return an account.');
    const provider=client.getProvider();
    if(!provider)throw Error('MetaMask connected but no provider was returned.');
    window.walletClient=client; window.walletSession=result;
    setConnected(button,address,provider);
  }catch(e){
    console.error('HyperStream MetaMask connection error:',e);
    status('Wallet connection failed.\n'+(e?.message||String(e)),true);
    if(button){button.disabled=false;button.textContent='🦊 CONNECT WALLET'}
  }
}
window.walletClient=null; window.walletProvider=null; window.walletSession=null; window.walletAddress=null;
window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{
  const button=$('connectWalletBtn');
  if(button){button.type='button';button.addEventListener('click',connectWallet,{once:true})}
});
