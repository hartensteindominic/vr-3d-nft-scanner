# HyperStream 3D NFT Contract

`HyperStreamTestnetNFT.sol` is the testnet ERC-721 contract used by the marketplace architecture.

## Deployment

This repository intentionally does **not** contain a private key, RPC credential, or deployed mainnet address.

Deploy the contract with OpenZeppelin Contracts 5.x and an owner wallet on a supported EVM testnet. The constructor takes the wallet address that should control `mint()`.

After deployment, place the contract address and chain ID into the marketplace configuration. Never commit a private key or seed phrase.

## Mint flow

1. User connects a browser wallet.
2. The app uploads/stores NFT metadata and obtains a metadata URI.
3. The owner/deployment account calls `mint(to, metadataURI)` on the testnet contract.
4. The resulting token ID becomes the NFT's permanent identifier on that network.

The current GitHub Pages marketplace does not claim that a mint has occurred until a real signed blockchain transaction and receipt exist.
