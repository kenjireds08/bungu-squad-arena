const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  const sheetsService = new SheetsService();
  
  try {
    await sheetsService.authenticate();
    
    // Directly update TournamentMatches sheet 
    const response = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'TournamentMatches!A:N'
    });

    const rows = response.data.values || [];
    
    // Find the corrupted match row
    const matchRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[0] === 'tournament_1753934765383_match_1'
    );

    if (matchRowIndex !== -1) {
      const actualRowNumber = matchRowIndex + 1;
      
      // Fix only the corrupted fields
      await sheetsService.sheets.spreadsheets.values.update({
        spreadsheetId: sheetsService.spreadsheetId,
        range: `TournamentMatches!F${actualRowNumber}:G${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'player_1753943387023_8ndu3qxfh', // player2_id (天津飯の正しいID)
            '天津飯' // player2_name
          ]]
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Match data fixed in TournamentMatches sheet'
    });
    
  } catch (error) {
    console.error('Direct fix failed:', error);
    return res.status(500).json({ 
      error: 'Direct fix failed',
      details: error.message 
    });
  }
};