# VR 3D NFT Scanner

**Scan real objects → Turn them into floating 3D holograms → Mint as NFTs → View in AR/VR → Buy, sell & trade**

Live demo: **https://hartensteindominic.github.io/vr-3d-nft-scanner/**

## The Duck Version

The classic Khronos Duck floats in the center of the gallery as the reference hologram. Every scanned object receives the same visual language: gentle floating motion, soft emissive materials, glowing platforms, and AR hit-test placement. That is the signature “duck version” look of this app.

## Features

- **Immersive gallery** with floating holograms styled after the Duck sample
- **Real WebXR AR** – hit-testing, place holograms on real surfaces
- **VR mode** for headsets (controllers, grab & inspect)
- **Guided scan pipeline** – Polycam / Scaniverse → GLB → upload
- **IPFS upload** (Pinata) + rich metadata generation
- **Smart contract minting** (Polygon Amoy / Mainnet ready)
- **Personal Library** of your 3D hologram NFTs
- **Marketplace** – browse, filter, buy, list & trade (demo + real-ready)
- **AI Description Helper** – generates strong NFT descriptions
- **About / How-it-works / FAQ** – full in-app documentation
- Wallet connection (MetaMask etc.)
- Pure frontend – GitHub Pages deploy

## Quick Start

1. Open the live site or run locally:
   ```bash
   npx serve .
   ```
2. Explore the Duck sample in the gallery
3. Connect wallet (optional for demo)
4. Go to **Create** → follow Guided Scan or Upload a `.glb`
5. Name it, generate AI description, upload to IPFS, mint
6. Enter **AR** to place on a real surface or **VR** to inspect
7. List on Marketplace or buy other demo listings

## Making it fully live

1. Get free Pinata API keys → put in `js/config.js`
2. Deploy `contracts/VRHologramNFT.sol` on Remix (Polygon Amoy)
3. Paste contract address into `js/config.js`
4. Reload and mint for real on-chain NFTs

## Tech

- Three.js + WebXR (AR hit-testing + VR controllers)
- ethers.js
- IPFS via Pinata
- ERC-721 (OpenZeppelin style)
- Pure static frontend (GitHub Pages)

---

Scan the real world. Own the digital twin. Trade the hologram.
