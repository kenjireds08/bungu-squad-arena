const { SheetsService } = require('./lib/sheets');
const crypto = require('crypto');

const sheets = new SheetsService();

export default async function handler(req, res) {
  const { action } = req.query;
  
  try {
    if (action === 'send-verification') {
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