const { Resend } = require('resend');
const crypto = require('crypto');

// 認証トークン管理用のシンプルなメモリストレージ
// 本番環境では Redis や Database を推奨
let verificationTokens = new Map();

module.exports = async function handler(req, res) {
  console.log('=== AUTH HANDLER START ===');
  console.log('Auth handler called:', req.method, req.url);
  console.log('Request body:', req.body);
  console.log('Headers:', req.headers);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // テスト用：すぐにレスポンスを返す
    if (req.method === 'POST') {
      console.log('POST request received');
      // return res.status(200).json({ test: 'ok', body: req.body });
    }
    
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const action = searchParams.get('action');
    console.log('Action:', action);
    
    // メール認証送信
    if (req.method === 'POST' && action === 'send-verification') {
      return await sendVerificationEmail(req, res);
    }
    
    // メール認証確認
    if (req.method === 'GET' && action === 'verify') {
      return await verifyEmail(req, res);
    }
    
    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('Auth API error:', error);
    return res.status(500).json({ error: 'メール認証処理に失敗しました' });
  }
}

// メール認証送信（Resend API使用）
async function sendVerificationEmail(req, res) {
  console.log('sendVerificationEmail called with body:', req.body);
  
  const { email, nickname, tournamentId, tournamentDate, tournamentTime } = req.body;

  if (!email || !nickname) {
    console.log('Missing email or nickname:', { email, nickname });
    return res.status(400).json({ error: 'Email and nickname are required' });
  }

  // 認証トークンを生成
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

  // 認証リンクを生成
  const verificationLink = `${req.headers.origin}/api/auth?action=verify&token=${verificationToken}`;

  try {
    console.log('Sending email to:', email);
    console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Set' : 'Not set');
    
    // Resend APIでメール送信
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    console.log('About to call resend.emails.send...');
    // 一時的に送信先を固定（Resendの制限回避）
    const testEmail = 'kli@k-lifeinnovation.com';
    const emailResult = await resend.emails.send({
      from: 'BUNGU SQUAD <onboarding@resend.dev>',
      to: testEmail,
      subject: 'BUNGU SQUAD - メール認証のお願い',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <h2 style="color: #D4A853;">BUNGU SQUAD メール認証</h2>
          
          <p><strong>${nickname}</strong>さん、</p>
          
          <p>BUNGU SQUADの大会エントリーにお申し込みいただき、ありがとうございます。</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0;">大会情報</h3>
            <p><strong>日時:</strong> ${tournamentDate} ${tournamentTime}〜</p>
            <p><strong>場所:</strong> オンライン</p>
          </div>
          
          <p>下記のリンクをクリックして、メール認証を完了してください：</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" 
               style="background-color: #D4A853; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              メール認証を完了する
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            ※ このリンクは24時間で無効になります<br>
            ※ 認証完了後、自動的に大会にエントリーされます
          </p>
          
          <hr style="margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            BUNGU SQUAD ランキングシステム<br>
            このメールに心当たりがない場合は、このメールを無視してください。
          </p>
        </div>
      `
    });
    
    console.log('Email sent successfully:', JSON.stringify(emailResult, null, 2));

    // 認証トークンをメモリに保存
    verificationTokens.set(verificationToken, {
      email,
      nickname,
      tournamentId,
      tournamentDate,
      tournamentTime,
      expiryTime
    });

    res.status(200).json({ 
      success: true, 
      message: 'メール認証を送信しました'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'メール送信に失敗しました: ' + error.message });
  }
}

// メール認証確認
async function verifyEmail(req, res) {
  const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
  const token = searchParams.get('token');

  if (!token) {
    return res.status(400).redirect('/?error=invalid_token');
  }

  // トークンの検証
  const verificationData = verificationTokens.get(token);
  
  if (!verificationData) {
    return res.status(400).redirect('/?error=expired_token');
  }

  if (new Date() > verificationData.expiryTime) {
    verificationTokens.delete(token);
    return res.status(400).redirect('/?error=expired_token');
  }

  console.log('Token verified for:', verificationData.email);

  try {
    // ユーザーアカウントを作成
    const newUser = {
      nickname: verificationData.nickname,
      email: verificationData.email,
      current_rating: 1200,
      tournament_active: true,
      rating_change: 0,
      games_played: 0,
      wins: 0,
      losses: 0,
      last_played: new Date().toISOString().split('T')[0]
    };

    // データベースに保存
    const createResponse = await fetch(`${req.headers.origin}/api/rankings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      console.error('User creation failed:', errorData);
      return res.status(500).redirect('/?error=creation_failed');
    }

    const createdUser = await createResponse.json();
    console.log('User created successfully:', createdUser.id);

    // 使用済みトークンを削除
    verificationTokens.delete(token);

    // 成功: 待機画面にリダイレクト（ユーザーIDを含む）
    res.writeHead(302, {
      Location: `/tournament-waiting?verified=true&userId=${createdUser.id}&nickname=${encodeURIComponent(verificationData.nickname)}`
    });
    res.end();

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).redirect('/?error=verification_failed');
  }
}

// トークン管理ユーティリティ（期限切れクリーンアップ用）
function cleanupExpiredTokens() {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [token, data] of verificationTokens.entries()) {
    if (now > data.expiryTime) {
      verificationTokens.delete(token);
      cleanedCount++;
    }
  }
  
  console.log('Cleaned up expired tokens:', cleanedCount);
  return cleanedCount;
}

module.exports.cleanupExpiredTokens = cleanupExpiredTokens;