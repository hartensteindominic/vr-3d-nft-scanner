/* ============================================================
   NEXUS NFT v2 — Application logic
   ============================================================ */
'use strict';

/* ---------------- State ---------------- */
const App = {
    filter: 'all',
    search: '',
    sort: 'featured',
    mintMode: 'real',           // 'real' (Sepolia) | 'demo'
    mintedBase: 6842,
    mintedLocal: 0,
    stakedNFTs: 0,
    stakedRewards: 0,
    owned: [],                  // purchased / minted items
    txs: [],                    // portfolio tx history
    votes: {},
    favorites: new Set(),
    selectedNFT: null,
    selectedAuction: null,
    cmdkIndex: 0,
    cmdkItems: [],
};

const $ = (id) => document.getElementById(id);
const fmtEth = (v) => 'Ξ ' + Number(v).toFixed(v >= 10 ? 1 : v >= 1 ? 2 : 4);
const fmtUsd = (eth) => {
    const usd = eth * Wallet.state.ethPriceUsd;
    return usd > 0 && usd < 1 ? '$' + usd.toFixed(2) : '$' + Math.round(usd).toLocaleString();
};

/* ---------------- Persistence ---------------- */
function saveState() {
    try {
        localStorage.setItem('nexus_v2', JSON.stringify({
            mintedLocal: App.mintedLocal,
            stakedNFTs: App.stakedNFTs,
            stakedRewards: App.stakedRewards,
            owned: App.owned,
            txs: App.txs.slice(0, 100),
            votes: App.votes,
            favorites: [...App.favorites],
        }));
    } catch (e) { /* storage unavailable */ }
}
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem('nexus_v2') || '{}');
        App.mintedLocal = s.mintedLocal || 0;
        App.stakedNFTs = s.stakedNFTs || 0;
        App.stakedRewards = s.stakedRewards || 0;
        App.owned = s.owned || [];
        App.txs = s.txs || [];
        App.votes = s.votes || {};
        App.favorites = new Set(s.favorites || []);
    } catch (e) { /* fresh state */ }
}

function recordTx(type, item, amountEth, hash) {
    App.txs.unshift({
        type, item, amountEth,
        hash: hash || null,
        addr: Wallet.state.address || 'guest',
        time: new Date().toISOString(),
    });
    saveState();
    renderPortfolio();
    addActivity('✅', type, item, amountEth, true);
}

/* ---------------- Toasts ---------------- */
function toast(msg, type) {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '');
    t.textContent = msg;
    $('toastContainer').appendChild(t);
    setTimeout(() => t.parentNode && t.parentNode.removeChild(t), 3900);
}

/* ---------------- Tx status modal ---------------- */
function showTxModal(html) {
    $('txStatusBody').innerHTML = html;
    $('txModal').classList.add('active');
}
function txPending(label) {
    showTxModal(`
        <div class="tx-status">
            <div class="tx-spinner"></div>
            <h3>${label}</h3>
            <p style="color:var(--muted); font-size:0.8rem;">Confirm in your wallet…</p>
        </div>`);
}
function txConfirming(hash) {
    showTxModal(`
        <div class="tx-status">
            <div class="tx-spinner"></div>
            <h3>Transaction Submitted</h3>
            <p style="color:var(--muted); font-size:0.8rem;">Waiting for Sepolia confirmation…</p>
            <a href="${Wallet.txUrl(hash)}" target="_blank" rel="noopener" class="btn btn-outline" style="display:inline-block; margin-top:1rem; text-decoration:none; font-size:0.75rem;">View on Etherscan ↗</a>
        </div>`);
}
function txSuccess(hash, msg) {
    showTxModal(`
        <div class="tx-status">
            <div class="tx-check">✓</div>
            <h3>${msg}</h3>
            ${hash ? `<a href="${Wallet.txUrl(hash)}" target="_blank" rel="noopener" class="btn btn-outline" style="display:inline-block; margin-top:1rem; text-decoration:none; font-size:0.75rem;">View on Etherscan ↗</a>` : ''}
            <button class="btn btn-primary" style="width:100%; margin-top:1rem;" onclick="closeModal('txModal')">Done</button>
        </div>`);
}
function txError(msg) {
    showTxModal(`
        <div class="tx-status">
            <div class="tx-fail">✕</div>
            <h3>Transaction Failed</h3>
            <p style="color:var(--muted); font-size:0.78rem; margin-top:0.4rem;">${msg}</p>
            <button class="btn btn-ghost" style="width:100%; margin-top:1rem;" onclick="closeModal('txModal')">Close</button>
        </div>`);
}
function closeModal(id) { $(id).classList.remove('active'); }

