import { SheetsService } from './lib/sheets.js';

const sheetsService = new SheetsService();

// Simple in-memory store for verification codes (in production, use Redis/database)
const verificationCodes = new Map();

export default async function handler(req, res) {
  console.log('Email verification API called:', req.method, req.url);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    if (req.method === 'POST' && req.url === '/api/email-verification/send') {
      return await sendVerificationEmail(req, res);
    }
    
    if (req.method === 'POST' && req.url === '/api/email-verification/verify') {
      return await verifyEmail(req, res);
    }
    
    if (req.method === 'GET' && req.url.startsWith('/api/email-verification/confirm/')) {
      return await confirmEmail(req, res);
    }
    
    return res.status(404).json({ error: 'Not found' });
    
  } catch (error) {
    console.error('Email verification API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Send verification email
async function sendVerificationEmail(req, res) {
  const { email, nickname, tournamentId } = req.body;
  
  if (!email || !nickname || !tournamentId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Generate verification code
  const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes
  
  // Store verification data
  verificationCodes.set(verificationCode, {
    email,
    nickname,
    tournamentId,
    expiresAt,
    verified: false
  });
  
  // Get tournament info
  let tournamentName = '大会';
  try {
    const tournaments = await sheetsService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    tournamentName = tournament ? tournament.name || tournament.tournament_name : '大会';
  } catch (error) {
    console.warn('Failed to get tournament name:', error);
  }
  
  // In production, you would send actual email here using services like:
  // - SendGrid, Mailgun, AWS SES, etc.
  // For now, we'll log the verification link
  
  const verificationLink = `${req.headers.origin || 'https://bungu-squad-arena.vercel.app'}/api/email-verification/confirm/${verificationCode}`;
  
  console.log('=== EMAIL VERIFICATION ===');
  console.log('To:', email);
  console.log('Subject: BUNGU SQUAD大会 エントリー認証');
  console.log('Body:');
  console.log(`
${nickname}さん

BUNGU SQUAD大会（${tournamentName}）へのエントリー認証を行います。

以下のリンクをクリックして、エントリーを完了してください：

${verificationLink}

このリンクは15分間有効です。
期限が切れた場合は、再度QRコードからエントリーしてください。

※このメールに覚えのない場合は、無視してください。

BUNGU SQUAD運営チーム
  `);
  console.log('========================');
  
  // TODO: Replace with actual email sending service
  // await sendEmailService.send({
  //   to: email,
  //   subject: 'BUNGU SQUAD大会 エントリー認証',
  //   text: emailBody
  // });
  
  return res.status(200).json({ 
    success: true,
    message: 'メール認証を送信しました。メールを確認してエントリーを完了してください。',
    // For development only - remove in production
    verificationLink: process.env.NODE_ENV === 'development' ? verificationLink : undefined
  });
}

// Verify email via link click
async function confirmEmail(req, res) {
  const verificationCode = req.url.split('/').pop();
  
  if (!verificationCode) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head><title>認証エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>認証エラー</h2>
          <p>不正な認証リンクです。</p>
        </body>
      </html>
    `);
  }
  
  const verificationData = verificationCodes.get(verificationCode);
  
  if (!verificationData) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>認証エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>認証エラー</h2>
          <p>認証リンクが見つからないか、既に使用済みです。</p>
          <p>再度QRコードからエントリーしてください。</p>
        </body>
      </html>
    `);
  }
  
  if (Date.now() > verificationData.expiresAt) {
    verificationCodes.delete(verificationCode);
    return res.status(410).send(`
      <!DOCTYPE html>
      <html>
        <head><title>認証期限切れ</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>認証期限切れ</h2>
          <p>認証リンクの有効期限が切れています。</p>
          <p>再度QRコードからエントリーしてください。</p>
        </body>
      </html>
    `);
  }
  
  if (verificationData.verified) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head><title>エントリー完了</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>✅ エントリー完了</h2>
          <p>${verificationData.nickname}さんのエントリーは既に完了しています。</p>
          <p><a href="/">アプリに戻る</a></p>
        </body>
      </html>
    `);
  }
  
  try {
    // Complete tournament entry
    const { email, nickname, tournamentId } = verificationData;
    
    // Register player and activate tournament status
    await registerPlayerForTournament(email, nickname, tournamentId);
    
    // Mark as verified
    verificationData.verified = true;
    
    // Clean up after successful verification (optional delay)
    setTimeout(() => {
      verificationCodes.delete(verificationCode);
    }, 60000); // Keep for 1 minute for confirmation page
    
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>エントリー完了</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px; background: linear-gradient(180deg, #F5F1E8, #EDE7D5);">
          <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto;">
            <h2 style="color: #DAA520; margin-bottom: 20px;">🎉 エントリー完了</h2>
            <p><strong>${nickname}</strong>さんのエントリーが完了しました！</p>
            <p style="color: #666; font-size: 14px; margin: 20px 0;">大会開始まで、アプリでお待ちください。</p>
            <a href="/" style="
              display: inline-block;
              background: #DAA520;
              color: white;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 6px;
              margin-top: 20px;
            ">アプリに戻る</a>
          </div>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Failed to complete tournament entry:', error);
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head><title>エラー</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h2>エントリーエラー</h2>
          <p>エントリー処理中にエラーが発生しました。</p>
          <p>管理者にお問い合わせください。</p>
          <p><a href="/">アプリに戻る</a></p>
        </body>
      </html>
    `);
  }
}

// Register player for tournament
async function registerPlayerForTournament(email, nickname, tournamentId) {
  try {
    // Check if player already exists
    const players = await sheetsService.getPlayers();
    let player = players.find(p => p.email_address === email);
    
    if (!player) {
      // Create new player
      const playerData = {
        nickname,
        email_address: email,
        rating: 1200, // Starting rating
        tournament_active: true,
        created_at: new Date().toISOString(),
        password_hash: '', // No password for QR entries
        is_admin: false,
        wins: 0,
        losses: 0,
        games_played: 0
      };
      
      await sheetsService.addPlayer(playerData);
      console.log('New player created:', nickname, email);
    } else {
      // Update existing player's tournament status
      await sheetsService.updatePlayer(player.id, { tournament_active: true });
      console.log('Existing player activated for tournament:', nickname, email);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to register player for tournament:', error);
    throw error;
  }
}