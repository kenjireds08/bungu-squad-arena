// Global version counter (simple in-memory implementation)
// In production, this would use Vercel KV or Edge Config
if (!globalThis.versionCounters) {
  globalThis.versionCounters = new Map();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ error: 'Missing id parameter' });
  }

  const key = `tour:${id}:version`;
  
  if (req.method === 'GET') {
    // Get current version
    const version = globalThis.versionCounters.get(key) || 0;
    
    // Ultra-light caching for version checks
    res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=5');
    
    return res.status(200).json({ v: version });
  }
  
  if (req.method === 'POST') {
    // Increment version (called after successful operations)
    const currentVersion = globalThis.versionCounters.get(key) || 0;
    const newVersion = currentVersion + 1;
    globalThis.versionCounters.set(key, newVersion);
    
    console.log(`Version incremented for ${key}: ${currentVersion} -> ${newVersion}`);
    
    return res.status(200).json({ v: newVersion });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};