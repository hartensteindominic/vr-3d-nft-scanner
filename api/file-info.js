export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!process.env.PINATA_JWT) return res.status(500).json({ error: 'PINATA_JWT is not configured on Vercel.' });
  try {
    const name = String(req.query?.name || '').slice(0, 200);
    if (!name) return res.status(400).json({ error: 'name is required.' });
    const url = new URL('https://api.pinata.cloud/v3/files/public');
    url.searchParams.set('name', name);
    url.searchParams.set('limit', '10');
    url.searchParams.set('order', 'DESC');
    const r = await fetch(url, { headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` } });
    const text = await r.text();
    if (!r.ok) return res.status(502).json({ error: 'Could not query Pinata.', details: text.slice(0, 1000) });
    const data = JSON.parse(text);
    const files = data?.data?.files || [];
    if (!files.length || !files[0]?.cid) return res.status(404).json({ error: 'Uploaded file is not visible in Pinata yet.' });
    const f = files[0];
    return res.status(200).json({ cid: f.cid, name: f.name, size: f.size, mimeType: f.mime_type });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'File lookup failed.' });
  }
}
