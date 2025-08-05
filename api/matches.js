const SheetsService = require('./lib/sheets');

// Global match cache with TTL
globalThis.matchesCache = globalThis.matchesCache || {
  data: {},
  ttl: 30000 // 30 seconds
};

// Deduplication for concurrent requests
const pendingRequests = new Map();

async function dedupedGetMatches(key, fetcher) {
  if (pendingRequests.has(key)) {
    return await pendingRequests.get(key);
  }
  
  const promise = fetcher();
  pendingRequests.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    pendingRequests.delete(key);
  }
}

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    switch (req.method) {
      case 'GET': {
        // Add caching to reduce API calls
        res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
        
        const { playerId, tournamentId, action: getAction } = req.query;
        const cacheKey = `matches_${tournamentId || playerId || 'all'}`;
        
        // Handle special GET actions (from matchResults.js)
        if (getAction === 'pendingResults') {
          const pendingResults = await sheetsService.getPendingMatchResults();
          return res.status(200).json(pendingResults);
        }
        
        // Check cache first
        const now = Date.now();
        const cache = globalThis.matchesCache;
        const cachedData = cache.data?.[cacheKey];
        
        if (cachedData && (now - cachedData.timestamp) < cache.ttl) {
          console.log('Returning cached matches data for:', cacheKey);
          return res.status(200).json(cachedData.data);
        }
        
        // Use deduplication for API calls
        try {
          const matches = await dedupedGetMatches(cacheKey, async () => {
            if (tournamentId) {
              return await sheetsService.getTournamentMatches(tournamentId);
            } else if (playerId) {
              return await sheetsService.getMatchHistory(playerId);
            } else {
              return await sheetsService.getAllMatches();
            }
          });
          
          // Update cache
          if (!cache.data) cache.data = {};
          cache.data[cacheKey] = {
            data: matches,
            timestamp: now
          };
          
          return res.status(200).json(matches);
        } catch (error) {
          // Fallback to stale cache if available
          if (cachedData) {
            console.warn('Matches API failed, returning stale cache:', error.message);
            res.setHeader('X-From-Cache', 'stale');
            return res.status(200).json(cachedData.data);
          }
          // If no cache available, throw error to be handled by main catch block
          throw error;
        }
      }

      case 'POST': {
        const data = req.body || {};
        const action = data.action || req.query.action;
        console.log('POST /api/matches action:', action, 'payload:', data);

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
        } else if (action === 'submitResult') {
          // プレイヤーが試合結果を報告（matchResults.jsから移植）
          const { matchId, playerId, result, opponentId } = data;

          if (!matchId || !playerId || !result || !opponentId) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          // 試合結果を記録（承認待ち状態）
          const resultId = await sheetsService.submitMatchResult({
            matchId,
            playerId,
            result, // 'win' or 'lose'
            opponentId,
            timestamp: new Date().toISOString(),
            status: 'pending_approval'
          });

          // Update match status to 'completed' since result has been reported
          const winnerId = result === 'win' ? playerId : opponentId;
          await sheetsService.updateMatchStatus(matchId, 'completed', winnerId);

          return res.status(200).json({
            success: true,
            resultId,
            message: '試合結果を報告しました。管理者の承認をお待ちください。'
          });
        } else if (action === 'start') {
          // 管理者による試合開始（matchResults.jsから移植）
          const { matchId } = data;

          if (!matchId) {
            return res.status(400).json({ error: 'Missing matchId' });
          }

          // 試合ステータスを 'scheduled' から 'in_progress' に変更
          await sheetsService.updateMatchStatus(matchId, 'in_progress');

          return res.status(200).json({
            success: true,
            message: '試合が開始されました'
          });
        } else if (action === 'adminDirectInput') {
          // 管理者が直接試合結果を入力・承認（matchResults.jsから移植）
          const { matchId, winnerId, loserId } = data;

          if (!matchId || !winnerId || !loserId) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          const result = await sheetsService.adminDirectMatchResult({
            matchId,
            winnerId,
            loserId,
            timestamp: new Date().toISOString()
          });

          return res.status(200).json({
            success: true,
            message: '管理者により試合結果が入力・承認されました',
            ratingUpdate: result.ratingUpdate
          });
        } else {
          // Original match result logic (fallback)
          const { player1Id, player2Id, result } = req.body;
          
          if (!player1Id || !player2Id || !result) {
            return res.status(400).json({ 
              error: 'player1Id, player2Id, and result are required' 
            });
          }

          if (!['win', 'loss', 'draw', 'invalid'].includes(result)) {
            return res.status(400).json({ 
              error: 'result must be win, loss, draw, or invalid' 
            });
          }

          const player1 = await sheetsService.getPlayer(player1Id);
          const player2 = await sheetsService.getPlayer(player2Id);

          if (!player1 || !player2) {
            return res.status(404).json({ error: 'One or both players not found' });
          }

          // Skip rating calculation for invalid matches
          let ratingChanges = { player1Change: 0, player2Change: 0 };
          
          if (result !== 'invalid') {
            ratingChanges = sheetsService.calculateEloRating(
              player1.rating,
              player2.rating,
              result,
              player1.matches
            );
          }

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
      }

      case 'PUT': {
        // Update match result or status, or approve match result (from matchResults.js)
        const { matchId, action: putAction } = req.query;
        const updateData = req.body;

        // Handle approve action (from matchResults.js)
        if (putAction === 'approve') {
          const { resultId, approved } = updateData;

          if (!resultId || typeof approved !== 'boolean') {
            return res.status(400).json({ error: 'Missing required fields: resultId, approved' });
          }

          const result = await sheetsService.approveMatchResult(resultId, approved);
          return res.status(200).json(result);
        }

        if (!matchId) {
          return res.status(400).json({ error: 'Match ID is required' });
        }

        const result = await sheetsService.updateMatchResult(matchId, updateData);
        return res.status(200).json(result);
      }

      case 'DELETE': {
        // Delete a match
        const { matchId: deleteMatchId } = req.query;

        if (!deleteMatchId) {
          return res.status(400).json({ error: 'Match ID is required' });
        }

        const deleteResult = await sheetsService.deleteMatch(deleteMatchId);
        return res.status(200).json(deleteResult);
      }

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    
    // Handle rate limit errors properly
    if (error.code === 429) {
      res.setHeader('Retry-After', '15');
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again in 15 seconds.' 
      });
    }
    
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};