/* ---------------- Explore / Marketplace ---------------- */
function visibleNFTs() {
    let list = NFTS.filter((n) => App.filter === 'all' || n.category === App.filter);
    if (App.search) {
        const q = App.search.toLowerCase();
        list = list.filter((n) => n.name.toLowerCase().includes(q) || n.collection.toLowerCase().includes(q) || n.creator.toLowerCase().includes(q));
    }
    const rarityRank = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
    switch (App.sort) {
        case 'price-asc': list = [...list].sort((a, b) => a.price - b.price); break;
        case 'price-desc': list = [...list].sort((a, b) => b.price - a.price); break;
        case 'rarity': list = [...list].sort((a, b) => rarityRank[b.rarity] - rarityRank[a.rarity]); break;
        case 'likes': list = [...list].sort((a, b) => b.likes - a.likes); break;
        default: break;
    }
    return list;
}

function renderNFTs() {
    const list = visibleNFTs();
    $('nftGrid').innerHTML = list.length ? list.map((nft) => {
        const fav = App.favorites.has(nft.id);
        return `
        <div class="nft-card glass tilt-card" onclick="openNFTDetail(${nft.id})">
            <div class="nft-image" style="background:${nft.gradient};">
                <button class="fav-btn ${fav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFav(${nft.id})" title="Watchlist">${fav ? '♥' : '♡'}</button>
                <span class="emoji">${nft.image}</span>
                <span class="rarity-badge rarity-${nft.rarity.toLowerCase()}">${nft.rarity}</span>
            </div>
            <div class="nft-info">
                <div class="nft-name">${nft.name}</div>
                <div class="nft-collection">${nft.collection} · by ${nft.creator}</div>
                <div class="nft-price-row">
                    <span class="nft-price">${fmtEth(nft.price)} <span>(${fmtUsd(nft.price)})</span></span>
                    <button class="mini-btn" onclick="event.stopPropagation(); quickBuy(${nft.id})">Buy</button>
                </div>
            </div>
        </div>`;
    }).join('') : `<div class="empty-state">No NFTs match your search. <button class="mini-btn" onclick="clearSearch()">Reset</button></div>`;
    bindTilt();
}

function clearSearch() {
    App.search = '';
    $('exploreSearch').value = '';
    renderNFTs();
}

function toggleFav(id) {
    if (App.favorites.has(id)) { App.favorites.delete(id); toast('💔 Removed from watchlist'); }
    else { App.favorites.add(id); toast('💗 Added to watchlist'); }
    saveState();
    renderNFTs();
}

/* ---------------- NFT detail & demo checkout ---------------- */
function openNFTDetail(id) {
    const nft = NFTS.find((n) => n.id === id);
    if (!nft) return;
    App.selectedNFT = nft;
    $('detailName').textContent = nft.name;
    $('detailContent').innerHTML = `
        <div style="display:flex; gap:1rem; align-items:center; margin-bottom:1rem;">
            <div style="width:96px; height:96px; border-radius:14px; flex-shrink:0; background:${nft.gradient}; display:flex; align-items:center; justify-content:center; font-size:2.8rem;">${nft.image}</div>
            <div>
                <div style="font-weight:700;">${nft.name}</div>
                <div style="font-size:0.72rem; color:var(--muted);">${nft.collection} · ${nft.rarity}</div>
                <div style="font-size:0.7rem; color:var(--muted);">Creator: ${nft.creator} · ♥ ${nft.likes}</div>
            </div>
        </div>
        <div class="tx-detail"><span>Price</span><span>${fmtEth(nft.price)}</span></div>
        <div class="tx-detail"><span>USD Value</span><span>${fmtUsd(nft.price)}</span></div>
        <div class="tx-detail"><span>Owner</span><span>${nft.owner}</span></div>
        <div class="tx-detail"><span>Rarity</span><span>${nft.rarity}</span></div>
        <div class="tx-detail"><span>Category</span><span>${nft.category}</span></div>
        <div class="tx-detail"><span>Token ID</span><span>#${String(nft.id).padStart(4, '0')}</span></div>
        <p style="font-size:0.68rem; color:var(--muted); margin-top:0.8rem;">Demo listing — checkout runs on a local ledger. Real on-chain action lives in the Mint Studio (Sepolia).</p>`;
    $('nftModal').classList.add('active');
}

function quickBuy(id) {
    App.selectedNFT = NFTS.find((n) => n.id === id);
    buySelected();
}

function buySelected() {
    const nft = App.selectedNFT;
    if (!nft) return;
    if (!requireWallet()) return;
    if (Wallet.state.balanceEth < nft.price) { toast('❌ Insufficient balance', 'error'); return; }
    Wallet.state.balanceEth -= nft.price;
    App.owned.unshift({ ...nft, acquiredAt: Date.now(), via: 'buy' });
    recordTx('Buy', nft.name, nft.price);
    toast(`✅ Purchased ${nft.name} for ${fmtEth(nft.price)} (demo checkout)`);
    closeModal('nftModal');
    updateWalletUI();
    updateStats();
}

