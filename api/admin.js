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
    
    // Get all players
    const players = await sheetsService.getRankings();
    
    // Count players with tournament_active = true
    const activePlayers = players.filter(player => player.tournament_active === true);
    const activeCount = activePlayers.length;
    
    if (activeCount === 0) {
      return res.status(200).json({
        success: true,
        message: 'No players to reset',
        updatedCount: 0,
        archivedCount: 0
      });
    }

    // Reset tournament_active to false for all active players
    let updatedCount = 0;
    for (const player of activePlayers) {
      try {
        await sheetsService.updateTournamentActive(player.id, false);
        updatedCount++;
      } catch (error) {
        console.error(`Failed to reset player ${player.id}:`, error);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully reset ${updatedCount} players`,
      updatedCount: updatedCount,
      archivedCount: 0 // TODO: Implement archiving if needed
    });

  } catch (error) {
    console.error('Reset tournament active error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}