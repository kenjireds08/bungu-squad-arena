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
    // KVからプレイヤー情報を取得
    const raw = await kv.get(`verify:${token}`);
    
    if (!raw) {
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
    
    // プレイヤー情報をパース（型を確認してから）
    const playerData = (typeof raw === 'string') ? JSON.parse(raw) : raw;
    
    // Sheetsにプレイヤーを正式登録（email_verified=TRUE）
    await sheets.addPlayer(playerData);
    
    // QRコードからの登録の場合は大会エントリーも自動実行
    if (playerData.tournamentId) {
      try {
        await sheets.setPlayerTournamentActive(playerData.email, true);
        console.log(`Auto-enrolled player ${playerData.email} in tournament ${playerData.tournamentId}`);
      } catch (entryError) {
        console.error('Failed to auto-enroll in tournament:', entryError);
        // 大会エントリー失敗してもユーザー登録は成功とする
      }
    }
    
    // トークンを削除（使い回し防止）
    await kv.del(`verify:${token}`);
    
    const isFromTournament = !!playerData.tournamentId;
    
    return res.status(200).send(`
      <html>
        <head><title>認証完了</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #28a745;">🎉 認証完了！</h1>
          <p>メールアドレスの認証が完了しました。</p>
          ${isFromTournament ? `
            <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h2 style="color: #28a745;">✅ 大会エントリー完了</h2>
              <p>自動的に大会にエントリーされました！</p>
              <p>大会待機画面で他の参加者をお待ちください。</p>
            </div>
            <a href="/tournament-waiting" style="display: inline-block; background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 10px;">大会待機画面へ</a>
          ` : `
            <p>ログインして大会に参加できます。</p>
          `}
          <a href="/" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px;">ログインページへ</a>
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