/* ---------------- Collections ---------------- */
function renderCollections() {
    $('collectionsBody').innerHTML = COLLECTIONS.map((c, i) => `
        <div class="collection-row glass" onclick="filterByCollection('${c.name}')">
            <span class="rank">${String(i + 1).padStart(2, '0')}</span>
            <div class="c-id">
                <div class="c-thumb" style="background:${c.gradient};">${c.thumb}</div>
                <div class="c-name">${c.name} ${c.verified ? '<span class="verified">✓</span>' : ''}<small style="display:block; color:var(--muted); font-weight:400; font-size:0.66rem;">${c.items.toLocaleString()} items</small></div>
            </div>
            <div class="c-num"><small>Floor</small>${fmtEth(c.floor)}</div>
            <div class="c-num c-hide-m"><small>Volume</small>${c.volume.toLocaleString()} Ξ</div>
            <div class="c-change" style="color:${c.change >= 0 ? 'var(--success)' : 'var(--danger)'}">${c.change >= 0 ? '▲' : '▼'} ${Math.abs(c.change).toFixed(1)}%</div>
            <canvas class="spark" data-spark="${c.spark.join(',')}" data-color="${c.change >= 0 ? '#22c55e' : '#ef4444'}"></canvas>
        </div>`).join('');
    drawSparks();
}

function drawSparks() {
    document.querySelectorAll('canvas.spark').forEach((cv) => {
        const data = cv.dataset.spark.split(',').map(Number);
        const color = cv.dataset.color;
        const dpr = window.devicePixelRatio || 1;
        const w = cv.clientWidth, h = cv.clientHeight;
        if (!w || !h) return;
        cv.width = w * dpr; cv.height = h * dpr;
        const ctx = cv.getContext('2d');
        ctx.scale(dpr, dpr);
        const min = Math.min(...data), max = Math.max(...data);
        const px = (i) => (i / (data.length - 1)) * (w - 4) + 2;
        const py = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
        ctx.beginPath();
        data.forEach((v, i) => i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v)));
        ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.lineTo(px(data.length - 1), h); ctx.lineTo(px(0), h); ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, color + '44'); grad.addColorStop(1, color + '00');
        ctx.fillStyle = grad; ctx.fill();
    });
}

function filterByCollection(name) {
    App.search = name;
    $('exploreSearch').value = name;
    renderNFTs();
    document.getElementById('explore').scrollIntoView({ behavior: 'smooth' });
}

