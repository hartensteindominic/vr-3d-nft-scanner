# Project Plan — Futuristic 3D NFT Scanner & Marketplace

This document captures a prioritized plan, design decisions, and immediate action items to keep the project "very futuristic" while remaining practical and cross-platform (web + iPhone + future Unity/mobile pipeline).

Goals
- Create a holographic, futuristic user experience for scanning, viewing, transforming, minting, and trading 3D NFTs.
- Support desktop web, mobile web (iOS/Android), iPhone AR Quick Look, and future Unity/mobile scanning pipelines.
- Implement a robust minting and marketplace flow with persistent storage (IPFS/Arweave) and on-chain metadata.

Prioritized Roadmap

1) MVP (fast path to demo)
- Web-based 3D viewer supporting glTF/GLB.
- Transform controls: translate, rotate, scale with mouse + touch gestures.
- Wallet connectivity (MetaMask + WalletConnect) and basic mint flow.
- Store assets on IPFS (pinning via Web3.Storage/Pinata) and mint ERC-721 with metadata.
- Simple marketplace UI: list, buy, transfer.

2) Cross-platform & polish
- iPhone AR: generate USDZ for Quick Look; integrate <model-viewer> for AR fallback.
- WebXR immersive viewer for supported browsers and graceful fallback to 2D viewer.
- Responsive touch gestures and mobile performance tuning (LOD, texture compression).

3) Scanning pipeline (mid-term)
- Unity + AR Foundation pipeline for mobile scanning (ARKit, ARCore support).
- Server-side processing: retopology, texture baking, LOD generation, glTF/GLB export.
- Integrate Object Capture (iOS) or partner SDKs (Polycam, Scandy) where helpful.

4) Advanced features (later)
- Auctions, bidding, creator storefronts, on-chain royalties (ERC2981).
- Lazy minting to reduce user gas costs, relayer/meta-transactions for UX.
- Social features and trading flows, analytics, and moderation tools.

Key UX & Visual Design Notes ("Very Futuristic")
- Holographic materials: iridescent rim lighting, bloom, animated shaders.
- Motion-driven micro-interactions: selection glow, particles on mint/trade, subtle parallax.
- Spatial UI elements (floating panels) that orbit the object, context-aware controls.
- Intuitive transform gizmo: handles for move/rotate/scale with snap/grid and undo/redo.

Core Technical Choices
- Frontend 3D
  - Frameworks: three.js or react-three-fiber (r3f) + @react-three/drei for faster build.
  - Alternative/simple viewer: <model-viewer> for glTF + AR Quick Look (good iOS fallback).
  - Transform controls: three.js TransformControls or a custom touch-friendly implementation.
- Storage & CDN
  - Use IPFS (Web3.Storage or Pinata) or Arweave for persistent storage of assets and metadata.
  - Serve thumbnails and LODs via a CDN in front of IPFS for fast delivery.
- Blockchain / Smart Contracts
  - Solidity with OpenZeppelin (ERC-721 or ERC-1155 base). Support ERC2981 for royalties.
  - Consider lazy-minting patterns to avoid upfront gas costs.
  - Index events via The Graph or a simple backend to power marketplace queries.
- Wallets & UX
  - WalletConnect v2 + injected wallets (MetaMask, Coinbase) + Web3Modal for flow.
  - Optional: account abstraction or relayer for gasless onboarding.
- Backend & Processing
  - Node.js / Next.js API routes for ephemeral signing, conversion, and processing steps.
  - Processing workers for model conversions (glTF <-> USDZ, retopology) possibly using headless Blender or cloud services.

Move/Transform Interactions — Implementation Checklist
- Desktop: mouse drag + keyboard modifiers for precise transforms.
- Mobile: one-finger rotate, two-finger drag/scale, three-finger gestures for advanced controls.
- Gizmo UI: visible handles, world/local transform toggle, snap/grid options.
- Grounding: raycast to surface to allow snapping to scene geometry.
- Persist transforms: save transform in asset metadata so viewer orientation is preserved when traded.

NFT Metadata & Minting (practical schema)
- Metadata JSON (ERC-721 style):
  - name, description
  - image: ipfs://... (thumbnail)
  - animation_url: ipfs://.../model.glb (or HTTP CDN)
  - properties: files [{uri,type}], creator, transform/default orientation
- Contract: OpenZeppelin ERC-721 with minting function and ERC-2981 royalties. Support admin / platform fee logic.
- Consider lazy-mint: store signed order off-chain, mint when buyer pays.

iPhone / Quick Look Notes
- Provide USDZ for Quick Look on iOS (recommended to convert server-side).
- Use <model-viewer> with ar attribute to enable iOS Quick Look and fallback experiences.
- Test quality & scale in Quick Look—apply correct scale units and anchor transforms.

Performance & Compatibility
- Provide progressive LODs and KTX2/Basis compressed textures.
- Progressive loading: low-poly preview then stream higher LODs.
- Test on range of devices; optimize for older phones and low-memory environments.

Security & Auditing
- Use OpenZeppelin audited contracts and follow best practices.
- Validate uploads and limit file sizes; scan/verify contents server-side.
- Implement marketplace policies and rate limits to prevent abuse.

Immediate Next Tasks (short-term, actionable)
1. Create a minimal 3D viewer page (Three.js / r3f) with TransformControls and touch gesture support.
2. Add wallet connect & a simple mint API route that pins to Web3.Storage and mints via a deployed OpenZeppelin ERC-721 contract.
3. Add export endpoint to convert GLB to USDZ (server-side worker) for iOS Quick Look.
4. Add tests and device matrix for WebXR fallbacks and AR Quick Look.
5. Wire up analytics for views, drags, mints, and trades.

Repository actions I can do next (tell me which you want)
- Create this plan file in the repository (I just added it). 
- Search the repo for existing 3D viewer / contract files and propose a PR that implements item 1 above.
- Draft an OpenZeppelin ERC-721 contract and a starter r3f TransformControls component.

Notes
- This plan keeps a pragmatic path to a working demo while preserving futuristic visual direction.
- If you'd like, I can split the Immediate Next Tasks into GitHub issues and open a project board.

Authored by: Copilot
Date: 2026-08-18
