const API_BASE_URL = '/api';

export interface Player {
  id: string;
  nickname: string;
  email: string;
  current_rating: number;
  annual_wins: number;
  annual_losses: number;
  total_wins: number;
  total_losses: number;
  champion_badges: string;
  trump_rule_experienced: boolean;
  first_trump_game_date: string;
  cardplus_rule_experienced: boolean;
  first_cardplus_game_date: string;
  registration_date: string;
  profile_image_url: string;
  is_active: boolean;
  last_activity_date: string;
  player_status: string;
  notification_preferences: string;
  device_tokens: string;
  last_login_date: string;
  profile_image_uploaded: boolean;
  preferred_language: string;
  tournament_active: boolean;
  rank: number;
  // Additional fields for statistics and achievements
  created_at?: string;
  wins?: number;
  total_games?: number;
  highest_rating?: number;
  first_win_date?: string;
  win_rate_50_date?: string;
  rating_1600_date?: string;
  games_10_date?: string;
}

export interface Tournament {
  id: string;
  tournament_name: string;
  date: string;
  start_time: string;
  location: string;
  qr_code_url?: string;
  created_by?: string;
  created_at?: string;
  status: string;
  max_participants: number;
  current_participants: number;
  tournament_type?: string;
  // Legacy fields for backward compatibility
  name?: string;
  time?: string;
  participants?: number;
}

export interface Match {
  id: string;
  player1Id: string;
  player2Id: string;
  result: 'win' | 'loss' | 'draw';
  player1RatingChange: number;
  player2RatingChange: number;
  timestamp: string;
}

export interface MatchResult {
  player1Id: string;
  player2Id: string;
  result: 'win' | 'loss' | 'draw';
}

export interface RatingChanges {
  player1NewRating: number;
  player2NewRating: number;
  player1: number;
  player2: number;
}

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

export const api = {
  // Players
  getPlayers: (): Promise<Player[]> => apiCall('/players'),
  
  getPlayer: (id: string): Promise<Player> => apiCall(`/players?id=${id}`),
  
  updatePlayerRating: (id: string, rating: number): Promise<{ success: boolean }> =>
    apiCall(`/players?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify({ rating }),
    }),

  // Rankings
  getRankings: (): Promise<Player[]> => apiCall('/rankings'),

  // Tournaments
  getTournaments: (): Promise<Tournament[]> => apiCall('/tournaments'),
  
  createTournament: (tournament: Omit<Tournament, 'id' | 'current_participants' | 'created_at'>): Promise<{ success: boolean; tournamentId: string }> =>
    apiCall('/tournaments', {
      method: 'POST',
      body: JSON.stringify(tournament),
    }),
  
  updateTournament: (id: string, tournament: Partial<Tournament>): Promise<{ success: boolean }> =>
    apiCall(`/tournaments?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(tournament),
    }),
  
  deleteTournament: (id: string): Promise<{ success: boolean }> =>
    apiCall(`/tournaments?id=${id}`, {
      method: 'DELETE',
    }),

  // Matches
  getMatches: (playerId?: string): Promise<Match[]> => {
    const query = playerId ? `?playerId=${playerId}` : '';
    return apiCall(`/matches${query}`);
  },

  addMatch: (matchResult: MatchResult): Promise<{ success: boolean; matchId: string; ratingChanges: RatingChanges }> =>
    apiCall('/matches', {
      method: 'POST',
      body: JSON.stringify(matchResult),
    }),
};