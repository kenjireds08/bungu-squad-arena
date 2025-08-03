const { SheetsAPI } = require('./lib/sheets.js');

// バッジ修正スクリプト
async function fixBadges() {
  const sheets = new SheetsAPI();
  
  try {
    console.log('バッジ修正スクリプト開始...');
    
    // 1. 全試合データを取得
    const matches = await sheets.getMatches();
    console.log(`${matches.length}件の試合データを取得`);
    
    // 2. basic以外の試合を特定
    const nonBasicMatches = matches.filter(match => 
      match.game_type !== 'basic' && match.status === 'completed'
    );
    console.log(`basic以外の完了試合: ${nonBasicMatches.length}件`);
    
    // 3. 各試合の参加者にバッジ付与
    for (const match of nonBasicMatches) {
      console.log(`処理中: ${match.match_id} (${match.game_type})`);
      
      // player1のバッジ更新
      if (match.player1_id) {
        await sheets.updatePlayerGameExperience(match.player1_id, match.game_type);
        console.log(`  ${match.player1_name}に${match.game_type}バッジ付与`);
      }
      
      // player2のバッジ更新
      if (match.player2_id) {
        await sheets.updatePlayerGameExperience(match.player2_id, match.game_type);
        console.log(`  ${match.player2_name}に${match.game_type}バッジ付与`);
      }
    }
    
    // 4. バッジ再計算
    console.log('バッジ再計算中...');
    const players = await sheets.getPlayers();
    
    for (const player of players) {
      await sheets.updatePlayerBadges(player.player_id);
      console.log(`${player.nickname}のバッジを更新`);
    }
    
    console.log('バッジ修正完了！');
    
  } catch (error) {
    console.error('バッジ修正エラー:', error);
  }
}

module.exports = async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await fixBadges();
      res.status(200).json({ success: true, message: 'バッジ修正完了' });
    } catch (error) {
      console.error('Fix badges error:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};