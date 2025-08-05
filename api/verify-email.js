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
    
    // Debug logs (development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔍 Retrieved player data from KV:', JSON.stringify(playerData, null, 2));
      console.log('🔍 tournamentId check:', playerData.tournamentId, 'Type:', typeof playerData.tournamentId);
    }
    
    // Sheetsにプレイヤーを正式登録（email_verified=TRUE）
    await sheets.addPlayer(playerData);
    
    // QRコードからの登録の場合は大会エントリーも自動実行
    if (playerData.tournamentId) {
      try {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`Attempting auto-enrollment for player ${playerData.email} with ID ${playerData.id} in tournament ${playerData.tournamentId}`);
        }
        
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
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                margin: 0;
                padding: 20px;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              .container {
                background: #ffffff;
                border-radius: 16px;
                padding: 32px 24px;
                text-align: center;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
                max-width: 400px;
                width: 100%;
                margin-bottom: 20px;
                border: 1px solid rgba(0,0,0,0.06);
              }
              .checkmark {
                width: 64px;
                height: 64px;
                border-radius: 50%;
                background: #34d399;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                position: relative;
              }
              .checkmark::before {
                content: '';
                position: absolute;
                width: 100%;
                height: 100%;
                border-radius: 50%;
                background: #34d399;
                opacity: 0.2;
                animation: ripple 2s infinite;
              }
              .checkmark svg {
                width: 32px;
                height: 32px;
                fill: white;
                z-index: 1;
              }
              @keyframes ripple {
                0% { transform: scale(1); opacity: 0.2; }
                70% { transform: scale(1.4); opacity: 0; }
                100% { transform: scale(1.4); opacity: 0; }
              }
              .title {
                font-size: 24px;
                font-weight: 700;
                color: #1f2937;
                margin: 0 0 8px 0;
                line-height: 1.2;
              }
              .subtitle {
                font-size: 16px;
                color: #6b7280;
                margin: 0 0 32px 0;
                line-height: 1.4;
              }
              .loading {
                display: flex;
                justify-content: center;
                align-items: center;
                margin: 0;
              }
              .spinner {
                width: 20px;
                height: 20px;
                border: 2px solid #e5e7eb;
                border-top: 2px solid #34d399;
                border-radius: 50%;
                animation: spin 1s linear infinite;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              .loading-text {
                margin-left: 12px;
                font-size: 14px;
                color: #6b7280;
                font-weight: 500;
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