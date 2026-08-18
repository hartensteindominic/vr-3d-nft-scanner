# VR 3D NFT Scanner

**Scan real-world objects → turn them into tradeable 3D NFTs, holograms, pics & videos.**

This repository contains the foundation for a VR / WebXR application that lets users:

1. Scan physical objects (phone LiDAR / photogrammetry)
2. Convert them into optimized 3D models (GLB)
3. Mint them as NFTs
4. View and interact with them as floating holograms in VR
5. Buy, sell, and trade them in an in-app marketplace

## Current Status

- ✅ **WebXR Prototype** – Interactive 3D hologram gallery (works in browser + Meta Quest browser)
- ⏳ Smart contract + minting flow (next)
- ⏳ Mobile scanning pipeline integration
- ⏳ Full Unity XR version
- ⏳ Marketplace smart contracts

## Live Demo

Open `index.html` in a WebXR-compatible browser (Chrome, Edge, or Meta Quest Browser) or host it.

## Tech Stack (MVP)

| Layer              | Technology                          |
|--------------------|-------------------------------------|
| VR / Viewer        | Three.js + WebXR                    |
| 3D Format          | GLB / glTF                          |
| Blockchain (planned)| Polygon / Solana / Hedera          |
| Storage (planned)  | IPFS (Pinata) + Arweave             |
| Wallet             | WalletConnect / MetaMask            |
| Future Full VR     | Unity + XR Interaction Toolkit      |

## Project Structure

```
vr-3d-nft-scanner/
├── index.html          # Main WebXR entry point
├── css/
│   └── style.css
├── js/
│   └── app.js          # Three.js + WebXR logic
├── contracts/          # (coming) Solidity smart contracts
├── scanning/           # (coming) Mobile scan → GLB pipeline notes
└── README.md
```

## How to Run Locally

```bash
# Simple static server (required for WebXR in most browsers)
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` and click **Enter VR** (or use a Quest browser).

## Roadmap

- [x] WebXR hologram gallery prototype
- [ ] Wallet connection + display owned NFTs
- [ ] IPFS upload + minting flow
- [ ] Simple marketplace (list / buy)
- [ ] Phone scanning integration (Polycam / Scaniverse / custom ARKit)
- [ ] Unity XR version for full immersion
- [ ] Gaussian Splatting support

## Contributing

This is an early-stage open project. PRs and ideas welcome!

---

Built for the future of spatial ownership.  
Scan the real world. Own the digital twin.