/* ---------------- Auctions ---------------- */
function renderAuctions() {
    $('auctionGrid').innerHTML = AUCTIONS.map((a) => {
        const left = Math.max(0, a.endTime - Date.now());
        const h = Math.floor(left / 3600e3), m = Math.floor((left % 3600e3) / 60e3), s = Math.floor((left % 60e3) / 1e3);
        const timeStr = [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
        return `
        <div class="auction-card glass">
            <div class="auction-head">
                <div class="a-thumb" style="background:${a.gradient};">${a.image}</div>
                <div>
                    <strong>${a.name}</strong>
                    <div style="font-size:0.68rem; color:var(--muted);">${a.collection} · ${a.bids} bids · ${a.rarity}</div>
                </div>
            </div>
            <div class="timer">⏱ ${timeStr}</div>
            <div class="bid-info">
                <span>Current Bid: <strong>${fmtEth(a.currentBid)}</strong></span>
                <span>Min next: ${fmtEth(a.minBid)}</span>
            </div>
            <button class="btn btn-accent" style="width:100%; margin-top:0.75rem; padding:0.55rem;" onclick="openBidModal(${a.id})">Place Bid</button>
        </div>`;
    }).join('');
}

function openBidModal(id) {
    const a = AUCTIONS.find((x) => x.id === id);
    if (!a) return;
    App.selectedAuction = a;
    $('bidName').textContent = a.name;
    $('bidInfo').innerHTML = `
        <div class="tx-detail"><span>Current bid</span><span>${fmtEth(a.currentBid)}</span></div>
        <div class="tx-detail"><span>Minimum next bid</span><span>${fmtEth(a.minBid)}</span></div>
        <div class="tx-detail"><span>Total bids</span><span>${a.bids}</span></div>`;
    $('bidInput').value = a.minBid.toFixed(2);
    $('bidModal').classList.add('active');
}

function confirmBid() {
    const a = App.selectedAuction;
    if (!a) return;
    if (!requireWallet()) return;
    const amt = parseFloat($('bidInput').value);
    if (!amt || amt < a.minBid) { toast(`⚠️ Bid must be at least ${fmtEth(a.minBid)}`, 'warn'); return; }
    if (Wallet.state.balanceEth < amt) { toast('❌ Insufficient balance', 'error'); return; }
    Wallet.state.balanceEth -= amt;
    a.currentBid = amt;
    a.minBid = amt * 1.1;
    a.bids += 1;
    recordTx('Bid', a.name, amt);
    toast(`✅ Bid placed on ${a.name}: ${fmtEth(amt)}`);
    closeModal('bidModal');
    updateWalletUI();
    renderAuctions();
}

/* ---------------- Mint Studio ---------------- */
function setMintMode(mode) {
    App.mintMode = mode;
    $('modeReal').classList.toggle('active', mode === 'real');
    $('modeDemo').classList.toggle('active', mode === 'demo');
    $('mintModeNote').textContent = mode === 'real'
        ? 'Real transaction on Ethereum Sepolia testnet via the HyperStream contract. Uses free test ETH — never send mainnet funds.'
        : 'Demo mode — mints locally with a simulated receipt. No wallet or gas needed.';
    updateMintMeta();
}

function updateMintMeta() {
    const qty = Math.max(1, Math.min(10, parseInt($('mintQty').value) || 1));
    const priceEth = CHAIN.mintPriceEth * qty;
    const gas = Wallet.state.gasGwei;
    const gasEth = gas ? (gas * 150000) / 1e9 : null;
    $('mintGas').textContent = gas ? gas.toFixed(2) + ' gwei' : (App.mintMode === 'real' && Wallet.state.connected && !Wallet.state.simulated ? 'fetching…' : 'n/a (demo)');
    $('mintCostEth').textContent = fmtEth(priceEth + (gasEth || 0));
    $('mintCostUsd').textContent = fmtUsd(priceEth + (gasEth || 0));
    $('mintProgress').textContent = (App.mintedBase + App.mintedLocal).toLocaleString() + ' / 10,000 minted';
    $('mintProgressBar').style.width = ((App.mintedBase + App.mintedLocal) / 100) + '%';
}

async function mintNFT() {
    const qty = Math.max(1, Math.min(10, parseInt($('mintQty').value) || 1));

    if (App.mintMode === 'demo' || Wallet.state.simulated) {
        if (!requireWallet()) return;
        const cost = CHAIN.mintPriceEth * qty;
        Wallet.state.balanceEth = Math.max(0, Wallet.state.balanceEth - cost);
        finishMint(qty, null, cost);
        return;
    }

    if (!Wallet.state.connected) { if (!requireWallet()) return; }
    txPending('Minting ' + qty + ' NEXUS Genesis NFT' + (qty > 1 ? 's' : ''));
    try {
        const { hash, tx } = await Wallet.mintOnChain(qty);
        txConfirming(hash);
        recordTx('Mint', qty + '× NEXUS Genesis', CHAIN.mintPriceEth * qty, hash);
        await tx.wait();
        await Wallet.refreshBalance();
        finishMint(qty, hash, CHAIN.mintPriceEth * qty);
    } catch (err) {
        txError(err.message || 'Mint failed');
    }
}

function finishMint(qty, hash, costEth) {
    App.mintedLocal += qty;
    for (let i = 0; i < qty; i++) {
        const idx = App.mintedBase + App.mintedLocal - i;
        App.owned.unshift({
            id: 10000 + idx, name: 'NEXUS Genesis #' + String(idx).padStart(4, '0'),
            collection: 'NEXUS Genesis', category: 'art',
            rarity: ['Common', 'Rare', 'Epic', 'Legendary'][Math.min(3, Math.floor(Math.random() * 4))],
            price: 0, image: '✨', gradient: 'linear-gradient(135deg,#00f0ff,#a855f7,#ff00e5)',
            owner: Wallet.shortAddr(Wallet.state.address), creator: 'You',
            likes: 0, acquiredAt: Date.now(), via: 'mint',
        });
    }
    if (!hash) recordTx('Mint', qty + '× NEXUS Genesis', costEth);
    saveState();
    updateMintMeta();
    updateStats();
    updateWalletUI();
    renderPortfolio();
    if (hash) txSuccess(hash, qty + ' NFT' + (qty > 1 ? 's' : '') + ' Minted!');
    else toast(`✅ Minted ${qty} NFT${qty > 1 ? 's' : ''} (demo)`);
}

/* ---------------- Portfolio ---------------- */
function renderPortfolio() {
    const ownedVal = App.owned.reduce((s, n) => s + (n.price || 0), 0);
    $('pfOwned').textContent = App.owned.length;
    $('pfValue').textContent = fmtEth(ownedVal);
    $('pfStaked').textContent = App.stakedNFTs;
    $('pfTxCount').textContent = App.txs.length;

    const ownedGrid = $('ownedGrid');
    if (App.owned.length) {
        ownedGrid.style.display = '';
        $('portfolioEmpty').style.display = 'none';
        ownedGrid.innerHTML = App.owned.slice(0, 12).map((n) => `
            <div class="nft-card glass">
                <div class="nft-image" style="background:${n.gradient};">
                    <span class="emoji">${n.image}</span>
                    <span class="rarity-badge rarity-${n.rarity.toLowerCase()}">${n.rarity}</span>
                </div>
                <div class="nft-info">
                    <div class="nft-name">${n.name}</div>
                    <div class="nft-collection">Acquired via ${n.via}</div>
                </div>
            </div>`).join('');
    } else {
        ownedGrid.innerHTML = '';
        $('portfolioEmpty').style.display = '';
    }

    $('txTableBody').innerHTML = App.txs.length ? App.txs.slice(0, 25).map((t) => `
        <tr>
            <td><span class="tx-pill ${t.type.toLowerCase()}">${t.type}</span></td>
            <td style="font-family:var(--sans);">${t.item}</td>
            <td>${t.amountEth ? fmtEth(t.amountEth) : '—'}</td>
            <td>${t.hash
                ? `<a href="${Wallet.txUrl(t.hash)}" target="_blank" rel="noopener">${t.hash.slice(0, 10)}… ↗</a>`
                : '<span style="color:var(--muted);">local</span>'}</td>
            <td style="color:var(--muted);">${new Date(t.time).toLocaleTimeString()}</td>
        </tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:1.5rem;">No activity yet — connect a wallet and mint or buy something.</td></tr>';
}

/* ---------------- Activity feed ---------------- */
function randomTrader() { return RANDOM_TRADERS[Math.floor(Math.random() * RANDOM_TRADERS.length)]; }
function addActivity(icon, type, msg, amtEth, mine) {
    const feed = $('activityFeed');
    if (!feed) return;
    const nft = NFTS[Math.floor(Math.random() * NFTS.length)];
    const text = typeof msg === 'string' && msg.includes('#') ? msg : (typeof msg === 'string' ? msg : nft.name);
    const el = document.createElement('div');
    el.className = 'activity-item glass';
    el.innerHTML = `
        <div class="a-icon">${icon}</div>
        <div class="a-body">
            <div><b>${type}</b> — ${text}${mine ? ' <span style="color:var(--primary);">(you)</span>' : ''}</div>
            <div class="a-sub">${mine ? Wallet.shortAddr(Wallet.state.address) || 'you' : randomTrader()} · just now</div>
        </div>
        ${amtEth ? `<div class="a-amt">${fmtEth(amtEth)}</div>` : ''}`;
    feed.prepend(el);
    while (feed.children.length > 14) feed.removeChild(feed.lastChild);
}

function seedActivity() {
    for (let i = 0; i < 7; i++) {
        const t = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
        const nft = NFTS[Math.floor(Math.random() * NFTS.length)];
        addActivity(t.icon, t.type, t.msg(nft.name), t.amt ? +(nft.price * (0.9 + Math.random() * 0.3)).toFixed(2) : 0);
    }
}
function tickActivity() {
    const t = ACTIVITY_TEMPLATES[Math.floor(Math.random() * ACTIVITY_TEMPLATES.length)];
    const nft = NFTS[Math.floor(Math.random() * NFTS.length)];
    addActivity(t.icon, t.type, t.msg(nft.name), t.amt ? +(nft.price * (0.9 + Math.random() * 0.3)).toFixed(2) : 0);
}

/* ---------------- Staking ---------------- */
function stakeNFT() {
    if (!requireWallet()) return;
    const amount = parseInt($('stakeAmount').value) || 1;
    if (amount < 1) { toast('⚠️ Enter a valid amount', 'warn'); return; }
    App.stakedNFTs += amount;
    App.stakedRewards += amount * 0.05;
    recordTx('Stake', amount + ' NFTs', amount * 0.85);
    toast(`✅ Staked ${amount} NFT${amount > 1 ? 's' : ''}`);
    updateStats();
    saveState();
}
function unstakeNFT() {
    if (App.stakedNFTs === 0) { toast('⚠️ No NFTs staked', 'warn'); return; }
    const count = App.stakedNFTs;
    const value = App.stakedNFTs * 0.85 + App.stakedRewards;
    App.stakedNFTs = 0;
    App.stakedRewards = 0;
    Wallet.state.balanceEth += value;
    recordTx('Unstake', count + ' NFTs', value);
    toast(`✅ Unstaked ${count} NFTs, claimed ${fmtEth(value)}`);
    updateStats();
    updateWalletUI();
    saveState();
}

/* ---------------- Governance ---------------- */
function renderProposals() {
    $('governanceList').innerHTML = PROPOSALS.map((p) => {
        const total = p.votesFor + p.votesAgainst;
        const forPct = total ? (p.votesFor / total) * 100 : 0;
        const voted = App.votes[p.id];
        return `
        <div class="proposal-card glass">
            <div class="proposal-header">
                <span class="proposal-title">#${p.id} — ${p.title}</span>
                <span class="proposal-status status-${p.status}">${p.status}${p.status === 'active' ? ' · ' + p.ends : ''}</span>
            </div>
            <div class="progress-bar"><div class="fill fill-for" style="width:${forPct}%;"></div></div>
            <div style="display:flex; justify-content:space-between; font-size:0.68rem; color:var(--muted);">
                <span>For: ${p.votesFor} (${forPct.toFixed(1)}%)</span>
                <span>Against: ${p.votesAgainst} (${(100 - forPct).toFixed(1)}%)</span>
            </div>
            ${p.status === 'active' && !voted ? `
            <div class="vote-bar">
                <button class="vote-btn for" onclick="vote(${p.id}, 'for')">👍 Vote For</button>
                <button class="vote-btn against" onclick="vote(${p.id}, 'against')">👎 Vote Against</button>
            </div>` : voted ? `<div style="font-size:0.7rem; color:var(--primary); font-weight:600;">✓ You voted: ${voted}</div>` : ''}
        </div>`;
    }).join('');
}
function vote(id, type) {
    if (!requireWallet()) return;
    if (App.votes[id]) { toast('⚠️ Already voted on this proposal', 'warn'); return; }
    const p = PROPOSALS.find((x) => x.id === id);
    if (!p) return;
    App.votes[id] = type;
    type === 'for' ? p.votesFor++ : p.votesAgainst++;
    recordTx('Vote', '#' + id, 0);
    toast(`✅ Voted ${type} on proposal #${id}`);
    renderProposals();
    saveState();
}

/* ---------------- Leaderboard ---------------- */
function renderLeaderboard() {
    $('leaderboardBody').innerHTML = LEADERBOARD.map((t, i) => `
        <div class="lb-row glass">
            <span class="lb-rank">${i + 1}</span>
            <div class="lb-name">${t.name}<small>${t.addr}</small></div>
            <span class="lb-vol">${t.volume.toFixed(1)} Ξ</span>
            <span class="lb-trades">${t.trades} trades</span>
        </div>`).join('');
}

/* ---------------- GitHub ---------------- */
async function connectGitHub() {
    const username = $('githubUsername').value.trim();
    if (!username) { toast('⚠️ Enter a GitHub username', 'warn'); return; }
    toast('🐙 Fetching GitHub data…');
    try {
        const [pRes, rRes] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`),
            fetch(`https://api.github.com/users/${username}/repos?sort=stars&per_page=8`),
        ]);
        if (!pRes.ok) throw new Error('not found');
        const profile = await pRes.json();
        const repos = await rRes.json();
        $('githubProfile').innerHTML = `
            <div class="gh-header">
                <img class="gh-avatar" src="${profile.avatar_url}" alt="${profile.login}" onerror="this.style.display='none'">
                <div>
                    <div class="gh-name">${profile.name || profile.login}</div>
                    <div class="gh-bio">@${profile.login}${profile.bio ? ' · ' + profile.bio : ''}</div>
                </div>
            </div>
            <div class="gh-stats">
                <span><strong>${profile.public_repos}</strong> repos</span>
                <span><strong>${profile.followers}</strong> followers</span>
                <span><strong>${profile.following}</strong> following</span>
            </div>
            <h4 style="font-size:0.88rem; margin-bottom:0.4rem; color:var(--muted);">Top Repositories</h4>
            <ul class="gh-repos">${(repos || []).map((r) => `
                <li><span class="repo-name">${r.name}</span><span class="repo-stars">⭐ ${r.stargazers_count || 0}</span></li>`).join('') || '<li style="justify-content:center; color:var(--muted);">No repos found</li>'}
            </ul>
            <a href="${profile.html_url}" target="_blank" rel="noopener" style="display:inline-block; margin-top:0.5rem; color:var(--primary); font-size:0.8rem;">View Profile →</a>`;
        recordTx('GitHub', 'Connected @' + username, 0);
        toast(`✅ Connected to GitHub: @${username}`);
    } catch (e) {
        toast('❌ GitHub user not found or rate limited', 'error');
        $('githubProfile').innerHTML = '';
    }
}

