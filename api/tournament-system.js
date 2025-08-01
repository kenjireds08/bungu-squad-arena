const SheetsService = require('./lib/sheets.js');

const sheetsService = new SheetsService();

module.exports = async function handler(req, res) {
  const { method } = req;
  const { action } = req.query;

  try {
    // Create TournamentMatches sheet
    if (method === 'POST' && action === 'create-sheet') {
      const result = await sheetsService.createTournamentMatchesSheet();
      return res.status(200).json({ 
        success: true, 
        message: 'TournamentMatches sheet created successfully',
        data: result
      });
    }

    // Create TournamentDailyArchive sheet
    if (method === 'POST' && action === 'create-archive-sheet') {
      const result = await sheetsService.createTournamentDailyArchiveSheet();
      return res.status(200).json({ 
        success: true, 
        message: 'TournamentDailyArchive sheet created successfully',
        data: result
      });
    }

    // Save tournament matches (組み合わせ保存)
    if (method === 'POST' && action === 'save-matches') {
      const { tournamentId, matches } = req.body;
      
      if (!tournamentId || !matches || !Array.isArray(matches)) {
        return res.status(400).json({ 
          error: 'tournamentId and matches array are required' 
        });
      }

      const result = await sheetsService.saveTournamentMatches(tournamentId, matches);
      return res.status(200).json({ 
        success: true, 
        message: 'Tournament matches saved successfully',
        data: result
      });
    }

    // Emergency fix for corrupted match data
    if (method === 'POST' && action === 'emergency-fix') {
      await sheetsService.authenticate();
      
      // Fix the corrupted match_1 data directly in Matches sheet
      const response = await sheetsService.sheets.spreadsheets.values.get({
        spreadsheetId: sheetsService.spreadsheetId,
        range: 'Matches!A:K'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        throw new Error('No matches found');
      }

      // Find the corrupted match row
      const matchRowIndex = rows.findIndex((row, index) => 
        index > 0 && row[0] === 'tournament_1753934765383_match_1'
      );

      if (matchRowIndex !== -1) {
        const actualRowNumber = matchRowIndex + 1;
        
        // Fix the corrupted data - ensure correct data structure
        await sheetsService.sheets.spreadsheets.values.update({
          spreadsheetId: sheetsService.spreadsheetId,
          range: `Matches!A${actualRowNumber}:K${actualRowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'tournament_1753934765383_match_1', // match_id
              'tournament_1753934765383', // tournament_id  
              'match_1', // match_number
              'player_1753942268346_444ujdo4u', // player1_id (クリリン)
              'クリリン', // player1_name
              'player_1753943387023_8ndu3qxfh', // player2_id (天津飯) - FIXED
              '天津飯', // player2_name - FIXED  
              'cardplus', // game_type
              'approved', // status - FIXED
              'player_1753942268346_444ujdo4u', // winner_id (クリリン won)
              '2025-08-01T02:38:26.431Z' // created_at
            ]]
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Emergency fix completed',
        fixedMatch: 'tournament_1753934765383_match_1'
      });
    }

    // Submit match result (プレイヤーからの結果報告)
    if (method === 'POST' && action === 'submit-result') {
      const { match_id, reporter_id, result, notes, reported_at } = req.body;

      if (!match_id || !reporter_id || !result) {
        return res.status(400).json({ 
          error: 'match_id, reporter_id, and result are required' 
        });
      }

      if (!['win', 'loss'].includes(result)) {
        return res.status(400).json({ 
          error: 'result must be either "win" or "loss"' 
        });
      }

      const resultData = await sheetsService.submitMatchResult({
        match_id,
        reporter_id,
        result,
        notes: notes || '',
        reported_at: reported_at || new Date().toISOString()
      });
      
      return res.status(200).json({ 
        success: true, 
        message: 'Match result submitted for approval',
        data: resultData
      });
    }

    // Get pending match results (管理者用承認待ち一覧)
    if (method === 'GET' && action === 'pending-results') {
      const pendingResults = await sheetsService.getPendingMatchResults();
      return res.status(200).json({ 
        success: true,
        data: pendingResults
      });
    }

    // Approve or reject match result (管理者による承認・却下)
    if (method === 'POST' && action === 'approve-result') {
      const { match_id, action: approvalAction, approved_by, approved_at } = req.body;

      if (!match_id || !approvalAction || !approved_by) {
        return res.status(400).json({ 
          error: 'match_id, action, and approved_by are required' 
        });
      }

      if (!['approve', 'reject'].includes(approvalAction)) {
        return res.status(400).json({ 
          error: 'action must be either "approve" or "reject"' 
        });
      }

      const result = await sheetsService.approveMatchResult({
        match_id,
        action: approvalAction,
        approved_by,
        approved_at: approved_at || new Date().toISOString()
      });
      
      return res.status(200).json({ 
        success: true, 
        message: `Match result ${approvalAction}d successfully`,
        data: result
      });
    }

    // 無効なアクション
    return res.status(400).json({ 
      error: 'Invalid action. Supported actions: create-sheet, save-matches, submit-result, pending-results, approve-result' 
    });

  } catch (error) {
    console.error('Tournament system API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process tournament system request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};