export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({ error: 'Token and email are required' });
    }

    // TODO: 実際の実装では、トークンの検証を行う
    // 現在はシンプルにトークンの存在確認のみ
    console.log('Verifying token:', token, 'for email:', email);

    // 認証成功の場合
    // 1. ユーザーアカウントを作成
    // 2. 大会にエントリー
    // 3. 待機画面にリダイレクト

    // ユーザー作成（仮実装）
    const newUser = {
      email: decodeURIComponent(email),
      nickname: `User_${Date.now()}`, // 実際には事前に保存されたニックネームを使用
      tournament_active: true,
      rating: 1500
    };

    // TODO: データベースに保存する処理
    console.log('Creating user:', newUser);

    // 成功ページへリダイレクト
    res.writeHead(302, {
      Location: '/tournament-waiting?verified=true'
    });
    res.end();

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'メール認証に失敗しました' });
  }
}