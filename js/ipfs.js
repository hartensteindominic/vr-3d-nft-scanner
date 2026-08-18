// IPFS upload helpers
import { CONFIG } from './config.js';

/**
 * Upload a File or Blob to IPFS via Pinata
 * Returns the CID (IpfsHash)
 */
export async function uploadToIPFS(fileOrBlob, fileName = 'model.glb') {
  if (!CONFIG.pinataApiKey || !CONFIG.pinataSecretApiKey) {
    console.warn('[IPFS] No Pinata keys – running in demo mode');
    // Return a fake CID for demo so the UI can continue
    return {
      cid: 'bafybeidemo' + Math.random().toString(36).slice(2, 10),
      url: null,
      demo: true
    };
  }

  const formData = new FormData();
  formData.append('file', fileOrBlob, fileName);

  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      'pinata_api_key': CONFIG.pinataApiKey,
      'pinata_secret_api_key': CONFIG.pinataSecretApiKey
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error('Pinata upload failed: ' + err);
  }

  const data = await res.json();
  return {
    cid: data.IpfsHash,
    url: CONFIG.ipfsGateway + data.IpfsHash,
    demo: false
  };
}

/**
 * Upload JSON metadata to IPFS
 */
export async function uploadMetadata(metadata) {
  const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
  return uploadToIPFS(blob, 'metadata.json');
}

/**
 * Build standard 3D NFT metadata
 */
export function buildMetadata({ name, description, modelCid, imageCid = null, attributes = [] }) {
  const meta = {
    name,
    description,
    animation_url: `ipfs://${modelCid}`,   // preferred for 3D models
    model: `ipfs://${modelCid}`,
    attributes
  };
  if (imageCid) {
    meta.image = `ipfs://${imageCid}`;
  }
  return meta;
}
