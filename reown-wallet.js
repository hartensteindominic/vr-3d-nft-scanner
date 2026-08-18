/* HyperStream 3D • production wallet bridge
   Desktop: injected MetaMask / EIP-1193
   iPhone/iPad: MetaMask deep-link, then injected provider in MetaMask browser
   Quest: injected provider when the browser exposes one
   EIP-6963 discovery is supported for modern wallet extensions.
   No Reown, QR, or supportedNetworks. */
const SEPOLIA={chainId:'0xaa36a7',chainName:'Sepolia',nativeCurrency:{name:'Sepolia Ether',symbol:'ETH',decimals:18},rpcUrls:['https://rpc.sepolia.org'],blockExplorerUrls:['https://sepolia.etherscan.io']};
const $=id=>document.getElementById(id);let discovered=[];
function status(t,e=false){const s=$('status');if(s){s.textContent=t;s.className='status'+(e?' error':'')}const w=$('walletStatus');if(w){w.textContent=t;w.className='walletstatus'+(e?' error':'')}}
function short(a){return a?`${a.slice(0,8)}...${a.slice(-6)}`:''}
function ios(){return /iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)}
function mmApp(){return /MetaMaskMobile/i.test(navigator.userAgent)}
function isQuest(){return /OculusBrowser|Quest/i.test(navigator.userAgent)}
function chooseProvider(){if(window.ethereum)return window.ethereum;return discovered.find(x=>/MetaMask/i.test(x.info?.name||''))?.provider||discovered[0]?.provider||null}
function launchMetaMask(){const u=location.href.split('#')[0].replace(/^https?:\/\//,'');window.location.href='https://metamask.app.link/dapp/'+u}
window.addEventListener('eip6963:announceProvider',e=>{if(e.detail?.provider&&!discovered.some(x=>x.provider===e.detail.provider))discovered.push(e.detail)});window.dispatchEvent(new Event('eip6963:requestProvider'));
async function ensureSepolia(p){const current=String(await p.request({method:'eth_chainId'})).toLowerCase();if(current===SEPOLIA.chainId)return;try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:SEPOLIA.chainId}]})}catch(e){if(e?.code!==4902)throw e;await p.request({method:'wallet_addEthereumChain',params:[SEPOLIA]})}if(String(await p.request({method:'eth_chainId'})).toLowerCase()!==SEPOLIA.chainId)throw Error('Please switch your wallet to Sepolia.')}
function connected(button,address,p){window.walletProvider=p;window.walletAddress=address;window.walletSession={accounts:[address],chainId:SEPOLIA.chainId};window.walletClient=p;window.hyperstreamSetWallet?.(address);if(button){button.disabled=false;button.textContent='WALLET CONNECTED'}status(`🦊 Wallet connected\n${short(address)}\nSepolia`)}
async function connectWallet(){const b=$('connectWalletBtn');if(b){b.disabled=true;b.textContent='CONNECTING...'}try{let p=chooseProvider();if(!p){if(ios()&&!mmApp()){status('Opening MetaMask…');launchMetaMask();return}const where=ios()?'MetaMask':isQuest()?'a wallet-enabled Quest browser':'a MetaMask browser extension';throw Error(`No wallet provider is available. Open this site in ${where}, then try again.`)}status('Wallet found. Requesting account…');const accounts=await p.request({method:'eth_requestAccounts'});const address=accounts?.[0];if(!address)throw Error('No wallet account was returned.');await ensureSepolia(p);connected(b,address,p);p.on?.('accountsChanged',onAccounts);p.on?.('chainChanged',onChain)}catch(e){console.error('[HyperStream wallet]',e);status('WALLET CONNECTION FAILED\n'+(e?.message||String(e)),true);if(b){b.disabled=false;b.textContent='CONNECT WALLET'}}}
function onAccounts(a){if(!a?.length){window.walletProvider=null;window.walletAddress=null;window.walletSession=null;if($('wallet'))$('wallet').textContent='';status('Wallet disconnected');return}window.walletAddress=a[0];window.hyperstreamSetWallet?.(a[0]);status(`Wallet account changed\n${short(a[0])}`)}
function onChain(c){if(String(c).toLowerCase()===SEPOLIA.chainId)status('🦊 Wallet connected\nSepolia');else status('Wallet connected. Switch to Sepolia before minting.',true)}
window.walletProvider=null;window.walletAddress=null;window.walletSession=null;window.walletClient=null;window.reownConnect=connectWallet;window.connectWallet=connectWallet;
window.addEventListener('DOMContentLoaded',()=>{const b=$('connectWalletBtn');if(!b)return;b.type='button';b.addEventListener('click',connectWallet);if(ios()&&!mmApp()&&!chooseProvider())b.textContent='OPEN IN METAMASK';else if(isQuest()&&!chooseProvider())b.textContent='CHECK WALLET';});