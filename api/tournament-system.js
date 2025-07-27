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