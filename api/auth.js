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
      
      // デバッグ: リクエストボディの内容を確認
      console.log('🔍 Auth request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 tournamentId received:', tournamentId, 'Type:', typeof tournamentId);
      
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
        
        // デバッグ: KVに保存するデータを確認
        console.log('🔍 Saving to KV:', JSON.stringify(playerData, null, 2));
        
        // KVにトークンとプレイヤー情報を保存（1時間有効）
        await kv.set(`verify:${token}`, JSON.stringify(playerData), { ex: 3600 });
        
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
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">BUNGU SQUAD アカウント認証</h2>
              <p>こんにちは、<strong>${nickname}</strong> さん</p>
              <p>BUNGU SQUADへのご登録ありがとうございます！</p>
              <p>アカウントの認証を完了するため、下記のボタンをクリックしてください：</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" 
                   style="background: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  メールアドレスを認証する
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                ※このリンクは1時間で無効になります。<br>
                ※もしボタンがクリックできない場合は、以下のURLをコピーしてブラウザに貼り付けてください：<br>
                <a href="${verifyUrl}">${verifyUrl}</a>
              </p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #999; font-size: 12px;">
                このメールに心当たりがない場合は、無視してください。
              </p>
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