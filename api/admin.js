const SheetsService = require('./lib/sheets');

// Import Vercel KV with fallback
let kv;
try {
  kv = require('@vercel/kv').kv;
} catch (e) {
  console.warn('Vercel KV not available in admin.js, using no-op fallback');
  kv = {
    incr: () => Promise.resolve(1)
  };
}

// 無効試合処理（レーティング変化なし）
async function handleInvalidateMatch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, reason } = req.body;

  if (!matchId) {
    return res.status(400).json({ error: 'Match ID is required' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    // 試合を無効としてマーク（レーティング変化は取り消し）
    const result = await sheetsService.invalidateMatch(matchId, reason || '管理者により無効化');

    console.log(`Match ${matchId} invalidated successfully`);
    
    // Version increment for real-time updates
    try {
      const tournamentId = req.body.tournamentId || 'current'; // Use provided tournament ID or default
      await kv.incr(`tour:${tournamentId}:v`);
      console.log(`Version incremented for tournament: ${tournamentId}`);
    } catch (e) {
      console.warn('Failed to increment version:', e);
    }
    
    return res.status(200).json({
      success: true,
      message: '試合を無効にしました',
      result
    });

  } catch (error) {
    console.error('Invalidate match error:', error);
    
    // Handle rate limit errors properly
    if (error.code === 429) {
      res.setHeader('Retry-After', '15');
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again in 15 seconds.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to invalidate match: ' + error.message 
    });
  }
}

