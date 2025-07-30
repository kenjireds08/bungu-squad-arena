const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    if (req.method === 'GET') {
      // Get rankings
      const rankings = await sheetsService.getRankings();
      return res.status(200).json(rankings);
    }

    if (req.method === 'POST') {
      // Create new player
      const { nickname, email, current_rating = 1200, tournament_active = true } = req.body;

      if (!nickname || !email) {
        return res.status(400).json({ error: 'Nickname and email are required' });
      }

      // Generate unique player ID
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newPlayer = {
        id: playerId,
        nickname: nickname.trim(),
        email: email.trim(),
        current_rating,
        tournament_active,
        total_matches: 0,
        wins: 0,
        losses: 0,
        created_at: new Date().toISOString(),
        last_activity_date: new Date().toISOString().split('T')[0]
      };

      // Add player to Google Sheets
      await sheetsService.addPlayer(newPlayer);

      return res.status(201).json(newPlayer);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}