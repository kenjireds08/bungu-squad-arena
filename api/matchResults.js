const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  const sheetsService = new SheetsService();

  try {
    switch (req.method) {
      case 'POST':
        return await handleSubmitMatchResult(req, res, sheetsService);
      case 'GET':
        return await handleGetPendingResults(req, res, sheetsService);
      case 'PUT':
        return await handleApproveMatchResult(req, res, sheetsService);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Match results API error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// プレイヤーが試合結果を報告
async function handleSubmitMatchResult(req, res, sheetsService) {
  const { matchId, playerId, result, opponentId } = req.body;

  if (!matchId || !playerId || !result || !opponentId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // 試合結果を記録（承認待ち状態）
    const resultId = await sheetsService.submitMatchResult({
      matchId,
      playerId,
      result, // 'win' or 'lose'
      opponentId,
      timestamp: new Date().toISOString(),
      status: 'pending_approval'
    });

    return res.status(200).json({
      success: true,
      resultId,
      message: '試合結果を報告しました。管理者の承認をお待ちください。'
    });
  } catch (error) {
    console.error('Error submitting match result:', error);
    return res.status(500).json({ error: 'Failed to submit match result' });
  }
}

// 承認待ちの試合結果を取得（管理者用）
async function handleGetPendingResults(req, res, sheetsService) {
  try {
    const pendingResults = await sheetsService.getPendingMatchResults();
    return res.status(200).json(pendingResults);
  } catch (error) {
    console.error('Error getting pending results:', error);
    return res.status(500).json({ error: 'Failed to get pending results' });
  }
}

// 管理者が試合結果を承認
async function handleApproveMatchResult(req, res, sheetsService) {
  const { resultId, approved } = req.body;

  if (!resultId || typeof approved !== 'boolean') {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await sheetsService.approveMatchResult(resultId, approved);
    return res.status(200).json(result);
  } catch (error) {
    console.error('Error approving match result:', error);
    return res.status(500).json({ error: 'Failed to approve match result' });
  }
}