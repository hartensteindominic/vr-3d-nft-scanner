# VR 3D NFT Scanner

**Scan real objects → Turn them into 3D holograms → Mint as NFTs → View in AR/VR → Buy, sell & trade**

Live demo: **https://hartensteindominic.github.io/vr-3d-nft-scanner/**

## Features

- **Beautiful immersive gallery** with floating holograms
- **Real WebXR AR** – place holograms in the real world (hit-testing)
- **VR mode** for headsets
- **Scan / Upload** pipeline (Polycam, Scaniverse, or any GLB)
- **IPFS upload** (Pinata) + metadata generation
- **Smart contract minting** (Polygon Amoy / Mainnet ready)
- **Personal Library** of your 3D NFTs
- **Marketplace** – list, buy, sell & trade
- **AI Description Helper** – generates strong NFT descriptions
- Wallet connection (MetaMask etc.)

## Quick Start

1. Open the live site or run locally:
   ```bash
   npx serve .
   ```
2. Connect wallet
3. Upload a `.glb` or follow the guided scan steps
4. Generate description (AI), upload to IPFS, mint
5. View in AR or VR, manage in Library, list on Marketplace

## Making it fully live

1. Get free Pinata API keys → put in `js/config.js`
2. Deploy `contracts/VRHologramNFT.sol` on Remix (Polygon Amoy)
3. Paste contract address into `js/config.js`
4. Reload and mint for real

## Tech

- Three.js + WebXR (AR + VR)
- ethers.js
- IPFS via Pinata
- ERC-721 (OpenZeppelin style)
- Pure frontend (GitHub Pages)

---

Scan the real world. Own the digital twin. Trade the hologram.
