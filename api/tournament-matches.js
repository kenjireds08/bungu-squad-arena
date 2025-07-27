const SheetsService = require('./lib/sheets.js');

const sheetsService = new SheetsService();

module.exports = async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'POST') {
      const { tournamentId, matches } = req.body;

      if (!tournamentId || !matches || !Array.isArray(matches)) {
        return res.status(400).json({ 
          error: 'tournamentId and matches array are required' 
        });
      }

      // Save matches to Google Sheets
      const result = await sheetsService.saveTournamentMatches(tournamentId, matches);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Tournament matches saved successfully',
        data: result
      });

    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Tournament matches API error:', error);
    return res.status(500).json({ 
      error: 'Failed to process tournament matches',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};