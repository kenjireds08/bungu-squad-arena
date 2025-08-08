const SheetsService = require('./lib/sheets');

// Global match cache with TTL
globalThis.matchesCache = globalThis.matchesCache || {
  data: {},
  ttl: 30000 // 30 seconds
};

// Deduplication for concurrent requests
const pendingRequests = new Map();

// Normalize game_type to prevent errors
function normalizeGameType(gameType) {
  if (!gameType) return 'trump';
  
  const normalized = gameType.toString().toLowerCase().trim();
  
  // Map various inputs to standard values
  if (normalized.includes('card') || normalized.includes('カード')) {
    return 'cardplus';
  }
  if (normalized.includes('trump') || normalized.includes('トランプ')) {
    return 'trump';
  }
  
  // Direct mapping
  switch (normalized) {
    case 'cardplus':
    case 'card+':
    case 'card＋':
      return 'cardplus';
    case 'trump':
    case 'normal':
    default:
      return 'trump';
  }
}

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
        const cacheKey = `matches_v2_${tournamentId || playerId || 'all'}`;
        
        // Handle special GET actions (from matchResults.js)
        if (getAction === 'pendingResults') {
          const pendingResults = await sheetsService.getPendingMatchResults();
          return res.status(200).json(pendingResults);
        }
        
        // Debug endpoint to check rating data in TournamentMatches
        if (getAction === 'debugRatings') {
          const matches = await sheetsService.getTournamentMatches(null);
          const matchesWithRatings = matches.filter(m => 
            m.player1_rating_change || m.player2_rating_change
          );
          return res.status(200).json({
            totalMatches: matches.length,
            matchesWithRatings: matchesWithRatings.length,
            sampleData: matchesWithRatings.slice(0, 3),
            allMatches: matches.slice(0, 5) // First 5 for debugging
          });
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
          // Return empty array instead of 500 error for statistics tab
          console.error('Matches API error, returning empty result:', error.message);
          return res.status(200).json({
            success: false,
            data: [],
            error: error.message,
            message: 'データの取得に失敗しました'
          });
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
              game_type: normalizeGameType(match.game_type)
            };
            
            try {
              const result = await sheetsService.addSingleTournamentMatch(tournamentId, matchData);
              console.log(`Single match added for tournament ${tournamentId}`);
              
              return res.status(201).json(result);
            } catch (error) {
              console.error('Error adding single match:', error);
              // Return 200 with success:false to avoid 500
              return res.status(200).json({
                success: false,
                message: '試合の追加に失敗しました',
                error: error.message
              });
            }
          } else {
            // This is bulk tournament creation (original format)
            try {
              const transformedMatches = matches.map((match) => {
                // Return original format if already in the expected structure
                if (match.player1 && match.player2) {
                  // Normalize game_type for bulk matches too
                  return {
                    ...match,
                    game_type: normalizeGameType(match.game_type)
                  };
                }
                // Should not reach here for bulk creation
                throw new Error('Invalid match format for bulk creation');
              });
              
              const result = await sheetsService.saveTournamentMatches(tournamentId, transformedMatches);
              console.log(`Tournament matches created for ${tournamentId}, should notify players`);
              
              return res.status(201).json(result);
            } catch (error) {
              console.error('Error saving tournament matches:', error);
              // Return 200 with success:false to avoid 500
              return res.status(200).json({
                success: false,
                message: '試合の保存に失敗しました',
                error: error.message
              });
            }
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
        } else if (action === 'recalculateRatings') {
          // Recalculate ratings for existing matches
          const matches = await sheetsService.getTournamentMatches(null);
          const completedMatches = matches.filter(m => m.winner_id && m.winner_id.trim());
          
          console.log(`Found ${completedMatches.length} completed matches to recalculate`);
          
          let updatedCount = 0;
          for (const match of completedMatches) {
            try {
              // Trigger rating calculation by updating the match status
              await sheetsService.updateMatchStatus(match.match_id, 'approved', match.winner_id);
              updatedCount++;
              console.log(`Updated ratings for match ${match.match_id}`);
            } catch (error) {
              console.warn(`Failed to update match ${match.match_id}:`, error.message);
            }
          }
          
          return res.status(200).json({
            success: true,
            message: `Rating recalculation completed for ${updatedCount} matches`,
            totalMatches: completedMatches.length,
            updated: updatedCount
          });
        } else if (action === 'adminDirectInput') {
          // 管理者が直接試合結果を入力・承認（matchResults.jsから移植）
          const { matchId, winnerId, loserId } = data;

          if (!matchId || !winnerId || !loserId) {
            return res.status(400).json({ error: 'Missing required fields' });
          }

          try {
            const result = await sheetsService.adminDirectMatchResult({
              matchId,
              winnerId,
              loserId,
              timestamp: new Date().toISOString()
            });

            // Supersede any pending player reports for this match (non-blocking)
            try {
              await sheetsService.supersedePendingMatchResults(matchId);
            } catch (e) {
              console.warn('Failed to supersede pending results:', e.message);
            }

            return res.status(200).json({
              success: true,
              message: '試合を完了しました',
              ratingUpdate: result.ratingUpdate,
              badgeAdded: result.badgeAdded
            });
          } catch (error) {
            console.error('Error in adminDirectInput:', error);
            // Return 200 with success:false to avoid 500
            return res.status(200).json({
              success: false,
              message: '試合結果の記録に失敗しました',
              error: error.message
            });
          }
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
    
    // For GET requests (statistics), return 200 with success:false to avoid breaking UI
    if (req.method === 'GET') {
      return res.status(200).json({ 
        success: false, 
        data: [],
        error: error.message || 'Internal server error',
        message: 'データの取得に失敗しました' 
      });
    }
    
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};