export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!process.env.PINATA_JWT) return res.status(500).json({ error: 'PINATA_JWT is not configured on Vercel.' });

  try {
    const filename = String(req.query?.filename || `hyperstream-${Date.now()}.glb`).slice(0, 180);
    const now = Math.floor(Date.now() / 1000);
    const response = await fetch('https://uploads.pinata.cloud/v3/files/sign', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        date: now,
        expires: 1800,
        max_file_size: 250 * 1024 * 1024,
        allow_mime_types: ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream'],
        filename,
        keyvalues: { app: 'hyperstream-3d', upload_id: String(Date.now()) }
      })
    });
    const text = await response.text();
    if (!response.ok) return res.status(502).json({ error: 'Pinata could not create the upload URL.', details: text.slice(0, 1000) });
    const data = JSON.parse(text);
    return res.status(200).json({ url: data.data, filename });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not create upload URL.' });
  }
}
