const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    switch (req.method) {
      case 'GET':
        if (req.query.id) {
          const player = await sheetsService.getPlayer(req.query.id);
          if (!player) {
            return res.status(404).json({ error: 'Player not found' });
          }
          return res.status(200).json(player);
        } else {
          const players = await sheetsService.getPlayers();
          return res.status(200).json(players);
        }

      case 'PUT':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Player ID is required' });
        }
        
        const { current_rating } = req.body;
        if (typeof current_rating !== 'number') {
          return res.status(400).json({ error: 'Rating must be a number' });
        }

        const result = await sheetsService.updatePlayerRating(req.query.id, current_rating);
        return res.status(200).json(result);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}