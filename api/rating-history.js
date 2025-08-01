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
    const ratingHistory = await sheetsService.getRatingHistoryForMatch(matchId);
    return res.status(200).json(ratingHistory);
  } catch (error) {
    console.error('Rating history API error:', error);
    return res.status(500).json({ error: error.message });
  }
};