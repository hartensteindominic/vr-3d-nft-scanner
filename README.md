# VR 3D NFT Scanner

**Scan real-world objects → turn them into tradeable 3D NFTs, holograms, pics & videos.**

This repository contains the foundation for a VR / WebXR application that lets users:

1. Scan physical objects (phone LiDAR / photogrammetry)
2. Convert them into optimized 3D models (GLB)
3. Mint them as NFTs
4. View and interact with them as floating holograms in VR
5. Buy, sell, and trade them in an in-app marketplace

## 🚀 Live Demo

Once GitHub Pages is enabled (see below), the site will be available at:

**https://hartensteindominic.github.io/vr-3d-nft-scanner/**

## Current Status

- ✅ **WebXR Prototype** – Interactive 3D hologram gallery (works in browser + Meta Quest browser)
- ✅ **GitHub Pages ready** – Automatic deployment via Actions
- ⏳ Smart contract + minting flow (next)
- ⏳ Mobile scanning pipeline integration
- ⏳ Full Unity XR version
- ⏳ Marketplace smart contracts

## How to Deploy / Enable the Live Site (1 minute)

1. Go to the repository: https://github.com/hartensteindominic/vr-3d-nft-scanner
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment** → **Source**, select **GitHub Actions**
4. Save

After the next push (or manually run the workflow), the site will be live at:

→ **https://hartensteindominic.github.io/vr-3d-nft-scanner/**

You can also trigger a deploy manually: **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**

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
├── .github/workflows/
│   └── deploy.yml      # Auto-deploy to GitHub Pages
├── contracts/          # (coming) Solidity smart contracts
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
- [x] GitHub Pages deployment
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
