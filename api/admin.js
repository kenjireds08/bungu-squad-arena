const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  const { action } = req.query;

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    switch (action) {
      case 'check-auth':
        return await handleCheckAuth(req, res);
      case 'reset-tournament-active':
        return await handleResetTournamentActive(req, res);
      case 'emergency-fix-match':
        return await handleEmergencyFixMatch(req, res);
      case 'fix-match-data':
        return await handleFixMatchData(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function handleCheckAuth(req, res) {
  try {
    const sheetsService = new SheetsService();
    const testData = await sheetsService.getRankings();
    
    return res.status(200).json({
      status: 'success',
      message: 'Google Sheets API is authenticated',
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      testDataCount: testData?.length || 0
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'Google Sheets API authentication failed',
      error: error.message,
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    });
  }
}

async function handleResetTournamentActive(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    
    // Use the comprehensive reset method that includes archiving
    const result = await sheetsService.resetAllTournamentActive();
    
    return res.status(200).json({
      success: true,
      message: `Successfully reset ${result.updatedCount} players and archived ${result.archivedCount} tournament entries`,
      updatedCount: result.updatedCount,
      archivedCount: result.archivedCount
    });

  } catch (error) {
    console.error('Reset tournament active error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleEmergencyFixMatch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();
    
    // Fix the corrupted match_1 data directly in Matches sheet
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
      index > 0 && row[0] === 'tournament_1753934765383_match_1'
    );

    if (matchRowIndex !== -1) {
      const actualRowNumber = matchRowIndex + 1;
      
      // Fix the corrupted data - ensure correct data structure
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

      console.log('Match_1 data emergency fixed');
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency match fix completed',
      fixedMatch: 'tournament_1753934765383_match_1'
    });
    
  } catch (error) {
    console.error('Emergency match fix failed:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

async function handleFixMatchData(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    
    // Use adminDirectMatchResult to fix the match with correct data
    const fixedResult = await sheetsService.adminDirectMatchResult({
      matchId: 'tournament_1753934765383_match_1',
      winnerId: 'player_1753942268346_444ujdo4u', // クリリン
      loserId: 'player_1753943387023_8ndu3qxfh', // 天津飯
      timestamp: '2025-08-01T02:38:26.431Z'
    });

    return res.status(200).json({
      success: true,
      message: 'Match data fixed using adminDirectMatchResult',
      result: fixedResult
    });
    
  } catch (error) {
    console.error('Fix match data failed:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}