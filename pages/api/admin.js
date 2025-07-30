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