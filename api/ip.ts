import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // X-Forwarded-For is common on Vercel
  const forwarded = req.headers['x-forwarded-for'];
  const cfIp = req.headers['cf-connecting-ip'];
  const cfCountry = req.headers['cf-ipcountry'];

  const ip = typeof cfIp === 'string' ? cfIp : (typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress);
  const country = typeof cfCountry === 'string' ? cfCountry : (req.headers['x-vercel-ip-country'] as string) || 'Unknown';
  
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ ip, country });
}
