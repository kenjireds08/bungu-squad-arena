const { kv } = require('@vercel/kv');
const SheetsService = require('./lib/sheets');

const sheets = new SheetsService();

module.exports = async function handler(req, res) {
  const { token } = req.query;
  
  if (!token) {
    return res.status(400).send(`
      <html>
        <head><title>認証エラー</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">認証エラー</h1>
          <p>認証トークンが見つかりません。</p>
          <a href="/" style="color: #007bff;">トップページに戻る</a>
        </body>
      </html>
    `);
  }
  
  try {
    // KVからトークンを取得
    const email = await kv.get(`verify:${token}`);
    
    if (!email) {
      return res.status(400).send(`
        <html>
          <head><title>認証エラー</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #dc3545;">認証エラー</h1>
            <p>認証トークンが無効か有効期限が切れています。</p>
            <p>新規登録をやり直してください。</p>
            <a href="/" style="color: #007bff;">トップページに戻る</a>
          </body>
        </html>
      `);
    }
    
    // Sheetsでemail_verifiedをTRUEに更新
    await sheets.verifyPlayerEmail(email);
    
    // トークンを削除（使い回し防止）
    await kv.del(`verify:${token}`);
    
    return res.status(200).send(`
      <html>
        <head><title>認証完了</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #28a745;">認証完了！</h1>
          <p>メールアドレスの認証が完了しました。</p>
          <p>ログインして大会に参加できます。</p>
          <a href="/" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">ログインページへ</a>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Email verification error:', error);
    return res.status(500).send(`
      <html>
        <head><title>エラー</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #dc3545;">エラーが発生しました</h1>
          <p>認証処理中にエラーが発生しました。しばらく時間をおいて再度お試しください。</p>
          <a href="/" style="color: #007bff;">トップページに戻る</a>
        </body>
      </html>
    `);
  }
};