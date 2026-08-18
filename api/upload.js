export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.PINATA_JWT) {
    return res.status(500).json({ error: 'PINATA_JWT is not configured on Vercel.' });
  }

  try {
    const body = req.body || {};
    const file = body.file;
    const name = body.name || 'HyperStream 3D';
    const description = body.description || 'HyperStream 3D NFT';

    if (!file?.data || !file?.name) {
      return res.status(400).json({ error: 'No 3D file was received.' });
    }

    const bytes = Buffer.from(file.data, 'base64');
    if (!bytes.length) return res.status(400).json({ error: 'The uploaded 3D file was empty.' });
    if (bytes.length > 45 * 1024 * 1024) {
      return res.status(413).json({ error: '3D file is too large. Please use a GLB under 45 MB.' });
    }

    const form = new FormData();
    form.append(
      'file',
      new Blob([bytes], { type: file.type || 'model/gltf-binary' }),
      file.name
    );

    const upload = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: form
    });

    if (!upload.ok) {
      const text = await upload.text();
      return res.status(502).json({ error: 'Pinata GLB upload failed.', details: text.slice(0, 1000) });
    }

    const uploaded = await upload.json();
    const assetCid = uploaded?.data?.cid || uploaded?.cid;
    if (!assetCid) return res.status(502).json({ error: 'Pinata returned no GLB CID.' });

    const extension = file.name.split('.').pop()?.toUpperCase() || 'GLB';
    const metadata = {
      name,
      description,
      image: `ipfs://${assetCid}`,
      animation_url: `ipfs://${assetCid}`,
      external_url: 'https://hartensteindominic.github.io/vr-3d-nft-scanner/',
      attributes: [
        { trait_type: 'Asset Type', value: '3D Model' },
        { trait_type: 'Format', value: extension }
      ]
    };

    const metadataForm = new FormData();
    metadataForm.append(
      'file',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
      'metadata.json'
    );

    const metadataUpload = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: metadataForm
    });

    if (!metadataUpload.ok) {
      const text = await metadataUpload.text();
      return res.status(502).json({ error: 'Pinata metadata upload failed.', details: text.slice(0, 1000), assetCid });
    }

    const metadataResult = await metadataUpload.json();
    const metadataCid = metadataResult?.data?.cid || metadataResult?.cid;
    if (!metadataCid) return res.status(502).json({ error: 'Pinata returned no metadata CID.', assetCid });

    return res.status(200).json({
      assetCid,
      assetUri: `ipfs://${assetCid}`,
      metadataCid,
      metadataUri: `ipfs://${metadataCid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${assetCid}`,
      metadata
    });
  } catch (error) {
    console.error('HyperStream upload error:', error);
    return res.status(500).json({
      error: error?.message || 'Upload failed. Please try a smaller GLB.'
    });
  }
}
