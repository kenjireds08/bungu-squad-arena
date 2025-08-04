// Version API using Vercel KV for persistence
const { kv } = require('@vercel/kv');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  const id = (req.query.id || 'current').toString();
  const key = `tour:${id}:v`;

  if (req.method === 'GET') {
    const v = Number(await kv.get(key)) || 0;
    res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=5');
    return res.status(200).json({ v });
  }
  
  if (req.method === 'POST') {
    const v = await kv.incr(key);
    console.log(`Version incremented for ${key}: -> ${v}`);
    return res.status(200).json({ v });
  }
  
  res.setHeader('Allow', 'GET, POST');
  return res.status(405).end('Method Not Allowed');
};