/* ---------------- Wallet UI ---------------- */
function requireWallet() {
    if (Wallet.state.connected) return true;
    toast('⚠️ Connect your wallet first', 'warn');
    $('walletModal').classList.add('active');
    return false;
}

function updateWalletUI() {
    const s = Wallet.state;
    const btn = $('walletBtn');
    const badge = $('networkBadge');
    if (s.connected) {
        btn.classList.add('connected');
        $('walletStatus').textContent = Wallet.shortAddr(s.address);
        $('walletModalContent').style.display = 'none';
        $('walletConnectedInfo').style.display = 'block';
        $('walletAddress').textContent = Wallet.shortAddr(s.address);
        $('walletBalance').textContent = s.balanceEth.toFixed(4) + ' ETH' + (s.simulated ? ' (demo)' : '');
        $('walletNetwork').textContent = s.simulated ? 'Simulated' : (s.chainId === CHAIN.id ? 'Sepolia' : 'Chain ' + s.chainId);
        $('walletChainId').textContent = s.chainId || '—';
    } else {
        btn.classList.remove('connected');
        $('walletStatus').textContent = 'Connect Wallet';
        $('walletModalContent').style.display = 'block';
        $('walletConnectedInfo').style.display = 'none';
    }

    badge.classList.remove('on-sepolia', 'wrong-chain');
    if (s.connected && !s.simulated) {
        if (s.chainId === CHAIN.id) { badge.classList.add('on-sepolia'); $('networkLabel').textContent = 'Sepolia'; }
        else { badge.classList.add('wrong-chain'); $('networkLabel').textContent = 'Switch to Sepolia'; }
    } else {
        $('networkLabel').textContent = s.simulated ? 'Demo Mode' : 'Sepolia Testnet';
    }
}

