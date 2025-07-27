const { SheetsService } = require('../lib/sheets.js');

export default async function handler(req, res) {
  // Cron jobsは通常GETリクエストで実行される
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Vercel Cron Jobからのリクエスト認証（任意）
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers.authorization !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sheetsService = new SheetsService();
    const result = await sheetsService.resetAllTournamentActive();
    
    const now = new Date().toISOString();
    console.log(`[${now}] Tournament active reset completed:`, result);
    
    return res.status(200).json({
      success: true,
      message: 'Tournament active status reset completed',
      timestamp: now,
      updatedCount: result.updatedCount
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      error: 'Failed to reset tournament active status',
      message: error.message
    });
  }
}