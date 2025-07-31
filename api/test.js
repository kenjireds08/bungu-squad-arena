const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    // Environment check
    const envCheck = {
      hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
      sheetId: process.env.GOOGLE_SHEETS_ID,
      serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length,
      serviceAccountStart: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.substring(0, 50)
    };

    console.log('Environment check:', envCheck);

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_ID) {
      return res.status(500).json({ 
        error: 'Missing environment variables',
        envCheck 
      });
    }

    // Test Google Sheets connection
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    // Try a simple read operation
    const response = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'Players!A1:A1'
    });

    return res.status(200).json({
      success: true,
      message: 'API connection successful',
      envCheck,
      testResult: {
        hasData: !!response.data.values,
        dataLength: response.data.values?.length || 0
      }
    });

  } catch (error) {
    console.error('Test API Error:', error);
    return res.status(500).json({ 
      error: error.message,
      envCheck: {
        hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
        sheetId: process.env.GOOGLE_SHEETS_ID,
        serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length
      }
    });
  }
};