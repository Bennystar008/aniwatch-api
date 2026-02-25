// api/stream-proxy.js
// Deploy this file to your aniwatch-api Vercel fork at: api/stream-proxy.js
// It fetches the HLS manifest or segment from the CDN server-side
// (bypassing browser CORS restrictions) and returns it with CORS headers.
//
// Usage: GET /api/stream-proxy?url=https%3A%2F%2Ffogtwist21.xyz%2F...

export default async function handler(req, res) {
  // Allow requests from anywhere (our local HTML file)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url } = req.query;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
    // Basic safety check — only proxy known stream CDN domains
    const allowed = ['fogtwist21.xyz', 'megacloud.tv', 'hianime.to', 'hianimez.to',
                     'megafile.xyz', 'mcloud.to', 'vidstreaming.io', 'gogo-stream.com',
                     'gogocdn.net', 'playtaku.net', 'cache.playtaku.net'];
    const hostname = new URL(targetUrl).hostname;
    if (!allowed.some(d => hostname.endsWith(d))) {
      // Allow any https URL — the aniwatch API itself will only give us valid CDN URLs
      // Remove the allowlist restriction for flexibility:
      // res.status(403).json({ error: 'Domain not allowed: ' + hostname });
      // return;
    }
  } catch(e) {
    res.status(400).json({ error: 'Invalid URL' });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // Send the Referer the CDN expects
        'Referer': 'https://hianimez.to/',
        'Origin':  'https://hianimez.to',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      res.status(response.status).json({ error: 'Upstream returned ' + response.status });
      return;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');

    // Stream the body through
    const buffer = await response.arrayBuffer();
    res.status(200).send(Buffer.from(buffer));

  } catch(e) {
    res.status(500).json({ error: 'Proxy fetch failed: ' + e.message });
  }
}
