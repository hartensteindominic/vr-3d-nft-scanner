export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.PINATA_JWT) return res.status(500).json({ error: 'PINATA_JWT is not configured on Vercel.' });

  try {
    const body = req.body || {};
    const file = body.file;
    const name = body.name || 'HyperStream 3D';
    const description = body.description || 'HyperStream 3D NFT';

    if (!file || !file.data || !file.name) {
      return res.status(400).json({ error: 'Expected JSON file payload with file.data (base64) and file.name.' });
    }

    const bytes = Buffer.from(file.data, 'base64');
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: file.type || 'model/gltf-binary' }), file.name);

    const upload = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: form
    });

    if (!upload.ok) {
      const text = await upload.text();
      return res.status(502).json({ error: 'Pinata GLB upload failed.', details: text });
    }

    const uploaded = await upload.json();
    const cid = uploaded?.data?.cid || uploaded?.cid;
    if (!cid) return res.status(502).json({ error: 'Pinata returned no CID.' });

    const metadata = {
      name,
      description,
      image: `ipfs://${cid}`,
      animation_url: `ipfs://${cid}`,
      external_url: 'https://hartensteindominic.github.io/vr-3d-nft-scanner/',
      attributes: [
        { trait_type: 'Asset Type', value: '3D Model' },
        { trait_type: 'Format', value: file.name.split('.').pop()?.toUpperCase() || 'GLB' }
      ]
    };

    const metadataFile = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
    const metadataForm = new FormData();
    metadataForm.append('file', metadataFile, 'metadata.json');

    const metadataUpload = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: metadataForm
    });

    if (!metadataUpload.ok) {
      const text = await metadataUpload.text();
      return res.status(502).json({ error: 'Pinata metadata upload failed.', details: text, assetCid: cid });
    }

    const metadataResult = await metadataUpload.json();
    const metadataCid = metadataResult?.data?.cid || metadataResult?.cid;
    if (!metadataCid) return res.status(502).json({ error: 'Pinata returned no metadata CID.', assetCid: cid });

    return res.status(200).json({
      assetCid: cid,
      assetUri: `ipfs://${cid}`,
      metadataCid,
      metadataUri: `ipfs://${metadataCid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
      metadata
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error?.message || 'Upload failed.' });
  }
}
