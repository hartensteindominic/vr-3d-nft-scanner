import { createAppKit } from 'https://esm.sh/@reown/appkit@latest?bundle';
import { EthersAdapter } from 'https://esm.sh/@reown/appkit-adapter-ethers@latest?bundle';

const projectId = 'f9f636bc1db354b9bfddddd2ad1d4eae';
const sepolia = {
  id: 11155111,
  caipNetworkId: 'eip155:11155111',
  chainNamespace: 'eip155',
  name: 'Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.sepolia.org'] } },
  blockExplorers: { default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' } }
};

const modal = createAppKit({
  adapters: [new EthersAdapter()],
  networks: [sepolia],
  defaultNetwork: sepolia,
  projectId,
  metadata: {
    name: 'HyperStream 3D NFT Studio',
    description: 'Connect MetaMask on your phone by scanning the WalletConnect QR code.',
    url: 'https://hartensteindominic.github.io/vr-3d-nft-scanner/',
    icons: []
  },
  features: { analytics: false, email: false, socials: [] }
});

function setStatus(text, error = false) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = text;
  el.className = 'status' + (error ? ' error' : '');
}

function syncWallet() {
  try {
    const connected = modal.getIsConnected();
    const address = modal.getAddress();
    if (connected && address) {
      window.walletProvider = modal.getWalletProvider?.() || window.walletProvider || null;
      window.hyperstreamSetWallet?.(address);
    }
  } catch (e) { console.debug('Wallet state not ready', e); }
}

async function connectReown() {
  const wrap = document.getElementById('qrWrap');
  if (wrap) wrap.hidden = false;
  setStatus('📱 Scan the WalletConnect QR with MetaMask on your phone…');

  // IMPORTANT: WalletConnect is the QR-code view. Do not open the
  // MetaMask-specific wallet view, which can route Quest users to an install page.
  modal.open({ view: 'WalletConnect', namespace: 'eip155' });
}

modal.subscribeProvider(({ provider, address, isConnected, error }) => {
  if (error) {
    console.error(error);
    setStatus('Wallet connection error. Scan the QR again.', true);
    return;
  }
  if (isConnected && provider && address) {
    window.walletProvider = provider;
    window.hyperstreamSetWallet?.(address);
    setStatus('🦊 MetaMask phone connected ✓');
  }
});

modal.subscribeEvents(() => syncWallet());
window.reownModal = modal;
window.reownConnect = connectReown;
window.addEventListener('load', syncWallet);
setTimeout(syncWallet, 1500);
