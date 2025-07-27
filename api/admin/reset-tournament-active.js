const { SheetsService } = require('../lib/sheets.js');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    const result = await sheetsService.resetAllTournamentActive();
    
    const now = new Date().toISOString();
    console.log(`[${now}] Manual tournament active reset by admin:`, result);
    
    return res.status(200).json({
      success: true,
      message: 'Tournament active status reset completed',
      timestamp: now,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    console.error('Admin reset error:', error);
    return res.status(500).json({
      error: 'Failed to reset tournament active status',
      message: error.message
    });
  }
}