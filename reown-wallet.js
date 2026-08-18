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
    description: 'HyperStream 3D NFT Studio',
    url: 'https://hartensteindominic.github.io',
    icons: []
  },
  features: { analytics: false, email: false, socials: [] }
});

function showWallet(address) {
  const el = document.getElementById('wallet');
  const status = document.getElementById('status');
  if (address) {
    el.textContent = ' ' + address.slice(0, 8) + '…' + address.slice(-6);
    status.textContent = '🦊 Wallet connected ✓';
    status.className = 'status';
  }
}

async function connectReown() {
  const btn = document.getElementById('walletBtn');
  btn.disabled = true;
  try {
    document.getElementById('status').textContent = 'Opening secure wallet connection…';
    modal.open({ view: 'Connect', namespace: 'eip155' });
  } catch (e) {
    console.error(e);
    document.getElementById('status').textContent = 'Wallet connection failed.\n' + (e.message || e);
    document.getElementById('status').className = 'status error';
  } finally {
    btn.disabled = false;
  }
}

function syncWallet() {
  try {
    const connected = modal.getIsConnected();
    const address = modal.getAddress();
    if (connected && address) showWallet(address);
  } catch (e) { console.debug('Reown wallet state not ready', e); }
}

modal.subscribeProvider(({ provider, address, isConnected, error }) => {
  if (error) {
    console.error(error);
    return;
  }
  if (isConnected && provider && address) {
    window.walletProvider = provider;
    showWallet(address);
  }
});

modal.subscribeEvents(() => syncWallet());

window.reownModal = modal;
window.reownConnect = connectReown;

window.addEventListener('load', () => {
  const btn = document.getElementById('walletBtn');
  if (btn) btn.onclick = connectReown;
  syncWallet();
});

setTimeout(syncWallet, 1500);
