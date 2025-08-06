const SheetsService = require('./lib/sheets');
const crypto = require('crypto');
const { kv } = require('@vercel/kv');
const { Resend } = require('resend');

const sheets = new SheetsService();

module.exports = async function handler(req, res) {
  const { action } = req.query;
  
  // Detailed logging for debugging iPhone email verification issues
  console.log('🔍 Auth API Request:', {
    method: req.method,
    action: action,
    path: req.url,
    query: req.query,
    userAgent: req.headers['user-agent'],
    referer: req.headers.referer,
    host: req.headers.host,
    hasToken: !!req.query.token,
    timestamp: new Date().toISOString()
  });
  
  // CORS headers for iPhone Safari compatibility
  res.setHeader('Access-Control-Allow-Origin', 'https://ranking.bungu-squad.jp');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }
  
  try {
    if (action === 'admin-login') {
      // 管理者ログイン処理（POST）
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const { email, password } = req.body;
      
      // Server-side admin authentication
      const adminEmails = [
        'kenji.reds08@gmail.com',
        'mr.warabisako@gmail.com', 
        'yosshio@example.com'
      ];
      
      const adminPassword = process.env.ADMIN_PASSWORD || 'bungu-2025';
      
      if (!adminEmails.includes(email) || password !== adminPassword) {
        return res.status(401).json({ error: 'Invalid admin credentials' });
      }

      // Get user data from sheets
      const players = await sheets.getPlayers();
      const user = players.find(p => p.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ error: 'Admin user not found in system' });
      }

      return res.status(200).json({
        success: true,
        user: user,
        isAdmin: true,
        message: 'Admin authentication successful'
      });
      
    } else if (action === 'send-verification') {
      // メール認証リクエスト処理
      const { email, nickname, tournamentId } = req.body;
      
      // Debug logs (development only)
      if (process.env.NODE_ENV !== 'production') {
        console.log('🔍 Auth request body:', JSON.stringify(req.body, null, 2));
        console.log('🔍 tournamentId received:', tournamentId, 'Type:', typeof tournamentId);
      }
      
      if (!email || !nickname) {
        return res.status(400).json({ error: 'Email and nickname are required' });
      }
      
      try {
        // 既存プレイヤーチェック
        const players = await sheets.getPlayers();
        const existingPlayer = players.find(p => p.email.toLowerCase() === email.toLowerCase());
        
        if (existingPlayer) {
          return res.status(409).json({ error: 'このメールアドレスは既に登録されています' });
        }
        
        // 認証トークン生成
        const token = crypto.randomBytes(32).toString('hex');
        
        // プレイヤー情報をKVに一時保存（認証後に本登録）
        const playerId = `player_${Date.now()}`;
        const playerData = {
          id: playerId,
          nickname: nickname,
          email: email,
          current_rating: 1200,
          tournamentId: tournamentId || null, // QRコードからの場合は大会ID保存
        };
        
        // Debug logs (development only)
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔍 Saving to KV:', JSON.stringify(playerData, null, 2));
        }
        
        // KVにトークンとプレイヤー情報を保存（1時間有効）
        await kv.set(`verify:${token}`, JSON.stringify(playerData), { ex: 3600 });
        
        // 大会情報を取得（tournamentIdがある場合）
        let tournamentInfo = null;
        if (tournamentId) {
          try {
            const tournaments = await sheets.getTournaments();
            tournamentInfo = tournaments.find(t => t.id === tournamentId);
            if (process.env.NODE_ENV !== 'production') {
              console.log('🔍 Tournament info found:', tournamentInfo);
            }
          } catch (tourError) {
            console.warn('Failed to fetch tournament info:', tourError);
          }
        }
        
        // Resendでメール送信
        const resend = new Resend(process.env.RESEND_API_KEY);
        const verifyUrl = `https://${req.headers.host}/api/auth?action=verify&token=${token}`;
        
        console.log('Attempting to send email to:', email);
        console.log('Resend API Key exists:', !!process.env.RESEND_API_KEY);
        
        try {
          const result = await resend.emails.send({
          from: 'BUNGU SQUAD <noreply@ranking.bungu-squad.jp>',
          to: [email],
          subject: '【BUNGU SQUAD】メールアドレス認証のお願い',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; color: #333333; padding: 32px 24px;">
              
              <h1 style="color: #d4af37; font-size: 24px; font-weight: bold; margin: 0 0 24px 0;">BUNGU SQUAD メール認証</h1>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 16px 0;">${nickname}さん、</p>
              
              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">BUNGU SQUADの大会エントリーにお申し込みいただき、ありがとうございます。</p>

              ${tournamentInfo ? `
              <!-- Tournament Info Box -->
              <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 0 0 32px 0;">
                <h3 style="color: #333333; font-size: 18px; font-weight: bold; margin: 0 0 16px 0;">大会情報</h3>
                <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                  <div style="margin-bottom: 8px;"><strong>日時:</strong> ${tournamentInfo.date || new Date().toLocaleDateString('ja-JP')} ${tournamentInfo.start_time || '15:30〜'}</div>
                  <div style="margin-bottom: ${tournamentInfo.description ? '8px' : '0'};"><strong>場所:</strong> ${tournamentInfo.location || 'オンライン'}</div>
                  ${tournamentInfo.description ? `<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;"><strong>詳細:</strong><br>${tournamentInfo.description}</div>` : ''}
                </div>
              </div>
              ` : `
              <!-- Default Tournament Info -->
              <div style="background: #f5f5f5; border-radius: 8px; padding: 24px; margin: 0 0 32px 0;">
                <h3 style="color: #333333; font-size: 18px; font-weight: bold; margin: 0 0 16px 0;">大会情報</h3>
                <div style="color: #333333; font-size: 16px; line-height: 1.6;">
                  <div style="margin-bottom: 8px;"><strong>日時:</strong> ${new Date().toLocaleDateString('ja-JP')} 15:30〜</div>
                  <div><strong>場所:</strong> オンライン</div>
                </div>
              </div>
              `}

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0;">下記のリンクをクリックして、メール認証を完了してください：</p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 0 0 32px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: #d4af37; color: #ffffff; font-weight: bold; font-size: 16px; padding: 16px 32px; text-decoration: none; border-radius: 8px;">
                  メール認証を完了する
                </a>
              </div>

              <!-- Important Notes -->
              <div style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 32px 0;">
                <p style="margin: 0 0 8px 0;">※ このリンクは24時間で無効になります</p>
                <p style="margin: 0;">※ 認証完了後、自動的に大会にエントリーされます</p>
              </div>

              <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;">

              <!-- Footer -->
              <div style="color: #999999; font-size: 14px; text-align: left;">
                <p style="margin: 0 0 8px 0; font-weight: bold;">BUNGU SQUAD ランキングシステム</p>
                <p style="margin: 0;">このメールに心当たりがない場合は、このメールを無視してください。</p>
              </div>
            </div>
          `
          });
          
          console.log('✅ Resend send OK, id =', result.id);
          
        } catch (sendError) {
          console.error('❌ Resend send ERROR:', sendError);
          throw sendError;
        }
        
        return res.status(200).json({ 
          success: true, 
          message: '確認メールを送信しました。メール内のリンクをクリックして認証を完了してください。'
        });
        
      } catch (error) {
        console.error('Failed to send verification email:', error);
        return res.status(500).json({ error: 'メール送信に失敗しました。しばらく時間をおいて再度お試しください。' });
      }
      
    } else if (action === 'verify') {
      // メール認証確認処理（verify-email.jsから移植）
      const { token } = req.query;
      
      console.log('🔍 Email verification attempt:', { 
        token: token ? token.substring(0, 10) + '...' : 'missing',
        hasToken: !!token 
      });
      
      if (!token) {
        console.warn('❌ Verification failed: No token provided');
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
        console.log('🔍 KV lookup result:', { found: !!raw, type: typeof raw });
        
        if (!raw) {
          console.warn('❌ Verification failed: Token not found or expired');
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
                <div style="margin-top: 24px;">
                  <a href="/" style="display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                    PWAで開く
                  </a>
                </div>
                <script>
                  // リダイレクトを一時的に無効化（ルーティング問題を避けるため）
                  // 将来的にはKVに正しいリダイレクトURLを保存して302リダイレクト
                  // setTimeout(() => {
                  //   window.location.href = '/tournament-waiting';
                  // }, 3000);
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
        console.error('❌ Email verification error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          token: req.query.token ? req.query.token.substring(0, 10) + '...' : 'missing'
        });
        
        // NEVER return 500 - always return 200 with HTML fallback
        return res.status(200).send(`
          <html>
            <head>
              <title>認証エラー</title>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px; background: #f5f7fa;">
              <div style="background: white; padding: 40px; border-radius: 12px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
                <h1 style="color: #dc3545; margin-bottom: 20px;">⚠️ 認証エラー</h1>
                <p style="color: #6b7280; margin-bottom: 30px;">認証処理中にエラーが発生しました。<br>しばらく時間をおいて再度お試しください。</p>
                <a href="/" style="display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">PWAで開く</a>
              </div>
            </body>
          </html>
        `);
      }

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
  } catch (error) {
    console.error('❌ Auth API error:', error);
    console.error('❌ Request details:', {
      method: req.method,
      action: req.query.action,
      path: req.url,
      userAgent: req.headers['user-agent'],
      message: error.message,
      stack: error.stack
    });
    
    // NEVER return 500 - return appropriate response based on action
    if (req.query.action === 'verify-email') {
      // For email verification, always return HTML
      return res.status(200).send(`
        <html>
          <head>
            <title>認証エラー</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, sans-serif; text-align: center; padding: 50px; background: #f5f7fa;">
            <div style="background: white; padding: 40px; border-radius: 12px; max-width: 400px; margin: 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.1);">
              <h1 style="color: #dc3545; margin-bottom: 20px;">⚠️ システムエラー</h1>
              <p style="color: #6b7280; margin-bottom: 30px;">システムエラーが発生しました。<br>しばらく時間をおいて再度お試しください。</p>
              <a href="/" style="display: inline-block; background: #d4af37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px;">PWAで開く</a>
            </div>
          </body>
        </html>
      `);
    } else {
      // For other actions, return JSON with success:false
      return res.status(200).json({ success: false, error: error.message });
    }
  }
}