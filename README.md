# ✦ HyperStream

## Make it yours.

HyperStream is a mobile-first, futuristic **3D creation studio + NFT launcher** built for phones, laptops, and spatial browsers.

### What the rebuild includes

- 📷 Live rear-camera capture with permission handling
- 🌀 Guided 12-frame spatial scan workflow
- 🧊 Real-time Three.js holographic 3D scene
- 📦 GLB / GLTF import
- 💾 Local creator state and collection persistence
- 🖼️ PNG studio snapshots
- 📤 GLB export
- 🦊 Direct MetaMask / EIP-1193 wallet connection
- ⛓️ Ethereum Sepolia chain detection and switching
- ✍️ NFT metadata generation
- 🪙 Test mint flow using the configured Sepolia contract
- 🔎 Etherscan transaction link after mint
- 📱 Responsive mobile UI with large touch targets
- 🥽 Quest-friendly spatial layout and WebGL presentation

### Flow

`CAMERA / GLB → 3D STUDIO → COLLECTION → METADATA → WALLET → SEPOLIA MINT`

### Important 3D note

The browser camera is RGB-only on most phones and laptops. The scan UI captures multiple views and records the scan pass, but a true photogrammetry / NeRF reconstruction backend is still required to turn those views into a high-fidelity watertight mesh automatically. HyperStream is structured so that a future reconstruction service can replace the preview object without rebuilding the creator UI.

### Blockchain

Default network: **Ethereum Sepolia testnet**.

Default contract:

`0x6ebd920e2383e11a06440ed632c51225b5f1909b`

The contract address can be overridden in browser local storage for development. Never send real funds to a test contract.

### Deployment

The project is designed for GitHub Pages as a static application. Camera access requires a secure context such as GitHub Pages HTTPS, and the user must grant browser camera permission.

### Next production layer

For a production marketplace, add a secure upload/reconstruction backend, IPFS pinning, marketplace/listing contracts, creator profiles, collection indexing, offers, provenance, royalties, and a dedicated 3D reconstruction pipeline.

**Capture something real. Give it a world. Make it yours. ✦**