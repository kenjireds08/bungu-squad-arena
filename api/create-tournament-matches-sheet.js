const SheetsService = require('./lib/sheets.js');

const sheetsService = new SheetsService();

module.exports = async function handler(req, res) {
  const { method } = req;

  try {
    if (method === 'POST') {
      // Create TournamentMatches sheet structure
      const result = await sheetsService.createTournamentMatchesSheet();
      
      return res.status(200).json({ 
        success: true, 
        message: 'TournamentMatches sheet created successfully',
        data: result
      });

    } else {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Create TournamentMatches sheet API error:', error);
    return res.status(500).json({ 
      error: 'Failed to create TournamentMatches sheet',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};