// 完了した試合の編集（勝敗判定・ルール変更）
async function handleEditCompletedMatch(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { matchId, newWinnerId, newGameType } = req.body;

  if (!matchId || !newWinnerId) {
    return res.status(400).json({ error: 'Match ID and winner ID are required' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    // 完了した試合を編集（勝敗判定・ルール変更）
    const result = await sheetsService.editCompletedMatch(matchId, newWinnerId, newGameType);

    console.log(`Match ${matchId} edited successfully`);
    
    // Version increment for real-time updates
    try {
      const tournamentId = req.body.tournamentId || 'current'; // Use provided tournament ID or default
      await kv.incr(`tour:${tournamentId}:v`);
      console.log(`Version incremented for tournament: ${tournamentId}`);
    } catch (e) {
      console.warn('Failed to increment version:', e);
    }
    
    return res.status(200).json({
      success: true,
      message: '試合情報を更新しました',
      result
    });

  } catch (error) {
    console.error('Edit completed match error:', error);
    
    // Handle rate limit errors properly
    if (error.code === 429) {
      res.setHeader('Retry-After', '15');
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again in 15 seconds.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to edit completed match: ' + error.message 
    });
  }
}

/**
 * Handle tournament entry action
 */
/**
 * Handle tournament entry action
 */
async function handleTournamentEntry(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, tournamentId, tempNickname, tempEmail } = req.body;

    if (!userId || !tournamentId) {
      return res.status(400).json({ error: 'userId and tournamentId are required' });
    }

    console.log(`Tournament entry request: userId=${userId}, tournamentId=${tournamentId}`);

    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    // 1. 指定された大会が存在し、エントリー可能状態かチェック
    const tournaments = await sheetsService.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
      return res.status(400).json({ error: 'Tournament is not available for entry' });
    }

    // 2. プレイヤーが存在するかチェック（一時ユーザーは自動作成）
    const players = await sheetsService.getPlayers();
    let player = players.find(p => p.id === userId);
    
    // TEMPORARY FIX: Auto-create temporary users
    if (!player && userId.startsWith('temp_user_')) {
      console.log('TEMP: Auto-creating temporary user:', userId);
      console.log('TEMP: Nickname:', tempNickname, 'Email:', tempEmail);
      
      const finalNickname = tempNickname || `参加者${Date.now().toString().slice(-4)}`;
      const finalEmail = tempEmail || `${userId}@temp.local`;
      const tempPlayerData = {
        id: userId,
        nickname: finalNickname,
        email: finalEmail,
        current_rating: 1200,
        email_verified: true,
        tournament_active: true  // Set to true so player is tournament active from creation
      };
      
      console.log('TEMP: Creating player with data:', tempPlayerData);
      
      try {
        await sheetsService.addPlayer(tempPlayerData);
        player = tempPlayerData;
        console.log('TEMP: Created temporary user successfully with nickname:', finalNickname, 'email:', finalEmail);
      } catch (addPlayerError) {
        console.error('TEMP: Failed to create temporary user:', addPlayerError);
        throw new Error(`Failed to create temporary user: ${addPlayerError.message}`);
      }
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 3. TournamentParticipantsシートで既存参加をチェック（真実の源）
    const participants = await sheetsService.getTournamentParticipants();
    
    // 既に同じ大会に参加しているかチェック
    const existingEntry = participants.find(p => 
      p.player_id === userId && p.tournament_id === tournamentId
    );
    
    if (existingEntry) {
      console.log(`Player ${userId} already registered for tournament ${tournamentId}`);
      return res.status(200).json({ 
        message: 'Already registered for this tournament',
        tournament: tournament,
        idempotent: true
      });
    }

    // 他の当日アクティブな大会に参加中かチェック
    const today = new Date().toISOString().split('T')[0];
    const otherActiveEntry = participants.find(p => 
      p.player_id === userId && 
      p.tournament_id !== tournamentId &&
      p.status === 'registered' &&
      tournaments.find(t => t.id === p.tournament_id && t.date === today && t.status === 'active')
    );
    
    if (otherActiveEntry) {
      return res.status(409).json({ 
        error: 'Player is already registered for another active tournament today',
        conflictTournamentId: otherActiveEntry.tournament_id
      });
    }

    // 4. 大会参加者リストに追加（TournamentParticipantsが真実の源）
    try {
      await sheetsService.addTournamentParticipant({
        player_id: userId,
        tournament_id: tournamentId,
        registered_at: new Date().toISOString(),
        status: 'registered'
      });
      console.log(`Added tournament participant: ${userId} -> ${tournamentId}`);
    } catch (participantError) {
      console.error(`Failed to add tournament participant:`, participantError);
      throw new Error(`Tournament participant registration failed: ${participantError.message}`);
    }

    // 5. Skip tournament_active update - already set during player creation
    console.log(`Skipped tournament_active update for ${userId} - already set during player creation`);

    console.log(`Successfully registered player ${userId} for tournament ${tournamentId}`);

    res.status(200).json({
      message: 'Tournament entry successful',
      tournament: tournament,
      player: {
        id: player.id,
        nickname: player.nickname
      }
    });

  } catch (error) {
    console.error('Tournament entry error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

/**
 * Handle version action
 */
async function handleVersion(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({
      version: 'v2.4.1',
      timestamp: new Date().toISOString(),
      service: 'BUNGU SQUAD Arena'
    });
  } catch (error) {
    console.error('Version error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

/**
 * Handle create-sheet action (from tournament-system.js)
 */
async function handleCreateSheet(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tournamentSystem = require('./lib/tournament-system');
    const result = await tournamentSystem.createTournamentMatchesSheet();
    
    res.status(200).json({
      success: true,
      message: 'Tournament matches sheet created successfully',
      result
    });
  } catch (error) {
    console.error('Create sheet error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

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
      case 'invalidate-match':
        return await handleInvalidateMatch(req, res);
      case 'edit-completed-match':
        return await handleEditCompletedMatch(req, res);
      case 'tournament-entry':
        return await handleTournamentEntry(req, res);
      case 'version':
        return await handleVersion(req, res);
      case 'create-sheet':
        return await handleCreateSheet(req, res);
      case 'repair-match-metadata':
        return await handleRepairMatchMetadata(req, res);
      case 'renumber-matches':
        return await handleRenumberMatches(req, res);
      case 'end-tournament':
        return await handleEndTournament(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action parameter' });
    }
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// リペア用：既存試合のメタデータ修正
async function handleRepairMatchMetadata(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tournamentId } = req.body;

  if (!tournamentId) {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    // 既存試合のapproved_at, match_end_time, approved_byを修正
    const matches = await sheetsService.getAllMatches();
    const tournamentMatches = matches.filter(m => m.tournament_id === tournamentId);
    
    let repairedCount = 0;
    for (const match of tournamentMatches) {
      if (match.status === 'completed' || match.status === 'approved') {
        // updateMatchStatusを使って既存の完了試合にメタデータを追加
        await sheetsService.updateMatchStatus(match.match_id, 'approved');
        repairedCount++;
      }
    }

    console.log(`Repaired metadata for ${repairedCount} matches in tournament ${tournamentId}`);
    
    // Version increment
    try {
      await kv.incr(`tour:${tournamentId}:v`);
    } catch (e) {
      console.warn('Failed to increment version:', e);
    }
    
    return res.status(200).json({
      success: true,
      message: `Repaired metadata for ${repairedCount} matches`,
      repairedCount
    });

  } catch (error) {
    console.error('Repair match metadata error:', error);
    return res.status(500).json({ 
      error: 'Failed to repair match metadata: ' + error.message 
    });
  }
}

// 試合番号リナンバリング
async function handleRenumberMatches(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tournamentId } = req.body;

  if (!tournamentId) {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    // 大会の試合を取得してmatch_numberを1から順番に振り直し
    const matches = await sheetsService.getAllMatches();
    const tournamentMatches = matches.filter(m => m.tournament_id === tournamentId);
    
    let renumberedCount = 0;
    for (let i = 0; i < tournamentMatches.length; i++) {
      const match = tournamentMatches[i];
      const newMatchNumber = `match_${i + 1}`;
      
      // match_numberを更新
      await sheetsService.updateMatchMetadata(match.match_id, {
        match_number: newMatchNumber
      });
      renumberedCount++;
    }

    console.log(`Renumbered ${renumberedCount} matches in tournament ${tournamentId}`);
    
    // Version increment
    try {
      await kv.incr(`tour:${tournamentId}:v`);
    } catch (e) {
      console.warn('Failed to increment version:', e);
    }
    
    return res.status(200).json({
      success: true,
      message: `Renumbered ${renumberedCount} matches`,
      renumberedCount
    });

  } catch (error) {
    console.error('Renumber matches error:', error);
    return res.status(500).json({ 
      error: 'Failed to renumber matches: ' + error.message 
    });
  }
}

/**
 * Handle end-tournament action
 */
async function handleEndTournament(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tournamentId, force } = req.body;

  if (!tournamentId) {
    return res.status(400).json({ error: 'Tournament ID is required' });
  }

  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();

    let details = {};
    
    // 1. End the tournament (update status to 'completed' and set ended_at)
    const endResult = await sheetsService.endTournament(tournamentId);
    if (!endResult.success) {
      console.error('Failed to end tournament:', endResult.error);
      // Continue anyway, don't throw
    }
    
    // 2. Deactivate all tournament participants
    const deactivateResult = await sheetsService.deactivateTournamentParticipants(tournamentId);
    details.deactivatedCount = deactivateResult.deactivatedCount || 0;
    details.playersDeactivated = deactivateResult.playersDeactivated || 0;
    
    // 3. Optional: Repair approved matches metadata (non-blocking)
    let repairedCount = 0;
    try {
      const matches = await sheetsService.getAllMatches();
      const tournamentMatches = matches.filter(m => m.tournament_id === tournamentId);
      
      for (const match of tournamentMatches) {
        if (match.status === 'completed' || match.status === 'approved') {
          try {
            await sheetsService.updateMatchStatus(match.match_id, 'approved');
            repairedCount++;
          } catch (e) {
            console.warn(`Failed to repair match ${match.match_id}:`, e.message);
          }
        }
      }
      details.repairedCount = repairedCount;
      console.log(`Repaired metadata for ${repairedCount} matches in tournament ${tournamentId}`);
    } catch (repairError) {
      console.warn('Failed to repair match metadata:', repairError);
      details.repairedCount = 0;
    }

    // 4. Version increment for real-time updates (non-blocking)
    try {
      await kv.incr('tournaments:v');
      await kv.incr(`tour:${tournamentId}:v`);
      console.log(`Version incremented for tournament: ${tournamentId}`);
    } catch (e) {
      console.warn('Failed to increment version:', e);
      // Don't fail the entire operation for version increment failure
    }

    console.log(`Tournament ${tournamentId} ended successfully. Deactivated ${details.deactivatedCount} participants and ${details.playersDeactivated} players.`);
    
    return res.status(200).json({
      success: true,
      message: `大会を終了しました（参加者 ${details.deactivatedCount} 名をリセット）`,
      details,
      newStatus: 'completed'
    });

  } catch (error) {
    console.error('End tournament error:', error);
    return res.status(500).json({ 
      error: 'Failed to end tournament: ' + error.message 
    });
  }
}

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
    const matches = await sheetsService.getAllMatches();
    console.log(`${matches.length}件の試合データを取得`);
    
    // 2. trump/cardplus以外の試合を特定
    const gameRuleMatches = matches.filter(match => 
      (match.game_type === 'trump' || match.game_type === 'cardplus') && 
      (match.status === 'completed' || match.status === 'approved')
    );
    console.log(`trump/cardplusの完了試合: ${gameRuleMatches.length}件`);
    
    // 3. 各試合の参加者にバッジ付与
    for (const match of gameRuleMatches) {
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
      processedMatches: gameRuleMatches.length,
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