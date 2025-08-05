/**
 * Tournament Entry API - 特定の大会へのエントリー処理
 * POST /api/tournament-entry
 */

const sheets = require('./lib/sheets');

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, tournamentId } = req.body;

    if (!userId || !tournamentId) {
      return res.status(400).json({ error: 'userId and tournamentId are required' });
    }

    console.log(`Tournament entry request: userId=${userId}, tournamentId=${tournamentId}`);

    // 1. 指定された大会が存在し、エントリー可能状態かチェック
    const tournaments = await sheets.getTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);
    
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.status !== 'upcoming' && tournament.status !== 'active') {
      return res.status(400).json({ error: 'Tournament is not available for entry' });
    }

    // 2. プレイヤーが存在するかチェック
    const players = await sheets.getPlayers();
    const player = players.find(p => p.id === userId);
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 3. 既に他の大会に参加中かチェック
    if (player.tournament_active === true) {
      // 既に同じ大会に参加している場合はOK
      const participantResponse = await sheets.getTournamentParticipants();
      const existingParticipation = participantResponse.find(p => 
        p.player_id === userId && p.tournament_id === tournamentId
      );
      
      if (existingParticipation) {
        return res.status(200).json({ 
          message: 'Already registered for this tournament',
          tournament: tournament
        });
      }
      
      // 別の大会に参加中の場合はエラー
      return res.status(400).json({ 
        error: 'Player is already registered for another tournament' 
      });
    }

    // 4. 大会参加者リストに追加
    await sheets.addTournamentParticipant({
      player_id: userId,
      tournament_id: tournamentId,
      registered_at: new Date().toISOString(),
      status: 'registered'
    });

    console.log(`Successfully registered player ${userId} for tournament ${tournamentId}`);

    res.status(200).json({
      message: 'Tournament entry successful',
      tournament: tournament,
      player: {
        id: player.id,
        nickname: player.nickname
      }
    });

  } catch (error) {
    console.error('Tournament entry error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}