import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // X-Forwarded-For is common on Vercel
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress;
  
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.status(200).json({ ip });
}
