const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  const sheetsService = new SheetsService();

  try {
    if (req.method === 'GET') {
      // Add caching to reduce API calls
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      
      const { action } = req.query;
      
      if (action === 'get-daily-archive') {
        const archive = await sheetsService.getTournamentDailyArchive();
        return res.status(200).json(archive);
      }
      
      const tournaments = await sheetsService.getTournaments();
      return res.status(200).json(tournaments);
    }

    if (req.method === 'POST') {
      const tournamentData = req.body;
      
      // Validate required fields
      if (!tournamentData.tournament_name || !tournamentData.date || !tournamentData.start_time || !tournamentData.location) {
        return res.status(400).json({ error: 'Missing required fields: tournament_name, date, start_time, location' });
      }

      const result = await sheetsService.createTournament(tournamentData);
      return res.status(201).json(result);
    }

    if (req.method === 'PUT') {
      const { id } = req.query;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Tournament ID is required' });
      }

      const result = await sheetsService.updateTournament(id, updateData);
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Tournament ID is required' });
      }

      const result = await sheetsService.deleteTournament(id);
      return res.status(200).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}