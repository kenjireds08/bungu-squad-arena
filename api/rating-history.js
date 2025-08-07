const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { matchId } = req.query;

    if (!matchId) {
      return res.status(400).json({ error: 'matchId is required' });
    }

    const sheetsService = new SheetsService();

    try {
      // Get match results to find rating changes for this match
      const matchResults = await sheetsService.getMatchResults();
      const match = matchResults.find(m => m.id === matchId);
      
      if (match) {
        return res.status(200).json({
          winner_rating_change: match.player1_rating_change || 2,
          loser_rating_change: match.player2_rating_change || -2,
          player1_rating_change: match.player1_rating_change || 0,
          player2_rating_change: match.player2_rating_change || 0
        });
      } else {
        // Return default values if match not found
        return res.status(200).json({
          winner_rating_change: 2,
          loser_rating_change: -2
        });
      }
    } catch (error) {
      console.error('Rating history API error:', error);
      // Return default values if rating history is not available
      return res.status(200).json({
        winner_rating_change: 2,
        loser_rating_change: -2
      });
    }
  } catch (error) {
    console.error('Rating history API error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch rating history',
      winner_rating_change: 2,
      loser_rating_change: -2 
    });
  }
};