// 環境変数チェック関数 - Google Sheets依存を排除してESM/CJS問題を特定
module.exports = async function handler(req, res) {
  console.log("env-check handler start", Date.now());
  
  try {
    // 基本的な環境情報
    const basicInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    };
    
    console.log("Basic info:", basicInfo);
    
    // 環境変数チェック（値は表示しない）
    const envCheck = {
      hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length,
      hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
      sheetId: process.env.GOOGLE_SHEETS_ID, // ID は表示OK
      hasNodeEnv: !!process.env.NODE_ENV,
      nodeEnv: process.env.NODE_ENV
    };
    
    console.log("Environment check:", envCheck);
    
    // JSON構文チェック（サービスアカウントキーのパース確認）
    let jsonParseResult = "not_tested";
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        jsonParseResult = "success";
        console.log("JSON parse successful, keys:", Object.keys(parsed));
      } catch (jsonError) {
        jsonParseResult = `json_error: ${jsonError.message}`;
        console.error("JSON parse failed:", jsonError.message);
      }
    }
    
    return res.status(200).json({
      success: true,
      basicInfo,
      envCheck,
      jsonParseResult
    });
    
  } catch (error) {
    console.error("env-check error:", error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack,
      name: error.name
    });
  }
};