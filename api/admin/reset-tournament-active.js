const SheetsService = require('../lib/sheets');

module.exports = async function handler(req, res) {
  console.log('Reset API called:', req.method);
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Creating SheetsService instance...');
    const sheetsService = new SheetsService();
    console.log('SheetsService instance created');
    
    console.log('Calling resetAllTournamentActive...');
    const result = await sheetsService.resetAllTournamentActive();
    console.log('Reset completed:', result);
    
    const now = new Date().toISOString();
    console.log(`[${now}] Manual tournament active reset by admin:`, result);
    
    return res.status(200).json({
      success: true,
      message: 'Tournament active status reset completed',
      timestamp: now,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    console.error('Admin reset error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return res.status(500).json({
      error: 'Failed to reset tournament active status',
      message: error.message,
      stack: error.stack
    });
  }
}