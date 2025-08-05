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
    
    // デバッグ: 取得したプレイヤーデータをログ出力
    console.log('🔍 Retrieved player data from KV:', JSON.stringify(playerData, null, 2));
    console.log('🔍 tournamentId check:', playerData.tournamentId, 'Type:', typeof playerData.tournamentId);
    
    // Sheetsにプレイヤーを正式登録（email_verified=TRUE）
    await sheets.addPlayer(playerData);
    
    // QRコードからの登録の場合は大会エントリーも自動実行
    if (playerData.tournamentId) {
      try {
        console.log(`Attempting auto-enrollment for player ${playerData.email} with ID ${playerData.id} in tournament ${playerData.tournamentId}`);
        
        // プレイヤーIDを使って大会エントリーを更新
        await sheets.updateTournamentActive(playerData.id, true);
        console.log(`✅ Auto-enrolled player ${playerData.email} (ID: ${playerData.id}) in tournament ${playerData.tournamentId}`);
      } catch (entryError) {
        console.error('❌ Failed to auto-enroll in tournament:', entryError);
        // 大会エントリー失敗してもユーザー登録は成功とする
      }
    }
    
    // トークンを削除（使い回し防止）
    await kv.del(`verify:${token}`);
    
    const isFromTournament = !!playerData.tournamentId;
    
    // QRコードからの場合は専用の成功画面を表示
    if (isFromTournament) {
      return res.status(200).send(`
        <html>
          <head>
            <title>QRコード読み取り完了</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
              }
              .container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 400px;
                width: 90%;
              }
              .checkmark {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #28a745;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
                animation: pulse 2s infinite;
              }
              .checkmark svg {
                width: 40px;
                height: 40px;
                fill: white;
              }
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
              }
              .title {
                font-size: 28px;
                font-weight: bold;
                color: #333;
                margin: 20px 0;
              }
              .subtitle {
                font-size: 18px;
                color: #666;
                margin: 10px 0 20px;
              }
              .loading {
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 30px 0;
              }
              .spinner {
                width: 40px;
                height: 40px;
                border: 4px solid #f3f3f3;
                border-top: 4px solid #28a745;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .loading-text {
                margin-left: 15px;
                font-size: 16px;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="checkmark">
                <svg viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              </div>
              <div class="title">QRコード読み取り完了！</div>
              <div class="subtitle">大会エントリーが完了しました</div>
              <div class="loading">
                <div class="spinner"></div>
                <div class="loading-text">待機画面に移動しています...</div>
              </div>
            </div>
            <script>
              // 3秒後に大会待機画面に自動遷移  
              setTimeout(() => {
                window.location.href = '/tournament-waiting';
              }, 3000);
            </script>
          </body>
        </html>
      `);
    } else {
      // 通常の認証完了画面（QRコード以外からの登録）
      return res.status(200).send(`
        <html>
          <head><title>認証完了</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #28a745;">🎉 認証完了！</h1>
            <p>メールアドレスの認証が完了しました。</p>
            <p>ログインして大会に参加できます。</p>
            <a href="/" style="display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px;">ログインページへ</a>
          </body>
        </html>
      `);
    }
    
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