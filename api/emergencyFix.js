const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sheetsService = new SheetsService();
  
  try {
    await sheetsService.authenticate();
    
    // Get all matches first
    const response = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'Matches!A:K'
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      throw new Error('No matches found');
    }

    console.log('Current match data:', JSON.stringify(rows, null, 2));

    // Find match_1 row and fix it completely
    const matchRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[0] === 'tournament_1753934765383_match_1'
    );

    if (matchRowIndex !== -1) {
      const actualRowNumber = matchRowIndex + 1;
      
      console.log(`Fixing row ${actualRowNumber}`);
      
      // Completely rewrite the corrupted row with correct data
      await sheetsService.sheets.spreadsheets.values.update({
        spreadsheetId: sheetsService.spreadsheetId,
        range: `Matches!A${actualRowNumber}:K${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'tournament_1753934765383_match_1', // match_id
            'tournament_1753934765383', // tournament_id  
            'match_1', // match_number
            'player_1753942268346_444ujdo4u', // player1_id (クリリン)
            'クリリン', // player1_name
            'player_1753943387023_8ndu3qxfh', // player2_id (天津飯) - FIXED
            '天津飯', // player2_name - FIXED  
            'cardplus', // game_type
            'approved', // status - FIXED
            'player_1753942268346_444ujdo4u', // winner_id (クリリン won)
            '2025-08-01T02:38:26.431Z' // created_at
          ]]
        }
      });

      console.log('Match_1 data completely fixed');
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency fix completed',
      fixedMatch: 'tournament_1753934765383_match_1'
    });
    
  } catch (error) {
    console.error('Emergency fix failed:', error);
    return res.status(500).json({ 
      error: 'Emergency fix failed',
      details: error.message 
    });
  }
};