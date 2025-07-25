const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    switch (req.method) {
      case 'GET':
        const playerId = req.query.playerId;
        const matches = await sheetsService.getMatchHistory(playerId);
        return res.status(200).json(matches);

      case 'POST':
        const { player1Id, player2Id, result } = req.body;
        
        if (!player1Id || !player2Id || !result) {
          return res.status(400).json({ 
            error: 'player1Id, player2Id, and result are required' 
          });
        }

        if (!['win', 'loss', 'draw'].includes(result)) {
          return res.status(400).json({ 
            error: 'result must be win, loss, or draw' 
          });
        }

        const player1 = await sheetsService.getPlayer(player1Id);
        const player2 = await sheetsService.getPlayer(player2Id);

        if (!player1 || !player2) {
          return res.status(404).json({ error: 'One or both players not found' });
        }

        const ratingChanges = sheetsService.calculateEloRating(
          player1.rating,
          player2.rating,
          result,
          player1.matches
        );

        const matchResult = await sheetsService.addMatchResult(
          player1Id,
          player2Id,
          result,
          ratingChanges
        );

        return res.status(201).json({
          ...matchResult,
          ratingChanges
        });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}