const SheetsService = require('./lib/sheets');
const crypto = require('crypto');
const { kv } = require('@vercel/kv');
const { Resend } = require('resend');

const sheets = new SheetsService();

module.exports = async function handler(req, res) {
  const { action } = req.query;
  
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
        const verifyUrl = `https://${req.headers.host}/api/verify-email?token=${token}`;
        
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
      // メール認証確認処理（現在は開発用で常にOK）
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }
      
      // 開発用：常に認証成功
      return res.status(200).json({ 
        success: true, 
        message: 'Email verified successfully' 
      });
      
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
    
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}