const SheetsService = require('./lib/sheets');

// In-memory cache with 30 second TTL
if (!globalThis.rankingsCache) {
  globalThis.rankingsCache = { data: null, timestamp: 0, ttl: 30000 };
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ message: 'OK' });
  }

  try {
    const sheetsService = new SheetsService();

    if (req.method === 'GET') {
      // Add caching to reduce API calls
      res.setHeader('Cache-Control', 'public, s-maxage=15, stale-while-revalidate=60');
      
      // Check in-memory cache first
      const now = Date.now();
      const cache = globalThis.rankingsCache;
      
      if (cache.data && (now - cache.timestamp) < cache.ttl) {
        console.log('Returning cached rankings data');
        return res.status(200).json(cache.data);
      }
      
      // Get rankings from API with fallback
      try {
        const rankings = await sheetsService.getRankings();
        
        // Update cache
        cache.data = rankings;
        cache.timestamp = now;
        
        return res.status(200).json(rankings);
      } catch (error) {
        // If we have cached data, return it even if stale
        if (cache.data) {
          console.warn('Rankings API failed, returning stale cache:', error.message);
          res.setHeader('X-From-Cache', 'stale');
          res.setHeader('Cache-Control', 'public, s-maxage=1, stale-while-revalidate=30');
          return res.status(200).json(cache.data);
        }
        // If no cache available, throw error to be handled by main catch block
        throw error;
      }
    }

    if (req.method === 'POST') {
      // Create new player
      const { nickname, email, current_rating = 1200, tournament_active = true } = req.body;

      if (!nickname || !email) {
        return res.status(400).json({ error: 'Nickname and email are required' });
      }

      // Generate unique player ID
      const playerId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const now = new Date().toISOString();
      const newPlayer = {
        id: playerId,
        nickname: nickname.trim(),
        email: email.trim(),
        current_rating,
        tournament_active,
        total_matches: 0,
        wins: 0,
        losses: 0,
        created_at: now,
        registration_date: now,
        last_login: now,
        last_activity_date: new Date().toISOString().split('T')[0]
      };

      // Add player to Google Sheets
      await sheetsService.addPlayer(newPlayer);
      
      // Invalidate cache when new player is added
      globalThis.rankingsCache.data = null;

      return res.status(201).json(newPlayer);
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