async function connectReal() {
    const ok = await Wallet.connect();
    if (ok) {
        closeModal('walletModal');
        toast('✅ Wallet connected: ' + Wallet.shortAddr(Wallet.state.address));
        if (Wallet.state.chainId !== CHAIN.id) {
            toast('⛓️ Switching to Sepolia…');
            await Wallet.ensureSepolia();
        }
        updateWalletUI();
        updateMintMeta();
    }
}
function connectDemo() {
    Wallet.connectSimulated();
    closeModal('walletModal');
    updateWalletUI();
    updateMintMeta();
}
function disconnectWallet() {
    Wallet.disconnect();
    updateWalletUI();
}

/* ---------------- Ticker / stats ---------------- */
async function fetchEthPrice() {
    try {
        const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true');
        const j = await r.json();
        if (j.ethereum) {
            Wallet.state.ethPriceUsd = j.ethereum.usd;
            Wallet.state.ethChange = j.ethereum.usd_24h_change;
        }
    } catch (e) { /* keep fallback */ }
    renderTicker();
}

function renderTicker() {
    const p = Wallet.state.ethPriceUsd;
    const ch = Wallet.state.ethChange;
    const chHtml = ch == null ? '' : `<span class="${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '▲' : '▼'}${Math.abs(ch).toFixed(2)}%</span>`;
    const gas = Wallet.state.gasGwei ? Wallet.state.gasGwei.toFixed(1) + ' gwei' : '—';
    const items = [
        `<span class="tick">ETH/USD <b>$${p.toLocaleString()}</b> ${chHtml}</span>`,
        `<span class="tick">GAS <b>${gas}</b></span>`,
        `<span class="tick">FLOOR <b>Ξ 0.55</b></span>`,
        `<span class="tick">24H VOL <b>Ξ 12,840</b></span>`,
        `<span class="tick">NETWORK <b>Sepolia</b></span>`,
        ...COLLECTIONS.slice(0, 5).map((c) => `<span class="tick">${c.name} <b>Ξ ${c.floor}</b> <span class="${c.change >= 0 ? 'up' : 'down'}">${c.change >= 0 ? '▲' : '▼'}${Math.abs(c.change).toFixed(1)}%</span></span>`),
    ];
    $('tickerTrack').innerHTML = items.join('') + items.join('');
}

