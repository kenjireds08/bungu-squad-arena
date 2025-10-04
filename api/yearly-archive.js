const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    switch (req.method) {
      case 'GET': {
        const { playerId, action } = req.query;

        // Check and archive if needed
        if (action === 'checkAndArchive') {
          const result = await sheetsService.checkAndArchiveIfNeeded();
          return res.status(200).json(result);
        }

        // Get yearly archive for a player or all
        const archives = await sheetsService.getYearlyArchive(playerId || null);
        return res.status(200).json(archives);
      }

      case 'POST': {
        // Manual archive for a specific year
        const { year } = req.body;

        if (!year) {
          return res.status(400).json({ error: 'Year is required' });
        }

        const result = await sheetsService.archiveYearlyRankings(parseInt(year, 10));
        return res.status(200).json(result);
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('YearlyArchive API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
