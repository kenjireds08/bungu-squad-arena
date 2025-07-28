// Shared tournament data management
export interface Tournament {
  id: number;
  name: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  status?: string;
  description?: string;
}

// Helper function to determine tournament status based on date
export const getTournamentStatus = (date: string) => {
  const today = new Date().toISOString().split('T')[0];
  const tournamentDate = new Date(date).toISOString().split('T')[0];
  
  if (tournamentDate === today) {
    return '開催中';
  } else if (tournamentDate > today) {
    return '募集中';
  } else {
    return '完了';
  }
};

// Get current date in YYYY-MM-DD format
export const getCurrentDate = () => {
  return new Date().toISOString().split('T')[0];
};

// Master tournament data - this should eventually come from API
const masterTournaments: Tournament[] = [
  {
    id: 1,
    name: "第8回BUNGU SQUAD大会",
    date: getCurrentDate(), // Today's date
    time: "19:00",
    location: "○○コミュニティセンター",
    participants: 0,
  },
  {
    id: 2,
    name: "第9回BUNGU SQUAD大会", 
    date: "2025-08-15",
    time: "19:00",
    location: "△△コミュニティセンター",
    participants: 0,
  },
  {
    id: 3,
    name: "第7回BUNGU SQUAD大会",
    date: "2025-07-15",
    time: "19:00",
    location: "▲▲会議室",
    participants: 8,
  }
];

// Get categorized tournaments
export const getCategorizedTournaments = () => {
  const tournaments = masterTournaments.map(t => ({
    ...t,
    status: getTournamentStatus(t.date)
  }));

  return {
    active: tournaments.filter(t => t.status === '開催中'),
    upcoming: tournaments.filter(t => t.status === '募集中'),
    completed: tournaments.filter(t => t.status === '完了')
  };
};

// Get the current active tournament (today's date)
export const getCurrentActiveTournament = (): Tournament | null => {
  const { active } = getCategorizedTournaments();
  return active.length > 0 ? active[0] : null;
};

// Get the next upcoming tournament
export const getNextUpcomingTournament = (): Tournament | null => {
  const { upcoming } = getCategorizedTournaments();
  if (upcoming.length === 0) return null;
  
  // Sort by date and return the earliest
  const sorted = upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return sorted[0];
};

// Get tournament to display on main dashboard
export const getTournamentForMainDashboard = (): Tournament | null => {
  // First try to get active tournament (today)
  const activeTournament = getCurrentActiveTournament();
  if (activeTournament) {
    return activeTournament;
  }
  
  // If no active tournament, get next upcoming
  return getNextUpcomingTournament();
};