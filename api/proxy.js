// Vercel Serverless Function - cnv.cx proxy
// This proxies requests to cnv.cx with the required Origin/Referer headers
// cnv.cx blocks Cloudflare IPs but accepts Vercel (AWS Lambda) IPs

const CNV_BASE = 'https://cnv.cx';
const REQUIRED_ORIGIN = 'https://frame.y2meta-uk.com';
const REQUIRED_REFERER = 'https://frame.y2meta-uk.com/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

export default async function handler(req, res) {
  // CORS headers - allow any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    if (action === 'key') {
      // GET sanity key
      const response = await fetch(`${CNV_BASE}/v2/sanity/key`, {
        headers: {
          'User-Agent': UA,
          'Origin': REQUIRED_ORIGIN,
          'Referer': REQUIRED_REFERER,
        }
      });
      
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to get sanity key', status: response.status });
      }
      
      const data = await response.json();
      return res.status(200).json(data);

    } else if (action === 'convert') {
      // POST converter
      const { link, format, audioBitrate, quality } = req.body || {};
      const key = req.headers['x-key'] || req.query.key;
      
      if (!link || !key) {
        return res.status(400).json({ error: 'Missing link or key parameter' });
      }

      const body = new URLSearchParams();
      body.append('link', link);
      body.append('format', format || 'mp3');
      body.append('audioBitrate', audioBitrate || '128');
      body.append('filenameStyle', 'pretty');
      if (quality) body.append('quality', quality);

      const response = await fetch(`${CNV_BASE}/v2/converter`, {
        method: 'POST',
        headers: {
          'User-Agent': UA,
          'Origin': REQUIRED_ORIGIN,
          'Referer': REQUIRED_REFERER,
          'Content-Type': 'application/x-www-form-urlencoded',
          'key': key,
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: 'Converter failed', status: response.status, detail: text });
      }

      const data = await response.json();
      return res.status(200).json(data);

    } else {
      return res.status(400).json({ error: 'Invalid action. Use ?action=key or ?action=convert' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
