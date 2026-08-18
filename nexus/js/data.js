/* ============================================================
   NEXUS NFT v2 — Marketplace data layer
   Demo catalogue + generators for live-feel activity.
   ============================================================ */
'use strict';

const CATEGORIES = ['art', 'collectibles', 'gaming', 'music', 'virtual-realestate'];

const NFTS = [
    { id: 1, name: 'Neon Genesis #001', collection: 'NEXUS Genesis', category: 'art', rarity: 'Legendary', price: 2.50, image: '🌀', gradient: 'linear-gradient(135deg,#00f0ff,#a855f7,#ff00e5)', owner: '0x7a3f…9c21', creator: 'NEXUS Labs', likes: 482 },
    { id: 2, name: 'Cyber Punk #042', collection: 'CyberPunks', category: 'collectibles', rarity: 'Epic', price: 1.80, image: '🤖', gradient: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)', owner: '0x3bc2…a1f0', creator: 'PunkLabs', likes: 231 },
    { id: 3, name: 'Virtual Realm #103', collection: 'Metaverse Realms', category: 'virtual-realestate', rarity: 'Rare', price: 4.20, image: '🌐', gradient: 'linear-gradient(135deg,#0c0c1d,#1a1a3e,#2a1a4e)', owner: '0x9d7f…1be3', creator: 'RealmDAO', likes: 318 },
    { id: 4, name: 'Synthetic Wave #008', collection: 'Audio Visuals', category: 'music', rarity: 'Epic', price: 0.95, image: '🎵', gradient: 'linear-gradient(135deg,#ff6b6b,#ffa500,#ff00e5)', owner: '0xe2b8…c744', creator: 'WaveForm', likes: 154 },
    { id: 5, name: 'Battle Mech #217', collection: 'MechWarriors', category: 'gaming', rarity: 'Rare', price: 1.35, image: '⚔️', gradient: 'linear-gradient(135deg,#2c3e50,#3498db,#2ecc71)', owner: '0x5fa1…d902', creator: 'GameForge', likes: 197 },
    { id: 6, name: 'Quantum Abstract #055', collection: 'Quantum Art', category: 'art', rarity: 'Common', price: 0.45, image: '🎨', gradient: 'linear-gradient(135deg,#ee7752,#e73c7e,#23a6d5,#23d5ab)', owner: '0x1c9e…22ab', creator: 'QuantumVision', likes: 88 },
    { id: 7, name: 'Ethereal Dragon #003', collection: 'Mythic Beasts', category: 'gaming', rarity: 'Legendary', price: 6.80, image: '🐉', gradient: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', owner: '0x8a4f…77d1', creator: 'MythicLabs', likes: 764 },
    { id: 8, name: 'Digital Genesis #002', collection: 'NEXUS Genesis', category: 'art', rarity: 'Legendary', price: 3.20, image: '✨', gradient: 'linear-gradient(135deg,#f093fb,#f5576c,#4facfe)', owner: '0x4db3…e5c8', creator: 'NEXUS Labs', likes: 521 },
    { id: 9, name: 'Virtual Land #500', collection: 'Metaverse Realms', category: 'virtual-realestate', rarity: 'Epic', price: 8.50, image: '🏗️', gradient: 'linear-gradient(135deg,#134e5e,#71b280)', owner: '0x2bc8…a093', creator: 'RealmDAO', likes: 342 },
    { id: 10, name: 'Synth Wave #012', collection: 'Audio Visuals', category: 'music', rarity: 'Common', price: 0.30, image: '🎹', gradient: 'linear-gradient(135deg,#fc466b,#3f5efb)', owner: '0x6c1f…94be', creator: 'WaveForm', likes: 67 },
    { id: 11, name: 'Neon Samurai #088', collection: 'CyberPunks', category: 'collectibles', rarity: 'Rare', price: 1.10, image: '⚡', gradient: 'linear-gradient(135deg,#f12711,#f5af19)', owner: '0x9fd2…b17e', creator: 'PunkLabs', likes: 203 },
    { id: 12, name: 'Crystal Form #047', collection: 'Quantum Art', category: 'art', rarity: 'Rare', price: 0.75, image: '💎', gradient: 'linear-gradient(135deg,#a8edea,#fed6e3)', owner: '0x3ac4…e812', creator: 'QuantumVision', likes: 129 },
    { id: 13, name: 'Astro Mech #103', collection: 'MechWarriors', category: 'gaming', rarity: 'Epic', price: 2.10, image: '🛸', gradient: 'linear-gradient(135deg,#0c0c1d,#2d1b69,#1a1a3e)', owner: '0x7e8b…21f4', creator: 'GameForge', likes: 276 },
    { id: 14, name: 'Holo Crystal #027', collection: 'NEXUS Genesis', category: 'art', rarity: 'Common', price: 0.55, image: '🔮', gradient: 'linear-gradient(135deg,#c33764,#1d2671)', owner: '0xb5c7…d3a9', creator: 'NEXUS Labs', likes: 95 },
    { id: 15, name: 'Meta Pavilion #012', collection: 'Metaverse Realms', category: 'virtual-realestate', rarity: 'Rare', price: 5.40, image: '🏛️', gradient: 'linear-gradient(135deg,#41295a,#2f0743)', owner: '0x1fa3…c6b0', creator: 'RealmDAO', likes: 188 },
    { id: 16, name: 'Echo Beat #033', collection: 'Audio Visuals', category: 'music', rarity: 'Rare', price: 0.85, image: '🎧', gradient: 'linear-gradient(135deg,#ff9966,#ff5e62)', owner: '0x8de6…f452', creator: 'WaveForm', likes: 141 },
    { id: 17, name: 'Void Walker #009', collection: 'Mythic Beasts', category: 'gaming', rarity: 'Epic', price: 3.60, image: '👾', gradient: 'linear-gradient(135deg,#141e30,#243b55)', owner: '0x2e7a…91cd', creator: 'MythicLabs', likes: 312 },
    { id: 18, name: 'Chrome Idol #071', collection: 'CyberPunks', category: 'collectibles', rarity: 'Epic', price: 2.95, image: '🗿', gradient: 'linear-gradient(135deg,#232526,#414345)', owner: '0x71b9…0e5f', creator: 'PunkLabs', likes: 264 },
    { id: 19, name: 'Prism Shard #214', collection: 'Quantum Art', category: 'art', rarity: 'Common', price: 0.62, image: '🔷', gradient: 'linear-gradient(135deg,#30cfd0,#330867)', owner: '0xa4d1…77b2', creator: 'QuantumVision', likes: 74 },
    { id: 20, name: 'Bass Reactor #056', collection: 'Audio Visuals', category: 'music', rarity: 'Epic', price: 1.55, image: '🔊', gradient: 'linear-gradient(135deg,#f83600,#f9d423)', owner: '0xc812…3ea7', creator: 'WaveForm', likes: 219 },
    { id: 21, name: 'Sky Citadel #088', collection: 'Metaverse Realms', category: 'virtual-realestate', rarity: 'Legendary', price: 11.20, image: '🏰', gradient: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', owner: '0x55e0…b91a', creator: 'RealmDAO', likes: 687 },
    { id: 22, name: 'Glitch Sprite #130', collection: 'CyberPunks', category: 'collectibles', rarity: 'Common', price: 0.38, image: '👻', gradient: 'linear-gradient(135deg,#41295a,#2f0743)', owner: '0x3f66…d208', creator: 'PunkLabs', likes: 53 },
    { id: 23, name: 'Rift Stalker #044', collection: 'MechWarriors', category: 'gaming', rarity: 'Legendary', price: 7.40, image: '🦾', gradient: 'linear-gradient(135deg,#000428,#004e92)', owner: '0x88aa…1f3c', creator: 'GameForge', likes: 598 },
    { id: 24, name: 'Aurora Thread #019', collection: 'Quantum Art', category: 'art', rarity: 'Epic', price: 1.95, image: '🌈', gradient: 'linear-gradient(135deg,#00c9ff,#92fe9d)', owner: '0x19ff…c844', creator: 'QuantumVision', likes: 246 },
];

const AUCTIONS = [
    { id: 201, name: 'Legendary Mech #001', collection: 'MechWarriors', image: '🤖', gradient: 'linear-gradient(135deg,#ff0844,#ffb199)', currentBid: 3.75, minBid: 4.00, endTime: Date.now() + 2.6 * 3600e3, bids: 23, rarity: 'Legendary' },
    { id: 202, name: 'Cosmic Horizon #007', collection: 'Quantum Art', image: '🌌', gradient: 'linear-gradient(135deg,#0f2027,#203a43,#2c5364)', currentBid: 1.20, minBid: 1.35, endTime: Date.now() + 5.2 * 3600e3, bids: 45, rarity: 'Epic' },
    { id: 203, name: 'Cyber Dragon #777', collection: 'CyberPunks', image: '🐲', gradient: 'linear-gradient(135deg,#e44d26,#f16529,#fcb045)', currentBid: 5.90, minBid: 6.20, endTime: Date.now() + 1.8 * 3600e3, bids: 67, rarity: 'Legendary' },
    { id: 204, name: 'Virtual Island #003', collection: 'Metaverse Realms', image: '🏝️', gradient: 'linear-gradient(135deg,#134e5e,#71b280)', currentBid: 12.50, minBid: 13.00, endTime: Date.now() + 8.1 * 3600e3, bids: 12, rarity: 'Epic' },
    { id: 205, name: 'Sonic Pulse #101', collection: 'Audio Visuals', image: '🎶', gradient: 'linear-gradient(135deg,#f857a6,#ff5858)', currentBid: 0.65, minBid: 0.70, endTime: Date.now() + 3.9 * 3600e3, bids: 34, rarity: 'Rare' },
    { id: 206, name: 'Neon Genesis #999', collection: 'NEXUS Genesis', image: '💫', gradient: 'linear-gradient(135deg,#00f0ff,#a855f7,#ff00e5)', currentBid: 8.80, minBid: 9.20, endTime: Date.now() + 10.4 * 3600e3, bids: 89, rarity: 'Legendary' },
];

const COLLECTIONS = [
    { name: 'NEXUS Genesis', thumb: '🌀', gradient: 'linear-gradient(135deg,#00f0ff,#a855f7)', floor: 0.55, volume: 12840, change: 18.4, items: 10000, verified: true, spark: [3, 4, 3.6, 5, 6.2, 5.8, 7.4, 8.8, 8.1, 9.6] },
    { name: 'CyberPunks', thumb: '🤖', gradient: 'linear-gradient(135deg,#1a1a2e,#0f3460)', floor: 0.38, volume: 9620, change: 7.2, items: 8888, verified: true, spark: [5, 4.6, 5.2, 5, 5.8, 6.1, 5.9, 6.4, 7, 6.8] },
    { name: 'Metaverse Realms', thumb: '🌐', gradient: 'linear-gradient(135deg,#134e5e,#71b280)', floor: 4.20, volume: 8110, change: -3.1, items: 5000, verified: true, spark: [8, 7.6, 7.9, 7.2, 6.8, 7.1, 6.6, 6.9, 6.4, 6.7] },
    { name: 'MechWarriors', thumb: '⚔️', gradient: 'linear-gradient(135deg,#2c3e50,#3498db)', floor: 1.35, volume: 6470, change: 24.9, items: 7777, verified: true, spark: [2, 2.5, 3.1, 2.8, 3.9, 4.6, 5.2, 6.1, 5.8, 7.2] },
    { name: 'Audio Visuals', thumb: '🎵', gradient: 'linear-gradient(135deg,#ff6b6b,#ff00e5)', floor: 0.30, volume: 4230, change: 11.6, items: 12000, verified: false, spark: [3, 3.2, 3, 3.6, 3.4, 4, 3.8, 4.4, 4.2, 4.8] },
    { name: 'Quantum Art', thumb: '💎', gradient: 'linear-gradient(135deg,#30cfd0,#330867)', floor: 0.45, volume: 3890, change: -1.4, items: 6666, verified: false, spark: [5, 5.2, 4.8, 5, 4.6, 4.9, 4.5, 4.7, 4.4, 4.6] },
    { name: 'Mythic Beasts', thumb: '🐉', gradient: 'linear-gradient(135deg,#0f0c29,#302b63)', floor: 3.60, volume: 3150, change: 42.3, items: 3333, verified: true, spark: [1, 1.4, 1.2, 2, 2.6, 2.2, 3.4, 4.1, 3.8, 5.2] },
];

const PROPOSALS = [
    { id: 301, title: 'Reduce trading fees from 2.5% to 1.5%', status: 'active', votesFor: 782, votesAgainst: 134, ends: '3 days' },
    { id: 302, title: 'Add support for Polygon network', status: 'active', votesFor: 1056, votesAgainst: 87, ends: '5 days' },
    { id: 303, title: 'Implement NFT staking rewards v2', status: 'active', votesFor: 624, votesAgainst: 198, ends: '2 days' },
    { id: 304, title: 'Launch NEXUS token airdrop for Genesis holders', status: 'ended', votesFor: 1587, votesAgainst: 43, ends: 'ended' },
];

const LEADERBOARD = [
    { name: 'voidwhale.eth', addr: '0x71f3…9a02', volume: 842.6, trades: 1204 },
    { name: 'neonqueen.eth', addr: '0x3bd1…e7c4', volume: 617.2, trades: 986 },
    { name: 'metaflippa', addr: '0xa94c…01d8', volume: 503.9, trades: 1450 },
    { name: '0xdreamer', addr: '0x6e22…b83f', volume: 411.5, trades: 762 },
    { name: 'pixelape.eth', addr: '0xd107…4e9a', volume: 356.8, trades: 893 },
    { name: 'chainrunner', addr: '0x84fe…c2b6', volume: 298.4, trades: 1101 },
    { name: 'holohoarder.eth', addr: '0x2c8b…f771', volume: 244.1, trades: 655 },
    { name: 'quantumhands', addr: '0xf3a9…8d12', volume: 197.7, trades: 534 },
];

const ACTIVITY_TEMPLATES = [
    { icon: '🛒', type: 'Sale', msg: (n, a) => `${n} sold`, amt: true },
    { icon: '🔨', type: 'Bid', msg: (n) => `New bid on ${n}`, amt: true },
    { icon: '🏷️', type: 'List', msg: (n) => `${n} listed`, amt: true },
    { icon: '✨', type: 'Mint', msg: (n) => `${n} minted`, amt: false },
    { icon: '🔄', type: 'Transfer', msg: (n) => `${n} transferred`, amt: false },
    { icon: '💎', type: 'Offer', msg: (n) => `Offer made on ${n}`, amt: true },
];

const RANDOM_TRADERS = ['0x1a2b…3c4d', '0x9f8e…7d6c', '0x4d5e…6f70', '0xbeef…cafe', '0x0bad…f00d', '0xdead…b001', '0x7e57…c0de'];

/* Chain config — Sepolia testnet (matches HyperStream contract) */
const CHAIN = {
    id: 11155111,
    hex: '0xaa36a7',
    name: 'Sepolia',
    explorer: 'https://sepolia.etherscan.io',
    contract: '0x6ebd920e2383e11a06440ed632c51225b5f1909b',
    mintPriceEth: 0.0001,
};

/* Candidate mint entrypoints tried in order against the contract */
const MINT_ABI = [
    'function mint(uint256 quantity) payable',
    'function mint() payable',
    'function safeMint(address to) payable',
    'function publicMint(uint256 quantity) payable',
];
