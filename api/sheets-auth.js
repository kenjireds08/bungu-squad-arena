// Google Sheets認証テスト - 認証のみをテストする最小限の関数
const { google } = require('googleapis');

module.exports = async function handler(req, res) {
  console.log("sheets-auth handler start", Date.now());
  
  try {
    // 環境変数チェック
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not set');
    }
    
    if (!process.env.GOOGLE_SHEETS_ID) {
      throw new Error('GOOGLE_SHEETS_ID is not set');
    }
    
    console.log("Environment variables present, attempting authentication...");
    
    // サービスアカウント認証設定
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    console.log("Service account email:", credentials.client_email);
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    console.log("GoogleAuth created, getting client...");
    
    // 認証クライアント取得
    const authClient = await auth.getClient();
    console.log("Auth client obtained successfully");
    
    // Sheets APIクライアント作成
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    console.log("Sheets client created successfully");
    
    // 認証テスト完了
    return res.status(200).json({
      success: true,
      message: "Google Sheets authentication successful",
      serviceAccountEmail: credentials.client_email,
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Sheets auth error:", error);
    console.error("Error stack:", error.stack);
    
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });
  }
};