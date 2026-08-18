# 3D NFT Studio

**The complete pipeline to turn real-world objects into tradeable 3D NFTs.**

Scan → Upload GLB → Mint ERC-721 → View in AR/VR → Buy, sell & trade

**Live:** https://hartensteindominic.github.io/vr-3d-nft-scanner/

## What it does

- **Gallery** of high-quality 3D models (Damaged Helmet, Avocado, Water Bottle samples + your uploads)
- **Create flow** – drop any `.glb` / `.gltf`, name it, AI description, category & rarity, optional list price
- **IPFS** pinning (Pinata) + metadata generation
- **Mint** ERC-721 on Polygon (Amoy testnet / mainnet ready)
- **True WebXR AR** – hit-test placement on real surfaces
- **VR mode** – controllers, grab & inspect
- **Library** of your minted 3D NFTs
- **Marketplace** – browse, filter, buy, list, activity feed

## Quick start

1. Open the live site or run locally: `npx serve .`
2. Explore the gallery (orbit, auto-rotate)
3. **Create** → drop a GLB from Polycam / Scaniverse / RealityScan
4. Fill name + details → Upload to IPFS → Mint
5. **Enter AR** on a compatible phone or **Enter VR** on a headset
6. List or buy on the Marketplace

## Go fully live

1. Free Pinata API keys → paste into `js/config.js`
2. Deploy `contracts/VRHologramNFT.sol` on Remix (Polygon Amoy)
3. Paste contract address into config
4. Reload and mint real on-chain 3D NFTs

## Tech

- Three.js + WebXR (AR hit-testing + VR)
- ethers.js · Polygon · ERC-721
- IPFS via Pinata
- Pure static frontend (GitHub Pages)

---

Scan the real world. Own the digital twin. Trade the 3D NFT.
