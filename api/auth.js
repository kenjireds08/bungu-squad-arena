const { SheetsService } = require('./lib/sheets');
const crypto = require('crypto');

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
      const { email, nickname } = req.body;
      
      if (!email || !nickname) {
        return res.status(400).json({ error: 'Email and nickname are required' });
      }
      
      // 簡単な認証トークン生成
      const token = crypto.randomBytes(32).toString('hex');
      
      // 実際のメール送信はスキップ（実装が必要な場合は後で追加）
      console.log(`Verification email would be sent to ${email} with token: ${token}`);
      
      // プレイヤーデータを直接登録
      try {
        const playerId = `player_${Date.now()}`;
        const playerData = {
          id: playerId,
          nickname: nickname,
          email: email,
          current_rating: 1000, // デフォルトレーティング
        };
        await sheets.addPlayer(playerData);
        return res.status(200).json({ 
          success: true, 
          message: 'Player registered successfully',
          // 開発用：実際は認証が必要
          verified: true
        });
      } catch (error) {
        console.error('Failed to add player:', error);
        return res.status(500).json({ error: 'Failed to register player' });
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