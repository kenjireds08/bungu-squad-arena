const SheetsService = require('./lib/sheets');

// In-memory cache and deduplication for tournaments
if (!globalThis.tournamentsCache) {
  globalThis.tournamentsCache = { data: null, timestamp: 0, ttl: 3000 };
}

// In-flight request deduplication
if (!globalThis.tournamentsInflight) {
  globalThis.tournamentsInflight = new Map();
}

async function dedupedGetTournaments(key, fn) {
  if (globalThis.tournamentsInflight.has(key)) {
    return globalThis.tournamentsInflight.get(key);
  }
  
  const promise = fn().finally(() => {
    setTimeout(() => globalThis.tournamentsInflight.delete(key), 5000);
  });
  
  globalThis.tournamentsInflight.set(key, promise);
  return promise;
}

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
      const cacheKey = action || 'tournaments';
      
      // Check cache first
      const now = Date.now();
      const cache = globalThis.tournamentsCache;
      const cachedData = cache.data?.[cacheKey];
      
      if (cachedData && (now - cachedData.timestamp) < cache.ttl) {
        console.log('Returning cached tournaments data for:', cacheKey);
        return res.status(200).json(cachedData.data);
      }
      
      // Use deduplication for API calls
      try {
        const data = await dedupedGetTournaments(cacheKey, async () => {
          if (action === 'get-daily-archive') {
            return await sheetsService.getTournamentDailyArchive();
          }
          return await sheetsService.getTournaments();
        });
        
        // Update cache
        if (!cache.data) cache.data = {};
        cache.data[cacheKey] = {
          data: data,
          timestamp: now
        };
        
        return res.status(200).json(data);
      } catch (error) {
        // Fallback to stale cache if available
        if (cachedData) {
          console.warn('Tournaments API failed, returning stale cache:', error.message);
          res.setHeader('X-From-Cache', 'stale');
          return res.status(200).json(cachedData.data);
        }
        // If no cache available, throw error to be handled by main catch block
        throw error;
      }
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
      
      // Always return 200 with JSON if deletion was attempted
      if (result.success) {
        return res.status(200).json(result);
      } else {
        // Still return 200 but with success:false to avoid UI error toast
        console.warn('Tournament deletion may have partially succeeded:', result.error);
        return res.status(200).json({ 
          success: false, 
          message: '大会削除に問題が発生しましたが、削除された可能性があります',
          error: result.error 
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
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
}