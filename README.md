# ✦ HyperStream

## Make it yours. Then make it pay.

HyperStream is a mobile-first, futuristic **3D creation studio + NFT launcher** built for phones, laptops, and spatial browsers.

The product is designed around a simple growth loop:

**FREE 3D TOOL → DISCOVERY → CREATOR → PAID ASSETS / PRO → MARKETPLACE → PLATFORM FEES**

The free studio is the acquisition engine. Monetization happens around higher-value creator needs rather than blocking the core experience.

### Product

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
- ✦ Built-in Creator Pro revenue funnel

### Revenue model

1. **Creator Pro subscription**
   - Target price: $9.99/month
   - Premium creator tools, analytics, larger projects, asset access and marketplace visibility.
   - Recurring revenue is the primary long-term target.

2. **One-time digital asset packs**
   - Target starting price: $7
   - GLB models, materials, environments, templates and creator presets.
   - Digital fulfillment can be automated through a checkout provider.

3. **Marketplace transaction fee**
   - Creators sell 3D assets and collections.
   - HyperStream earns a percentage of completed sales.
   - This is the largest potential revenue layer once marketplace infrastructure is live.

4. **Creator/3D software affiliate revenue**
   - Contextual recommendations can point creators toward useful software and services.
   - The site should disclose affiliate relationships clearly.

5. **Search-driven acquisition**
   - Publish useful, indexable pages around 3D scanning, GLB/GLTF, WebGL, Quest workflows, NFT creation and 3D assets.
   - Each page funnels visitors into the free studio.
   - This supports low-maintenance organic acquisition instead of relying on a personal social-media presence.

### Autonomous-first architecture

GitHub Pages can host the public frontend for almost no infrastructure cost. Checkout, subscriptions, digital delivery, email, analytics and marketplace settlement should be handled by external services or a secure backend. **Never put private API keys, payment secrets, wallet private keys or signing credentials in this repository.**

The homepage currently includes `revenue.js`, a static-site-safe monetization layer. Configure the checkout URLs at the top of that file when the payment products exist.

### Flow

`DISCOVER → FREE STUDIO → CREATE → SAVE / EXPORT → PRO / ASSET PACK → MARKETPLACE`

### Important 3D note

The browser camera is RGB-only on most phones and laptops. The scan UI captures multiple views and records the scan pass, but a true photogrammetry / NeRF reconstruction backend is still required to turn those views into a high-fidelity watertight mesh automatically. HyperStream is structured so a future reconstruction service can replace the preview object without rebuilding the creator UI.

### Blockchain

Default network: **Ethereum Sepolia testnet**.

Default contract:

`0x6ebd920e2383e11a06440ed632c51225b5f1909b`

The contract address can be overridden in browser local storage for development. Never send real funds to a test contract.

### Deployment

The project is designed for GitHub Pages as a static application. Camera access requires a secure context such as GitHub Pages HTTPS, and the user must grant browser camera permission.

### Production roadmap

- Secure creator accounts and cloud storage
- Automated GLB reconstruction pipeline
- IPFS or equivalent content-addressed storage
- Real marketplace/listing contracts
- Creator profiles and collections
- Offers, royalties and provenance
- Secure checkout and automated digital delivery
- Subscription entitlement checks
- SEO landing pages and structured metadata
- Privacy-safe analytics and conversion measurement
- GitHub Actions for automated quality checks and scheduled content generation

**Capture something real. Give it a world. Build a catalog. ✦**