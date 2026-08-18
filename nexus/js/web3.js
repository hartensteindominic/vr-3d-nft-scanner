/* ============================================================
   NEXUS NFT v2 — Web3 wallet module
   Real EIP-1193 integration: injected wallets (MetaMask etc.),
   Sepolia chain detection + switching, live balance & gas,
   and on-chain mint transactions against the HyperStream contract.
   Falls back to a clearly-labelled simulated wallet when no
   provider is available, so the UI always stays explorable.
   ============================================================ */
'use strict';

const Wallet = (() => {
    const listeners = {};
    const state = {
        connected: false,
        simulated: false,
        address: '',
        balanceEth: 0,
        chainId: null,
        provider: null,   // ethers BrowserProvider
        signer: null,
        ethPriceUsd: 2100, // fallback; live price fetched in app.js
        gasGwei: null,
    };

    function on(evt, cb) { (listeners[evt] = listeners[evt] || []).push(cb); }
    function emit(evt, data) { (listeners[evt] || []).forEach((cb) => cb(data)); }

    function hasInjected() { return typeof window.ethereum !== 'undefined'; }
    function hasEthers() { return typeof window.ethers !== 'undefined'; }

    function shortAddr(addr) { return addr ? addr.slice(0, 6) + '…' + addr.slice(-4) : ''; }

    async function refreshBalance() {
        if (!state.connected || state.simulated || !state.provider || !state.address) return;
        try {
            const wei = await state.provider.getBalance(state.address);
            state.balanceEth = parseFloat(window.ethers.formatEther(wei));
        } catch (e) { /* keep last known balance */ }
    }

    async function refreshGas() {
        if (!state.provider) return null;
        try {
            const fee = await state.provider.getFeeData();
            if (fee.gasPrice) {
                state.gasGwei = parseFloat(window.ethers.formatUnits(fee.gasPrice, 'gwei'));
                return state.gasGwei;
            }
        } catch (e) { /* noop */ }
        return null;
    }

    async function ensureSepolia() {
        if (!hasInjected()) return false;
        if (state.chainId === CHAIN.id) return true;
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: CHAIN.hex }],
            });
            return true;
        } catch (err) {
            // 4902 = chain not added to wallet yet
            if (err && err.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: CHAIN.hex,
                            chainName: 'Sepolia test network',
                            nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                            rpcUrls: ['https://rpc.sepolia.org'],
                            blockExplorerUrls: [CHAIN.explorer],
                        }],
                    });
                    return true;
                } catch (addErr) { return false; }
            }
            return false;
        }
    }

    async function connect() {
        if (!hasInjected()) {
            emit('toast', { msg: 'ℹ️ No injected wallet found — opening simulated wallet', type: 'warn' });
            return connectSimulated();
        }
        if (!hasEthers()) {
            emit('toast', { msg: '❌ Web3 library failed to load — check connection', type: 'error' });
            return false;
        }
        try {
            state.provider = new window.ethers.BrowserProvider(window.ethereum);
            const accounts = await state.provider.send('eth_requestAccounts', []);
            state.signer = await state.provider.getSigner();
            state.address = accounts[0];
            const net = await state.provider.getNetwork();
            state.chainId = Number(net.chainId);
            state.connected = true;
            state.simulated = false;
            await refreshBalance();
            refreshGas();

            window.ethereum.on('accountsChanged', (accs) => {
                if (!accs.length) { disconnect(); return; }
                state.address = accs[0];
                refreshBalance().then(() => emit('change', state));
                emit('toast', { msg: '🔄 Account switched: ' + shortAddr(state.address) });
            });
            window.ethereum.on('chainChanged', (cid) => {
                state.chainId = parseInt(cid, 16);
                refreshBalance().then(() => emit('change', state));
                emit('toast', { msg: '⛓️ Network changed (chain ' + state.chainId + ')' });
            });

            emit('change', state);
            return true;
        } catch (err) {
            if (err && err.code === 4001) {
                emit('toast', { msg: '❌ Connection rejected in wallet', type: 'error' });
            } else {
                emit('toast', { msg: '❌ Wallet connection failed', type: 'error' });
            }
            return false;
        }
    }

    function connectSimulated() {
        const addr = '0x' + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        state.connected = true;
        state.simulated = true;
        state.address = addr;
        state.balanceEth = 25 + Math.random() * 75;
        state.chainId = CHAIN.id;
        state.provider = null;
        state.signer = null;
        emit('change', state);
        emit('toast', { msg: '✅ Simulated wallet connected (demo funds)' });
        return true;
    }

    function disconnect() {
        state.connected = false;
        state.simulated = false;
        state.address = '';
        state.balanceEth = 0;
        state.chainId = null;
        state.provider = null;
        state.signer = null;
        emit('change', state);
        emit('toast', { msg: '👋 Wallet disconnected' });
    }

    /**
     * Real on-chain mint on Sepolia. Tries common mint entrypoints on the
     * configured contract. Returns { hash, explorerUrl } or throws.
     */
    async function mintOnChain(quantity) {
        if (!state.connected || state.simulated || !state.signer) {
            throw new Error('Real wallet required — connect MetaMask');
        }
        const ok = await ensureSepolia();
        if (!ok) throw new Error('Please switch to the Sepolia network');

        const contract = new window.ethers.Contract(CHAIN.contract, MINT_ABI, state.signer);
        const value = window.ethers.parseEther((CHAIN.mintPriceEth * quantity).toFixed(6));

        const attempts = [
            () => contract.mint(quantity, { value }),
            () => contract.mint({ value }),
            () => contract.safeMint(state.address, { value }),
            () => contract.publicMint(quantity, { value }),
        ];
        let lastErr = null;
        for (const attempt of attempts) {
            try {
                const tx = await attempt();
                return { hash: tx.hash, tx, explorerUrl: CHAIN.explorer + '/tx/' + tx.hash };
            } catch (err) {
                lastErr = err;
                if (err && err.code === 4001) throw new Error('Transaction rejected in wallet');
                // otherwise the entrypoint likely doesn't exist — try the next one
            }
        }
        throw new Error('Mint reverted: ' + (lastErr && (lastErr.shortMessage || lastErr.reason || lastErr.message) || 'unknown error'));
    }

    function txUrl(hash) { return CHAIN.explorer + '/tx/' + hash; }
    function addressUrl(addr) { return CHAIN.explorer + '/address/' + addr; }

    return {
        state, on, emit, hasInjected, shortAddr,
        connect, connectSimulated, disconnect,
        ensureSepolia, refreshBalance, refreshGas,
        mintOnChain, txUrl, addressUrl,
    };
})();
