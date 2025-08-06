import { Tournament as ApiTournament } from '@/lib/api';

// Tournament interface for internal use - unified structure
export interface Tournament {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  status: string;
  rawStatus?: string; // Raw status from API for filtering
  normalizedStatus?: string; // Normalized status based on date logic
  description?: string;
}

// Helper function to determine tournament status based on date and time
export const getTournamentStatus = (date: string, time?: string, rawStatus?: string) => {
  // Priority: raw status from backend
  if (rawStatus === 'completed' || rawStatus === 'ended') {
    return '完了';
  }
  
  const now = new Date();
  const today = now.toLocaleDateString('sv-SE'); // Use local date YYYY-MM-DD
  const tournamentDate = new Date(date).toISOString().split('T')[0];
  
  if (tournamentDate === today) {
    return '開催中';
  } else if (tournamentDate > today) {
    return '募集中';
  } else {
    return '完了';
  }
};

// Convert API tournament data to internal format
// Normalize status based on date and rawStatus for proper categorization
const normalizeStatus = (rawStatus: string | undefined, date: string): string => {
  const today = new Date().toLocaleDateString('sv-SE'); // Get today in YYYY-MM-DD format
  const tournamentDate = new Date(date).toISOString().split('T')[0];
  
  // Ended tournaments are always completed
  if (rawStatus === 'ended') {
    return 'completed';
  }
  
  // Date-based logic
  if (tournamentDate < today) {
    return 'completed'; // Past tournaments
  } else if (tournamentDate === today) {
    // Today's tournaments - respect rawStatus unless ended
    if (rawStatus === 'completed') return 'completed';
    return 'active'; // Default to active for today
  } else {
    // Future tournaments
    return 'upcoming';
  }
};
const transformTournamentData = (apiTournament: ApiTournament): Tournament => {
  const normalizedStatus = normalizeStatus(apiTournament.status, apiTournament.date);
  
  return {
    id: apiTournament.id,
    name: apiTournament.tournament_name,
    date: apiTournament.date,
    time: apiTournament.start_time,
    location: apiTournament.location,
    participants: apiTournament.current_participants,
    status: getTournamentStatus(apiTournament.date, apiTournament.start_time, apiTournament.status),
    rawStatus: apiTournament.status, // Add raw status from API
    normalizedStatus, // Add normalized status for proper categorization
    description: apiTournament.description || ''
  };
};

// Get categorized tournaments from API data
export const getCategorizedTournaments = (apiTournaments: ApiTournament[] = []) => {
  const tournaments = apiTournaments.map(transformTournamentData);

  return {
    active: tournaments.filter(t => 
      t.normalizedStatus === 'active'
    ),
    upcoming: tournaments.filter(t => 
      t.normalizedStatus === 'upcoming'
    ),
    completed: tournaments.filter(t => 
      t.normalizedStatus === 'completed'
    )
  };
};
/**
 * Safe date formatting utility to handle Invalid Date issues
 */
export const formatDate = (dateValue: string | null | undefined, fallback = '未設定'): string => {
  if (!dateValue || dateValue.trim() === '') {
    return fallback;
  }
  
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date value: ${dateValue}`);
      return fallback;
    }
    
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error(`Error formatting date: ${dateValue}`, error);
    return fallback;
  }
};

/**
 * Format date for display in tournament history
 */
export const formatTournamentDate = (dateValue: string | null | undefined): string => {
  return formatDate(dateValue, '日時未設定');
};

// Get the current active tournament (today's date)
export const getCurrentActiveTournament = (apiTournaments: ApiTournament[] = []): Tournament | null => {
  const { active } = getCategorizedTournaments(apiTournaments);
  return active.length > 0 ? active[0] : null;
};

// Get the next upcoming tournament
export const getNextUpcomingTournament = (apiTournaments: ApiTournament[] = []): Tournament | null => {
  const { upcoming } = getCategorizedTournaments(apiTournaments);
  if (upcoming.length === 0) return null;
  
  // Sort by date and return the earliest
  const sorted = upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted[0];
};

// Get tournament to display on main dashboard
export const getTournamentForMainDashboard = (apiTournaments: ApiTournament[] = []): Tournament | null => {
  // First try to get active tournament (today)
  const activeTournament = getCurrentActiveTournament(apiTournaments);
  if (activeTournament) {
    return activeTournament;
  }
  
  // If no active tournament, get next upcoming
  return getNextUpcomingTournament(apiTournaments);
};