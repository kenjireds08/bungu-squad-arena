const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetsService = new SheetsService();
  
  try {
    await sheetsService.authenticate();
    
    // Fix the corrupted match_1 data
    const matchId = 'tournament_1753934765383_match_1';
    
    // Get current matches to fix the corrupted data
    const response = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'Matches!A:K'
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      throw new Error('No matches found');
    }

    // Find the corrupted match row
    const matchRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[0] === matchId
    );

    if (matchRowIndex !== -1) {
      const actualRowNumber = matchRowIndex + 1;
      
      // Fix the corrupted data - ensure correct player names
      await sheetsService.sheets.spreadsheets.values.update({
        spreadsheetId: sheetsService.spreadsheetId,
        range: `Matches!A${actualRowNumber}:K${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            matchId, // match_id
            'tournament_1753934765383', // tournament_id
            'match_1', // match_number
            'player_1753942268346_444ujdo4u', // player1_id
            'クリリン', // player1_name - FIXED
            'player_1753943387023_8ndu3qxfh', // player2_id
            '天津飯', // player2_name - FIXED
            'cardplus', // game_type
            'approved', // status
            'player_1753942268346_444ujdo4u', // winner_id (クリリン won)
            '2025-08-01T02:38:26.431Z' // created_at
          ]]
        }
      });

      console.log('Match data repaired successfully');
    }

    return res.status(200).json({
      success: true,
      message: 'Match data repaired successfully',
      matchId: matchId
    });
    
  } catch (error) {
    console.error('Error repairing match data:', error);
    return res.status(500).json({ 
      error: 'Failed to repair match data',
      details: error.message 
    });
  }
};