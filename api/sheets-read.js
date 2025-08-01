// Google Sheets読み取りテスト - 基本的な読み取り操作のテスト
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  console.log("sheets-read handler start", Date.now());
  
  try {
    // 環境変数チェック
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY || !process.env.GOOGLE_SHEETS_ID) {
      throw new Error('Required environment variables are missing');
    }
    
    console.log("Setting up Google Sheets authentication...");
    
    // サービスアカウント認証
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const authClient = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    
    console.log("Attempting to read from Players sheet...");
    
    // 基本的な読み取りテスト - Players!A1:C10の範囲を読む
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Players!A1:C10'
    });
    
    const rows = response.data.values || [];
    console.log(`Successfully read ${rows.length} rows from Players sheet`);
    
    return res.status(200).json({
      success: true,
      message: "Google Sheets read test successful",
      rowCount: rows.length,
      sampleData: rows.slice(0, 3), // 最初の3行のみ表示
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      range: 'Players!A1:C10',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Sheets read error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.status
    });
    
    return res.status(500).json({
      error: error.message,
      code: error.code,
      status: error.status,
      name: error.name,
      timestamp: new Date().toISOString()
    });
  }
};