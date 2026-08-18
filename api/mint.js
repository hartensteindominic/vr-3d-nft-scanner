import { ethers } from 'ethers';

const ABI = [
  'function mint(address to, string tokenURI_, address royaltyReceiver, uint96 royaltyBps) external returns (uint256)',
  'function owner() view returns (address)'
];

function json(res, status, body) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return res.status(status).json(body);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  const { PINATA_JWT, RPC_URL, MINTER_PRIVATE_KEY, CONTRACT_ADDRESS } = process.env;
  if (!PINATA_JWT) return json(res, 500, { error: 'PINATA_JWT is not configured on Vercel.' });
  if (!RPC_URL || !MINTER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
    return json(res, 500, { error: 'RPC_URL, MINTER_PRIVATE_KEY and CONTRACT_ADDRESS must be configured on Vercel.' });
  }

  try {
    const { name, description = '', thumbnailUrl = '', modelUrl, recipient, royaltyBps = 500 } = req.body || {};
    if (!name || !modelUrl || !recipient) return json(res, 400, { error: 'name, modelUrl and recipient are required.' });
    if (!ethers.isAddress(recipient)) return json(res, 400, { error: 'Invalid recipient address.' });

    const bps = Number(royaltyBps);
    if (!Number.isInteger(bps) || bps < 0 || bps > 1000) {
      return json(res, 400, { error: 'Royalty must be between 0 and 1000 bps (0-10%).' });
    }

    const metadata = {
      name,
      description,
      image: thumbnailUrl || undefined,
      animation_url: modelUrl,
      properties: {
        files: [{ uri: modelUrl, type: 'model/gltf-binary' }]
      }
    };

    const form = new FormData();
    form.append('network', 'public');
    form.append('file', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');

    const upload = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${PINATA_JWT}` },
      body: form
    });

    const uploadText = await upload.text();
    if (!upload.ok) return json(res, 502, { error: 'Pinata metadata upload failed.', details: uploadText.slice(0, 1000) });

    const uploadResult = JSON.parse(uploadText);
    const cid = uploadResult?.data?.cid || uploadResult?.cid;
    if (!cid) return json(res, 502, { error: 'Pinata returned no metadata CID.' });

    const tokenURI = `ipfs://${cid}`;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(MINTER_PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    const owner = await contract.owner();
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
      return json(res, 500, { error: 'MINTER_PRIVATE_KEY is not the ThreeNFT contract owner.', minter: wallet.address, owner });
    }

    const tx = await contract.mint(recipient, tokenURI, wallet.address, bps);
    const receipt = await tx.wait();

    let tokenId = null;
    for (const log of receipt.logs || []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'Minted') tokenId = parsed.args.tokenId.toString();
      } catch (_) {}
    }

    return json(res, 200, {
      success: true,
      tokenId,
      tokenURI,
      metadataCid: cid,
      txHash: receipt.hash,
      contractAddress: CONTRACT_ADDRESS,
      minter: wallet.address
    });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error?.shortMessage || error?.message || String(error) });
  }
}
