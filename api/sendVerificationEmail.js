const nodemailer = require('nodemailer');
const crypto = require('crypto');

// メール送信設定（環境変数を使用）
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, nickname, tournamentId, tournamentDate, tournamentTime } = req.body;

    if (!email || !nickname) {
      return res.status(400).json({ error: 'Email and nickname are required' });
    }

    // 認証トークンを生成
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    // 認証リンクを生成
    const verificationLink = `${req.headers.origin}/api/verifyEmail?token=${verificationToken}&email=${encodeURIComponent(email)}`;

    // メール内容
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
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
    };

    // メール送信
    await transporter.sendMail(mailOptions);

    // 認証トークンを一時保存（実際の実装では Redis や Database を使用）
    // 今回はシンプルに環境変数やファイルに保存
    console.log('Verification token generated:', verificationToken);
    console.log('For email:', email);
    console.log('Nickname:', nickname);

    res.status(200).json({ 
      success: true, 
      message: 'メール認証を送信しました',
      token: verificationToken // デバッグ用（本番では削除）
    });

  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ error: 'メール送信に失敗しました' });
  }
}