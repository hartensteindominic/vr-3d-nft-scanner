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
    description: 'Connect MetaMask on your phone by scanning the QR code.',
    url: 'https://hartensteindominic.github.io/vr-3d-nft-scanner/',
    icons: []
  },
  features: { analytics: false, email: false, socials: [] }
});

function syncWallet() {
  try {
    const connected = modal.getIsConnected();
    const address = modal.getAddress();
    if (connected && address) {
      window.walletProvider = modal.getWalletProvider?.() || null;
      window.hyperstreamSetWallet?.(address);
    }
  } catch (e) { console.debug('Wallet state not ready', e); }
}

async function connectReown() {
  document.getElementById('qrWrap').hidden = false;
  document.getElementById('status').textContent = 'Scan the QR with MetaMask on your phone…';
  modal.open({ view: 'Connect', namespace: 'eip155' });
}

modal.subscribeProvider(({ provider, address, isConnected, error }) => {
  if (error) {
    document.getElementById('status').textContent = 'Wallet connection error. Try scanning the QR again.';
    document.getElementById('status').className = 'status error';
    return;
  }
  if (isConnected && provider && address) {
    window.walletProvider = provider;
    window.hyperstreamSetWallet?.(address);
  }
});

modal.subscribeEvents(() => syncWallet());
window.reownModal = modal;
window.reownConnect = connectReown;
window.addEventListener('load', syncWallet);
setTimeout(syncWallet, 1500);
