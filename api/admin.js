const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  const { action } = req.query;

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    switch (action) {
      case 'check-auth':
        return await handleCheckAuth(req, res);
      case 'reset-tournament-active':
        return await handleResetTournamentActive(req, res);
      case 'emergency-fix-match':
        return await handleEmergencyFixMatch(req, res);
      case 'fix-match-data':
        return await handleFixMatchData(req, res);
      case 'fix-badges':
        return await handleFixBadges(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: error.message });
  }
};

async function handleCheckAuth(req, res) {
  try {
    const sheetsService = new SheetsService();
    const testData = await sheetsService.getRankings();
    
    return res.status(200).json({
      status: 'success',
      message: 'Google Sheets API is authenticated',
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
      testDataCount: testData?.length || 0
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      message: 'Google Sheets API authentication failed',
      error: error.message,
      hasCredentials: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    });
  }
}

async function handleResetTournamentActive(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    
    // Use the comprehensive reset method that includes archiving
    const result = await sheetsService.resetAllTournamentActive();
    
    return res.status(200).json({
      success: true,
      message: `Successfully reset ${result.updatedCount} players and archived ${result.archivedCount} tournament entries`,
      updatedCount: result.updatedCount,
      archivedCount: result.archivedCount
    });

  } catch (error) {
    console.error('Reset tournament active error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleEmergencyFixMatch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();
    
    // Fix the corrupted match_1 data directly in TournamentMatches sheet first
    let response;
    try {
      response = await sheetsService.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsService.spreadsheetId,
        range: 'TournamentMatches!A2:N1000'
      });
    } catch (error) {
      // Fallback to Matches sheet
      response = await sheetsService.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsService.spreadsheetId,
        range: 'Matches!A1:K1000'
      });
    }

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      throw new Error('No matches found');
    }

    // Find the corrupted match row for match_2
    const matchRowIndex = rows.findIndex((row, index) => 
      index > 0 && row[0] && row[0].includes('match_2')
    );

    if (matchRowIndex !== -1) {
      const actualRowNumber = matchRowIndex + 1;
      const sheetName = response.config?.url?.includes('TournamentMatches') ? 'TournamentMatches' : 'Matches';
      
      // Fix the corrupted data - ensure correct data structure for match_2
      await sheetsService.sheets.spreadsheets.values.update({
        spreadsheetId: sheetsService.spreadsheetId,
        range: `${sheetName}!A${actualRowNumber}:N${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            'tournament_1753934765383_match_2', // match_id
            'tournament_1753934765383', // tournament_id  
            'match_2', // match_number
            'player_001', // player1_id (ちーけん)
            'ちーけん', // player1_name - FIXED
            'player_1753942362394_9n9nmjhnp', // player2_id (桃白白) - FIXED ID
            '桃白白', // player2_name - FIXED  
            'trump', // game_type
            'in_progress', // status 
            '', // winner_id
            '', // result_details
            '2025-08-01T09:39:00.000Z', // created_at
            '', // completed_at
            '' // approved_at
          ]]
        }
      });

      console.log('Match_2 data emergency fixed');
    }

    return res.status(200).json({
      success: true,
      message: 'Emergency match fix completed',
      fixedMatch: 'tournament_1753934765383_match_1'
    });
    
  } catch (error) {
    console.error('Emergency match fix failed:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

async function handleFixMatchData(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    
    // Use adminDirectMatchResult to fix the match with correct data
    const fixedResult = await sheetsService.adminDirectMatchResult({
      matchId: 'tournament_1753934765383_match_1',
      winnerId: 'player_1753942268346_444ujdo4u', // クリリン
      loserId: 'player_1753943387023_8ndu3qxfh', // 天津飯
      timestamp: '2025-08-01T02:38:26.431Z'
    });

    return res.status(200).json({
      success: true,
      message: 'Match data fixed using adminDirectMatchResult',
      result: fixedResult
    });
    
  } catch (error) {
    console.error('Fix match data failed:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}

async function handleFixBadges(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sheetsService = new SheetsService();
    
    console.log('バッジ修正スクリプト開始...');
    
    // 1. 全試合データを取得
    const matches = await sheetsService.getMatches();
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
        await sheetsService.updatePlayerGameExperience(match.player1_id, match.game_type);
        console.log(`  ${match.player1_name}に${match.game_type}バッジ付与`);
      }
      
      // player2のバッジ更新
      if (match.player2_id) {
        await sheetsService.updatePlayerGameExperience(match.player2_id, match.game_type);
        console.log(`  ${match.player2_name}に${match.game_type}バッジ付与`);
      }
    }
    
    // 4. バッジ再計算
    console.log('バッジ再計算中...');
    const players = await sheetsService.getPlayers();
    
    for (const player of players) {
      await sheetsService.updatePlayerBadges(player.player_id);
      console.log(`${player.nickname}のバッジを更新`);
    }
    
    console.log('バッジ修正完了！');
    
    return res.status(200).json({ 
      success: true, 
      message: 'バッジ修正完了',
      processedMatches: nonBasicMatches.length,
      updatedPlayers: players.length
    });
    
  } catch (error) {
    console.error('バッジ修正エラー:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
}