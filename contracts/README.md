# VR Hologram NFT – Smart Contract

## Contract: `VRHologramNFT.sol`

Simple but production-ready ERC-721 for scanned 3D holograms.

### Features
- `mintHologram(to, tokenURI)` – anyone can mint (or restrict later)
- IPFS tokenURI support (metadata JSON that points to the GLB)
- Basic royalty support (5% default)
- Ownable + totalSupply

### Recommended Deploy Networks
- **Polygon Amoy** (testnet) – cheap & fast for development
- **Polygon Mainnet** – production
- Can also be adapted for Base, Arbitrum, etc.

### How to Deploy (Remix – easiest)

1. Go to [https://remix.ethereum.org](https://remix.ethereum.org)
2. Create new file `VRHologramNFT.sol` and paste the contract code
3. Install OpenZeppelin via Remix plugin or import from GitHub:
   ```
   import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
   ...
   ```
4. Compile with Solidity 0.8.20+
5. Deploy with Injected Provider (MetaMask) on **Polygon Amoy**
6. Constructor argument: your wallet address (as initial owner)
7. Copy the deployed contract address

### After Deploy
Paste the contract address into the frontend config (see `js/config.js` or the mint panel).

### Metadata Standard (tokenURI)
The tokenURI should point to a JSON file on IPFS that looks like:

```json
{
  "name": "My Scanned Object",
  "description": "Real-world scan turned into a hologram NFT",
  "image": "ipfs://..." ,          // optional thumbnail
  "animation_url": "ipfs://...",   // the GLB file (preferred for 3D)
  "model": "ipfs://...",           // alternative field some platforms use
  "attributes": []
}
```
