import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Extract path from the URL, removing /api/tmdb
  const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
  const actualPath = urlObj.pathname.replace(/^\/api\/tmdb/, '').replace(/^\//, '');
  
  const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;

  if (!TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB API Key is not configured' });
  }

  const allowedOrigins = [
    'https://watchme-log.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ];

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const searchParams = new URLSearchParams();
  
  // Copy all search params from incoming request, preserving duplicates
  urlObj.searchParams.forEach((value, key) => {
    searchParams.append(key, value);
  });
  
  searchParams.append('api_key', TMDB_API_KEY);

  if (/^movie\/\d+$/.test(actualPath)) {
    if (!searchParams.has('append_to_response')) {
      searchParams.append('append_to_response', 'credits');
    }
  }

  const queryString = searchParams.toString();
  const url = `https://api.themoviedb.org/3/${actualPath}?${queryString}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: `TMDB API responded with status ${response.status}`,
        details: errorData
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[TMDB Proxy Error]:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
