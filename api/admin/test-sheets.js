const SheetsService = require('../lib/sheets');

module.exports = async function handler(req, res) {
  console.log('Testing SheetsService...');
  
  try {
    // SheetsServiceのインスタンス化をテスト
    console.log('Creating SheetsService instance...');
    const sheetsService = new SheetsService();
    console.log('SheetsService instance created successfully');
    
    // 認証をテスト
    console.log('Testing authentication...');
    await sheetsService.authenticate();
    console.log('Authentication successful');
    
    // プレイヤー数だけを取得（実際のデータは取得しない）
    console.log('Testing player count...');
    const playersResponse = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'Players!A2:A1000'
    });
    const playerCount = (playersResponse.data.values || []).length;
    console.log(`Found ${playerCount} players`);
    
    return res.status(200).json({
      success: true,
      message: 'SheetsService test successful',
      playerCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('SheetsService test error:', error);
    return res.status(500).json({
      error: 'SheetsService test failed',
      message: error.message,
      stack: error.stack
    });
  }
}