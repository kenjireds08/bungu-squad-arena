const { Resend } = require('resend');

// In-memory storage for verification codes (production should use Redis/Database)
const verificationCodes = new Map();

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    if (req.method === 'POST') {
      const { action, email, code, nickname } = req.body;

      if (action === 'send') {
        // Send verification code
        if (!email || !nickname) {
          return res.status(400).json({ error: 'Email and nickname are required' });
        }

        // Generate 4-digit code
        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        // Store code with expiration (5 minutes)
        const expiresAt = Date.now() + 5 * 60 * 1000;
        verificationCodes.set(email, {
          code: verificationCode,
          nickname,
          expiresAt,
          attempts: 0
        });

        // Send email using Resend
        if (process.env.RESEND_API_KEY) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          try {
            await resend.emails.send({
              from: 'BUNGU SQUAD <noreply@bungu-squad-arena.vercel.app>',
              to: [email],
              subject: '【BUNGU SQUAD】大会エントリー確認コード',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">BUNGU SQUAD 大会エントリー</h2>
                  <p>こんにちは、${nickname}さん</p>
                  <p>大会エントリーのための確認コードをお送りします。</p>
                  
                  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <h3 style="color: #1f2937; margin: 0;">確認コード</h3>
                    <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 10px 0;">
                      ${verificationCode}
                    </div>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px;">
                    ※このコードは5分間有効です。<br>
                    ※このメールに心当たりがない場合は、無視してください。
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                  <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                    BUNGU SQUAD Arena - 文具を使ったカードゲーム大会
                  </p>
                </div>
              `
            });

            console.log(`Verification code sent to ${email}: ${verificationCode}`);
          } catch (emailError) {
            console.error('Failed to send email:', emailError);
            // Continue even if email fails - code is still stored
          }
        } else {
          console.log(`Verification code for ${email}: ${verificationCode} (RESEND_API_KEY not configured)`);
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Verification code sent',
          // Include code in response for development (remove in production)
          ...(process.env.NODE_ENV === 'development' && { code: verificationCode })
        });

      } else if (action === 'verify') {
        // Verify code
        if (!email || !code) {
          return res.status(400).json({ error: 'Email and code are required' });
        }

        const stored = verificationCodes.get(email);
        if (!stored) {
          return res.status(400).json({ error: 'No verification code found for this email' });
        }

        // Check expiration
        if (Date.now() > stored.expiresAt) {
          verificationCodes.delete(email);
          return res.status(400).json({ error: 'Verification code has expired' });
        }

        // Check attempts (max 3)
        if (stored.attempts >= 3) {
          verificationCodes.delete(email);
          return res.status(400).json({ error: 'Too many failed attempts' });
        }

        // Verify code
        if (stored.code !== code) {
          stored.attempts++;
          return res.status(400).json({ error: 'Invalid verification code' });
        }

        // Success - remove code and return user data
        const userData = { email, nickname: stored.nickname };
        verificationCodes.delete(email);

        return res.status(200).json({ 
          success: true, 
          message: 'Verification successful',
          userData
        });

      } else {
        return res.status(400).json({ error: 'Invalid action' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Verification API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};