/**
 * Google Sheets API認証のためのユーティリティ
 * Base64エンコードされたサービスアカウントキーを使用
 */

const { google } = require('googleapis');

/**
 * Google Sheets API認証クライアントを作成
 * @param {boolean} readOnly - 読み取り専用かどうか
 * @returns {google.auth.GoogleAuth} 認証済みクライアント
 */
function createSheetsAuth(readOnly = false) {
  // Base64エンコードされた認証情報を優先的に使用
  const base64Key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64;
  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  let credentials;
  
  if (base64Key) {
    try {
      // Base64デコードしてJSONとして解析
      const decoded = Buffer.from(base64Key, 'base64').toString('utf8');
      credentials = JSON.parse(decoded);
      console.log('✅ Base64認証情報を使用');
    } catch (error) {
      console.error('❌ Base64認証情報の解析に失敗:', error.message);
      throw new Error('Base64認証情報が無効です');
    }
  } else if (jsonKey) {
    try {
      // 既存のJSON形式（後方互換性のため）
      // Vercelの環境変数で問題のある文字を修復
      let processedKey = jsonKey;
      
      // エスケープされた改行文字を実際の改行に変換
      if (processedKey.includes('\\n')) {
        processedKey = processedKey.replace(/\\n/g, '\n');
      }
      
      // private_keyセクションで特に問題になりやすい制御文字を修復
      // Position 179周辺（KEY-----の後）の問題を修復
      processedKey = processedKey.replace(/-----\n/g, '-----\n');
      processedKey = processedKey.replace(/\n-----/g, '\n-----');
      
      // JSONの中で問題になる制御文字を除去（改行文字以外）
      processedKey = processedKey.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      credentials = JSON.parse(processedKey);
      console.log('✅ JSON認証情報を使用（処理済み）');
    } catch (error) {
      console.error('❌ JSON認証情報の解析に失敗:', error.message);
      // デバッグ情報を追加
      console.error('JSON長さ:', jsonKey?.length);
      console.error('エラー位置周辺:', jsonKey?.substring(170, 200));
      throw new Error('JSON認証情報が無効です: ' + error.message);
    }
  } else {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_B64またはGOOGLE_SERVICE_ACCOUNT_KEYが設定されていません');
  }
  
  const scopes = readOnly 
    ? ['https://www.googleapis.com/auth/spreadsheets.readonly']
    : ['https://www.googleapis.com/auth/spreadsheets'];
  
  return new google.auth.GoogleAuth({
    credentials,
    scopes
  });
}

/**
 * Google Sheetsクライアントを作成
 * @param {boolean} readOnly - 読み取り専用かどうか
 * @returns {Promise<google.sheets>} Sheetsクライアント
 */
async function createSheetsClient(readOnly = false) {
  const auth = createSheetsAuth(readOnly);
  const authClient = await auth.getClient();
  
  return google.sheets({ 
    version: 'v4', 
    auth: authClient 
  });
}

module.exports = {
  createSheetsAuth,
  createSheetsClient
};