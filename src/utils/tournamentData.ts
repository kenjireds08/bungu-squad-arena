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
  description?: string;
}

// Helper function to determine tournament status based on date and time
export const getTournamentStatus = (date: string, time?: string) => {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
  const tournamentDate = new Date(date).toISOString().split('T')[0];
  
  if (tournamentDate === today) {
    // If tournament is today, check if it has started based on time
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const tournamentTime = hours * 60 + minutes; // Tournament time in minutes
      
      // If current time is past tournament start time, it's active
      if (currentTime >= tournamentTime) {
        return '開催中';
      } else {
        return '募集中'; // Still recruiting until start time
      }
    } else {
      return '開催中'; // No time specified, assume active all day
    }
  } else if (tournamentDate > today) {
    return '募集中';
  } else {
    return '完了';
  }
};

// Convert API tournament data to internal format
export const transformTournamentData = (apiTournament: ApiTournament): Tournament => {
  return {
    id: apiTournament.id,
    name: apiTournament.tournament_name,
    date: apiTournament.date,
    time: apiTournament.start_time,
    location: apiTournament.location,
    participants: apiTournament.current_participants,
    status: getTournamentStatus(apiTournament.date),
    description: ''
  };
};

// Get categorized tournaments from API data
export const getCategorizedTournaments = (apiTournaments: ApiTournament[] = []) => {
  const tournaments = apiTournaments.map(transformTournamentData);

  return {
    active: tournaments.filter(t => t.status === '開催中'),
    upcoming: tournaments.filter(t => t.status === '募集中'),
    completed: tournaments.filter(t => t.status === '完了')
  };
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
  const tournaments = apiTournaments.map(transformTournamentData);
  const today = new Date().toISOString().split('T')[0];
  
  // First check for today's tournament (regardless of status)
  const todayTournament = tournaments.find(t => t.date === today);
  if (todayTournament) {
    return todayTournament;
  }
  
  // If no tournament today, get next upcoming
  return getNextUpcomingTournament(apiTournaments);
};