function updateStats() {
    animateNum('statVolume', 2.4 + Math.random() * 0.1, (v) => '$' + v.toFixed(2) + 'B');
    $('statNFTs').textContent = (842000 + App.mintedLocal).toLocaleString();
    $('statUsers').textContent = (1200000 + Math.floor(Math.random() * 120)).toLocaleString();
    $('statFloor').textContent = 'Ξ ' + (0.55 + App.mintedLocal * 0.0001).toFixed(2);
    $('stakedCount').textContent = App.stakedNFTs;
    $('stakedRewards').textContent = App.stakedRewards.toFixed(4);
    $('yourStakedNFTs').textContent = App.stakedNFTs;
    $('yourStakeValue').textContent = (App.stakedNFTs * 0.85).toFixed(2);
    updateMintMeta();
}

function animateNum(id, target, fmt) {
    const el = $(id);
    if (el) el.textContent = fmt(target);
}

/* ---------------- Command palette ---------------- */
function cmdkEntries() {
    const nav = [
        { icon: '🛒', label: 'Explore Marketplace', hint: 'goto', run: () => scrollToId('explore') },
        { icon: '🏆', label: 'Top Collections', hint: 'goto', run: () => scrollToId('collections') },
        { icon: '🔨', label: 'Live Auctions', hint: 'goto', run: () => scrollToId('auctions') },
        { icon: '✨', label: 'Mint Studio', hint: 'goto', run: () => scrollToId('mint') },
        { icon: '📈', label: 'Staking Dashboard', hint: 'goto', run: () => scrollToId('staking') },
        { icon: '🗳️', label: 'Governance', hint: 'goto', run: () => scrollToId('governance') },
        { icon: '👤', label: 'Portfolio', hint: 'goto', run: () => scrollToId('portfolio') },
        { icon: '🦊', label: 'Connect Wallet', hint: 'action', run: () => $('walletModal').classList.add('active') },
    ];
    const nfts = NFTS.map((n) => ({ icon: n.image, label: n.name, hint: fmtEth(n.price), run: () => openNFTDetail(n.id) }));
    return [...nav, ...nfts];
}
function scrollToId(id) { document.getElementById(id).scrollIntoView({ behavior: 'smooth' }); }

