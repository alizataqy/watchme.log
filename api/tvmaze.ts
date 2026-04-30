import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
  const actualPath = urlObj.pathname.replace(/^\/api\/tvmaze/, '').replace(/^\//, '');
  
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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = Object.fromEntries(urlObj.searchParams);
  const searchParams = new URLSearchParams();
  
  if (actualPath.startsWith('shows/') && !actualPath.includes('/')) {
    searchParams.append('embed[]', 'nextepisode');
    searchParams.append('embed[]', 'previousepisode');
    searchParams.append('embed[]', 'cast');
  }

  for (const [key, value] of Object.entries(query)) {
    searchParams.append(key, value as string);
  }

  const queryString = searchParams.toString();
  const url = `https://api.tvmaze.com/${actualPath}${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({
        error: `TVMaze API responded with status ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[TVMaze Proxy Error]:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
