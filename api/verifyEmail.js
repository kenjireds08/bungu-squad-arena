const { getVerificationData, removeVerificationToken } = require('./verificationTokens.js');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).redirect('/?error=invalid_token');
    }

    // トークンの検証
    const verificationData = getVerificationData(token);
    
    if (!verificationData) {
      return res.status(400).redirect('/?error=expired_token');
    }

    console.log('Token verified for:', verificationData.email);

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
    removeVerificationToken(token);

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