function openCmdk() {
    $('cmdk').classList.add('active');
    $('cmdkInput').value = '';
    renderCmdk('');
    setTimeout(() => $('cmdkInput').focus(), 50);
}
function renderCmdk(q) {
    const query = q.toLowerCase();
    App.cmdkItems = cmdkEntries().filter((e) => !query || e.label.toLowerCase().includes(query)).slice(0, 9);
    App.cmdkIndex = 0;
    $('cmdkResults').innerHTML = App.cmdkItems.map((e, i) => `
        <button class="cmdk-item ${i === 0 ? 'selected' : ''}" data-i="${i}">
            <span class="ck-icon">${e.icon}</span> ${e.label} <small>${e.hint}</small>
        </button>`).join('') || '<div style="padding:1rem; color:var(--muted); font-size:0.8rem;">No results</div>';
    $('cmdkResults').querySelectorAll('.cmdk-item').forEach((el) => {
        el.addEventListener('click', () => runCmdk(parseInt(el.dataset.i)));
    });
}
function runCmdk(i) {
    const item = App.cmdkItems[i];
    if (!item) return;
    closeModal('cmdk');
    item.run();
}
function moveCmdk(dir) {
    if (!App.cmdkItems.length) return;
    App.cmdkIndex = (App.cmdkIndex + dir + App.cmdkItems.length) % App.cmdkItems.length;
    $('cmdkResults').querySelectorAll('.cmdk-item').forEach((el, i) => el.classList.toggle('selected', i === App.cmdkIndex));
}

/* ---------------- Tilt cards ---------------- */
function bindTilt() {
    document.querySelectorAll('.tilt-card').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;
            card.style.transform = `translateY(-6px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
}

/* ---------------- Cursor glow ---------------- */
function initCursorGlow() {
    const glow = $('cursor-glow');
    if (!glow || window.matchMedia('(pointer: coarse)').matches) { if (glow) glow.style.display = 'none'; return; }
    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    }, { passive: true });
}

/* ---------------- Reveal on scroll ---------------- */
function initReveal() {
    const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', () => {
    loadState();

    renderNFTs();
    renderCollections();
    renderAuctions();
    renderProposals();
    renderLeaderboard();
    renderPortfolio();
    renderTicker();
    seedActivity();
    updateStats();
    updateWalletUI();
    setMintMode('real');
    initReveal();
    initCursorGlow();

    fetchEthPrice();
    setInterval(fetchEthPrice, 60000);

    Wallet.on('change', updateWalletUI);
    Wallet.on('toast', ({ msg, type }) => toast(msg, type));

    // Filters
    document.querySelectorAll('#filterTabs .filter-tab').forEach((tab) => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('#filterTabs .filter-tab').forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            App.filter = tab.dataset.filter;
            renderNFTs();
        });
    });
    $('exploreSearch').addEventListener('input', (e) => { App.search = e.target.value; renderNFTs(); });
    $('sortSelect').addEventListener('change', (e) => { App.sort = e.target.value; renderNFTs(); });
    $('mintQty').addEventListener('input', updateMintMeta);
    $('networkBadge').addEventListener('click', async () => {
        if (Wallet.state.connected && !Wallet.state.simulated && Wallet.state.chainId !== CHAIN.id) {
            await Wallet.ensureSepolia();
        }
    });

    // Staking calculator
    const calc = () => {
        const v = parseInt($('calcStake').value) || 10;
        const yearly = v * 0.185;
        $('calcReward').textContent = yearly.toFixed(3);
        $('calcDaily').textContent = (yearly / 365).toFixed(6);
    };
    $('calcStake').addEventListener('input', calc);
    calc();

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach((ov) => {
        ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.remove('active'); });
    });

    // Command palette events
    $('searchTrigger').addEventListener('click', openCmdk);
    $('cmdkInput').addEventListener('input', (e) => renderCmdk(e.target.value));
    $('cmdkInput').addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); moveCmdk(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveCmdk(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); runCmdk(App.cmdkIndex); }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmdk(); }
        if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach((m) => m.classList.remove('active'));
    });

    // Loops
    setInterval(renderAuctions, 1000);
    setInterval(tickActivity, 6000);
    setInterval(() => { Wallet.refreshGas().then(updateMintMeta); }, 20000);
    setInterval(updateStats, 9000);
    window.addEventListener('resize', drawSparks);

    console.log('🚀 NEXUS NFT v2 loaded — 3D marketplace · auctions · mint · staking · DAO · Sepolia minting');
});
