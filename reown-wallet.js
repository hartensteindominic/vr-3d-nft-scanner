/* HyperStream 3D · MetaMask Connect
 * Quest = display, iPhone = scanner.
 * Quest/desktop without extension -> MetaMask QR shown on the headset; scan THIS screen with the phone.
 * iPhone Safari/Chrome -> MetaMask Mobile deeplink + relay.
 * MetaMask in-app browser/extension -> direct provider.
 */
let evmClient=null;
const $=id=>document.getElementById(id);
const isQuest=/Oculus|Quest|Meta Quest/i.test(navigator.userAgent);
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
    const client=await getClient();
    if(isQuest){
      status('📱 QUEST DETECTED\nMetaMask QR will appear on this headset screen.\nUse your iPhone MetaMask app → Scan → point the phone camera at THIS screen.\n\nThe Quest does not scan the QR. Your phone does.');
    }else{
      status('🦊 Opening MetaMask…');
    }
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
