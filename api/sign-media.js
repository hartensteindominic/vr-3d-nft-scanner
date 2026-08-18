export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const jwt = process.env.PINATA_JWT;
  if (!jwt) return res.status(500).json({ error: 'PINATA_JWT is not configured on Vercel.' });

  try {
    const rawFilename = String(req.query?.filename || `hyperstream-media-${Date.now()}`);
    const filename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || `hyperstream-media-${Date.now()}`;
    const rawType = String(req.query?.type || '').toLowerCase();
    const allowed = [
      'image/jpeg','image/png','image/webp','image/gif',
      'video/mp4','video/webm','video/quicktime'
    ];
    const mime = allowed.includes(rawType) ? rawType : '';
    if (!mime) return res.status(400).json({ error: 'Unsupported media type. Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV.' });

    const date = Math.floor(Date.now() / 1000);
    const response = await fetch('https://uploads.pinata.cloud/v3/files/sign', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date,
        expires: 1800,
        max_file_size: 250 * 1024 * 1024,
        allow_mime_types: [mime],
        filename,
        keyvalues: { app: 'hyperstream-media', media_type: mime.startsWith('video/') ? 'video' : 'image' }
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { return res.status(502).json({ error: 'Pinata returned an invalid signing response.', details: text.slice(0, 1000) }); }
    if (!response.ok) return res.status(502).json({ error: 'Pinata could not create the media upload URL.', details: data?.error || data?.message || text.slice(0, 1000) });

    const candidate = typeof data?.data === 'string' ? data.data : data?.data?.url || data?.url;
    if (!candidate) return res.status(502).json({ error: 'Pinata returned no signed upload URL.' });
    let signedUrl;
    try { signedUrl = new URL(candidate).toString(); } catch { return res.status(502).json({ error: 'Pinata returned a malformed signed upload URL.' }); }

    return res.status(200).json({ url: signedUrl, filename, mime, expiresAt: date + 1800, maxFileSize: 250 * 1024 * 1024 });
  } catch (error) {
    return res.status(500).json({ error: error?.message || 'Could not create the media upload URL.' });
  }
}
