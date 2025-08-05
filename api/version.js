// Version API - Thin wrapper for admin.js to stop 404 spam
module.exports = async (req, res) => {
  try {
    // Delegate to admin.js with action=version
    req.query = { ...(req.query || {}), action: 'version' };
    const admin = require('./admin');
    return admin(req, res);
  } catch (error) {
    // Fallback response to prevent 404s
    console.error('Version API fallback:', error);
    res.status(200).json({ 
      version: 'v2.4.1-fallback', 
      ok: true,
      timestamp: new Date().toISOString()
    });
  }
};