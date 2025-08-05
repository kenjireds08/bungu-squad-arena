const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  // Debug mode for troubleshooting
  if (req.query.debug === '1') {
    return res.status(200).json({ 
      ok: true, 
      message: 'Debug mode - skipping actual logic',
      timestamp: new Date().toISOString(),
      query: req.query,
      method: req.method
    });
  }

  try {
    const sheetsService = new SheetsService();

    switch (req.method) {
      case 'GET':
        // Add caching to reduce API calls
        res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
        
        console.log(`Players API: ${req.method} ${JSON.stringify(req.query)}`);
        
        if (req.query.id) {
          const player = await sheetsService.getPlayer(req.query.id);
          if (!player) {
            return res.status(404).json({ error: 'Player not found' });
          }
          return res.status(200).json(player);
        } else {
          const players = await sheetsService.getPlayers();
          console.log(`Players API: Retrieved ${players.length} players`);
          return res.status(200).json(players);
        }

      case 'PUT':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Player ID is required' });
        }
        
        const { current_rating, email, nickname, profile_image_url, updateLastLogin, updateTournamentActive } = req.body;
        
        // Update rating if provided
        if (current_rating !== undefined) {
          if (typeof current_rating !== 'number') {
            return res.status(400).json({ error: 'Rating must be a number' });
          }
          const result = await sheetsService.updatePlayerRating(req.query.id, current_rating);
          return res.status(200).json(result);
        }
        
        // Update email if provided
        if (email !== undefined) {
          const result = await sheetsService.updatePlayerEmail(req.query.id, email);
          return res.status(200).json(result);
        }
        
        // Update nickname if provided
        if (nickname !== undefined) {
          const result = await sheetsService.updatePlayerNickname(req.query.id, nickname);
          return res.status(200).json(result);
        }
        
        // Update profile image if provided
        if (profile_image_url !== undefined) {
          const result = await sheetsService.updatePlayerProfileImage(req.query.id, profile_image_url);
          return res.status(200).json(result);
        }
        
        // Update last login if requested
        if (updateLastLogin) {
          const result = await sheetsService.updateLastLogin(req.query.id);
          return res.status(200).json(result);
        }

        // Update tournament active status if requested
        if (updateTournamentActive !== undefined) {
          const result = await sheetsService.updateTournamentActive(req.query.id, updateTournamentActive);
          return res.status(200).json(result);
        }
        
        return res.status(400).json({ error: 'No valid fields to update' });

      case 'DELETE':
        if (!req.query.id) {
          return res.status(400).json({ error: 'Player ID is required' });
        }

        // Delete player from Google Sheets
        const deleteResult = await sheetsService.deletePlayer(req.query.id);
        return res.status(200).json(deleteResult);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Players API Error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
      query: req.query,
      method: req.method
    });
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
}