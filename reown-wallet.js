/* HyperStream 3D · MetaMask Connect
 * Quest-aware wallet UX:
 * - Quest + MetaMask extension/injected provider -> direct connection, no QR.
 * - iPhone Safari/Chrome -> MetaMask Connect mobile deeplink + relay.
 * - Desktop without extension -> MetaMask Connect QR + relay.
 *
 * IMPORTANT: MetaMask Connect does not document a supported `withDeeplink`
 * option for forcing a phone deeplink from a Quest browser. We therefore
 * never pretend that option exists. On Quest, use an injected MetaMask
 * provider when one is installed; otherwise show a phone-connection
 * instruction instead of presenting an unusable QR on the headset.
 */
let evmClient=null;
const $=id=>document.getElementById(id);
const isQuest=/Oculus|Quest|Meta Quest/i.test(navigator.userAgent||'');
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
async function connectInjected(button){
  const provider=window.ethereum;
  if(!provider) return false;
  status('🦊 Connecting to MetaMask in Quest…');
  const accounts=await provider.request({method:'eth_requestAccounts'});
  const address=accounts?.[0];
  if(!address) throw Error('MetaMask did not return an account.');
  const chain=await provider.request({method:'eth_chainId'});
  if(String(chain).toLowerCase()!=='0xaa36a7'){
    try{await provider.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xaa36a7'}]})}
    catch(e){throw Error('Switch MetaMask to Sepolia, then try again.')}
  }
  setConnected(button,address,provider);
  return true;
}
async function getClient(){
  if(evmClient)return evmClient;
  status('Loading MetaMask Connect…');
  const mod=await import('https://esm.sh/@metamask/connect-evm@2.1.1?bundle');
  const createEVMClient=mod.createEVMClient;
  if(typeof createEVMClient!=='function')throw Error('MetaMask Connect could not load.');
  evmClient=await createEVMClient({
    dapp:{name:'HyperStream 3D NFT Studio',url:'https://hartensteindominic.github.io/vr-3d-nft-scanner/'},
    analytics:{enabled:false},
    ui:{showInstallModal:false}
  });
  return evmClient;
}
function showQuestPhoneHelp(){
  status('📱 QUEST DETECTED\n\nNo MetaMask wallet is installed inside this Quest browser.\n\nFor a direct headset connection, install MetaMask in the Quest browser and tap CONNECT WALLET again.\n\nIf you want to use MetaMask on your iPhone, open HyperStream in MetaMask Mobile on your phone and connect there. This Quest browser will not show a QR that requires the headset to scan.',true);
}
async function connectWallet(){
  const button=$('connectWalletBtn');
  if(button){button.disabled=true;button.textContent='⏳ CONNECTING…'}
  try{
    // Quest first: if MetaMask is installed/injected, connect directly.
    // This guarantees no QR is presented inside the headset.
    if(isQuest){
      const connected=await connectInjected(button);
      if(connected)return;
      showQuestPhoneHelp();
      return;
    }
    // iPhone/desktop: let MetaMask Connect select its documented transport.
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
  }finally{
    if(button&&!window.walletAddress){button.disabled=false;button.textContent='🦊 CONNECT WALLET'}
  }
}
window.walletClient=null; window.walletProvider=null; window.walletSession=null; window.walletAddress=null;
window.reownConnect=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{
  const button=$('connectWalletBtn');
  if(button){button.type='button';button.addEventListener('click',connectWallet)}
  if(isQuest){
    const w=$('walletStatus'); if(w)w.textContent='🥽 Quest detected · MetaMask direct connection preferred';
  }
});
