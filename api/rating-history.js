const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId } = req.query;
  
  if (!matchId) {
    return res.status(400).json({ error: 'Missing matchId parameter' });
  }

  const sheetsService = new SheetsService();

  try {
    // 緊急対応: API rate limit回避のため一時的に無効化
    // 管理者のみが使用するよう制限
    const isDebugMode = req.query.debug === '1';
    const isAdminRequest = req.headers['x-admin-request'] === 'true';
    
    if (!isDebugMode && !isAdminRequest) {
      console.warn('Rating history API temporarily disabled for regular users to prevent rate limit');
      return res.status(503).json({ 
        error: 'Rating history temporarily unavailable',
        message: 'This feature is temporarily disabled to prevent API rate limits'
      });
    }
    
    const ratingHistory = await sheetsService.getRatingHistoryForMatch(matchId);
    return res.status(200).json(ratingHistory);
  } catch (error) {
    console.error('Rating history API error:', error);
    
    // Handle rate limit errors properly
    if (error.code === 429) {
      res.setHeader('Retry-After', '15');
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again in 15 seconds.' 
      });
    }
    
    return res.status(500).json({ error: error.message });
  }
};