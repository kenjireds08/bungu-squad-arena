const SheetsService = require('./lib/sheets');

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    switch (req.method) {
      case 'GET':
        const { playerId, tournamentId } = req.query;
        
        if (tournamentId) {
          // Get matches for specific tournament
          const matches = await sheetsService.getTournamentMatches(tournamentId);
          return res.status(200).json(matches);
        } else if (playerId) {
          // Get match history for specific player
          const matches = await sheetsService.getMatchHistory(playerId);
          return res.status(200).json(matches);
        } else {
          // Get all matches
          const matches = await sheetsService.getAllMatches();
          return res.status(200).json(matches);
        }

      case 'POST':
        const { action, ...data } = req.body;
        
        if (action === 'saveTournamentMatches') {
          // Save tournament match pairings
          const { tournamentId, matches } = data;
          
          if (!tournamentId || !matches || !Array.isArray(matches)) {
            return res.status(400).json({ error: 'Missing required fields: tournamentId, matches' });
          }
          
          // Check if this is a single match addition (new format)
          if (matches.length === 1 && matches[0].player1_id && matches[0].player2_id && !matches[0].player1) {
            // This is adding a single match after pairing
            const match = matches[0];
            
            // Get player names
            const player1 = await sheetsService.getPlayer(match.player1_id);
            const player2 = await sheetsService.getPlayer(match.player2_id);
            
            if (!player1 || !player2) {
              return res.status(404).json({ error: 'One or both players not found' });
            }
            
            const matchData = {
              player1_id: match.player1_id,
              player1_name: player1.nickname,
              player2_id: match.player2_id,
              player2_name: player2.nickname,
              game_type: match.game_type
            };
            
            const result = await sheetsService.addSingleTournamentMatch(tournamentId, matchData);
            console.log(`Single match added for tournament ${tournamentId}`);
            
            return res.status(201).json(result);
          } else {
            // This is bulk tournament creation (original format)
            const transformedMatches = matches.map((match) => {
              // Return original format if already in the expected structure
              if (match.player1 && match.player2) {
                return match;
              }
              // Should not reach here for bulk creation
              throw new Error('Invalid match format for bulk creation');
            });
            
            const result = await sheetsService.saveTournamentMatches(tournamentId, transformedMatches);
            console.log(`Tournament matches created for ${tournamentId}, should notify players`);
            
            return res.status(201).json(result);
          }
        } else {
          // Original match result logic
          const { player1Id, player2Id, result } = req.body;
          
          if (!player1Id || !player2Id || !result) {
            return res.status(400).json({ 
              error: 'player1Id, player2Id, and result are required' 
            });
          }

          if (!['win', 'loss', 'draw'].includes(result)) {
            return res.status(400).json({ 
              error: 'result must be win, loss, or draw' 
            });
          }

          const player1 = await sheetsService.getPlayer(player1Id);
          const player2 = await sheetsService.getPlayer(player2Id);

          if (!player1 || !player2) {
            return res.status(404).json({ error: 'One or both players not found' });
          }

          const ratingChanges = sheetsService.calculateEloRating(
            player1.rating,
            player2.rating,
            result,
            player1.matches
          );

          const matchResult = await sheetsService.addMatchResult(
            player1Id,
            player2Id,
            result,
            ratingChanges
          );

          return res.status(201).json({
            ...matchResult,
            ratingChanges
          });
        }

      case 'PUT':
        // Update match result or status
        const { matchId } = req.query;
        const updateData = req.body;

        if (!matchId) {
          return res.status(400).json({ error: 'Match ID is required' });
        }

        const result = await sheetsService.updateMatchResult(matchId, updateData);
        return res.status(200).json(result);

      case 'DELETE':
        // Delete a match
        const { matchId: deleteMatchId } = req.query;

        if (!deleteMatchId) {
          return res.status(400).json({ error: 'Match ID is required' });
        }

        const deleteResult = await sheetsService.deleteMatch(deleteMatchId);
        return res.status(200).json(deleteResult);

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}