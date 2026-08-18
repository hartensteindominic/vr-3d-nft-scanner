// ============================================================
// Configuration – edit these values
// ============================================================

export const CONFIG = {
  // Network
  chainId: 80002,                    // Polygon Amoy testnet
  chainName: "Polygon Amoy",
  rpcUrl: "https://rpc-amoy.polygon.technology",
  blockExplorer: "https://amoy.polygonscan.com",

  // Smart Contract (paste your deployed address here after Remix deploy)
  contractAddress: "",               // e.g. "0x1234...abcd"

  // IPFS – Pinata (recommended for production)
  // Get free keys at https://pinata.cloud
  pinataApiKey: "",                  // leave empty to use demo mode
  pinataSecretApiKey: "",

  // Fallback public IPFS gateway (read only)
  ipfsGateway: "https://gateway.pinata.cloud/ipfs/",

  // Demo mode when no keys / contract are set
  demoMode: true
};
