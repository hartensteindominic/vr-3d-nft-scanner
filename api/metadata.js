export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.PINATA_JWT) return res.status(500).json({ error: 'PINATA_JWT is not configured on Vercel.' });
  try {
    const body = req.body || {};
    if (!body.metadata || typeof body.metadata !== 'object') return res.status(400).json({ error: 'Metadata is required.' });
    const metadata = body.metadata;
    const form = new FormData();
    form.append('network', 'public');
    form.append('file', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'metadata.json');
    const upload = await fetch('https://uploads.pinata.cloud/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
      body: form
    });
    const text = await upload.text();
    if (!upload.ok) return res.status(502).json({ error: 'Pinata metadata upload failed.', details: text.slice(0, 1000) });
    const result = JSON.parse(text);
    const cid = result?.data?.cid || result?.cid;
    if (!cid) return res.status(502).json({ error: 'Pinata returned no metadata CID.' });
    return res.status(200).json({ cid, metadataUri: `ipfs://${cid}`, gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}` });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Metadata upload failed.' });
  }
}
