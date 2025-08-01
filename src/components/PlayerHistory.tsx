import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, History, Trophy, Calendar, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

interface PlayerHistoryProps {
  onClose: () => void;
  currentUserId?: string;
}

interface Match {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  winner_id: string;
  loser_id?: string;
  game_rule: string;
  match_start_time: string;
  match_end_time?: string;
  player1_rating_before?: number;
  player2_rating_before?: number;
  player1_rating_after?: number;
  player2_rating_after?: number;
  player1_rating_change?: number;
  player2_rating_change?: number;
  table_number?: string;
  notes?: string;
}

interface TournamentArchive {
  archive_id: string;
  tournament_date: string;
  player_id: string;
  player_nickname: string;
  entry_timestamp: string;
  total_participants_that_day: number;
  created_at: string;
}


export const PlayerHistory = ({ onClose, currentUserId }: PlayerHistoryProps) => {
  console.log('=== PlayerHistory component mounted, currentUserId:', currentUserId);
  alert(`PlayerHistory loaded with userID: ${currentUserId}`);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentArchive, setTournamentArchive] = useState<TournamentArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);

  useEffect(() => {
    console.log('=== PlayerHistory useEffect triggered, currentUserId:', currentUserId);
    if (currentUserId) {
      console.log('=== Starting loadPlayerHistory for userId:', currentUserId);
      loadPlayerHistory();
    } else {
      console.log('=== No currentUserId, setting loading false ===');
      setIsLoading(false);
    }
  }, [currentUserId]);

  const loadPlayerHistory = async () => {
    console.log('=== loadPlayerHistory started for user:', currentUserId);
    setIsLoading(true);
    
    try {
      // 1. Load matches with error handling
      try {
        const matchResponse = await fetch(`/api/matches?playerId=${currentUserId}`);
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          
          // Basic validation and filtering
          const validMatches = Array.isArray(matchData) ? matchData.filter((match: any) => {
            // Filter out invalid/test data
            return match && 
                   match.id && 
                   match.player1_id && 
                   match.player2_id &&
                   match.match_status === 'approved' && // Only show completed matches
                   match.winner_id && // Must have a winner
                   match.match_start_time && // Must have timestamp
                   !match.match_start_time.includes('7月31日') && // Exclude fake July 31 data
                   new Date(match.match_start_time) > new Date('2025-07-31'); // Only show data after July 31
          }) : [];
          
          // Load rating changes for each match
          const matchesWithRating = await Promise.all(
            validMatches.map(async (match: any) => {
              try {
                const ratingResponse = await fetch(`/api/rating-history?matchId=${match.id}`);
                if (ratingResponse.ok) {
                  const ratingData = await ratingResponse.json();
                  return {
                    ...match,
                    player1_rating_change: ratingData.winner_rating_change,
                    player2_rating_change: ratingData.loser_rating_change
                  };
                }
              } catch (error) {
                console.error('Rating fetch error for match:', match.id);
              }
              return match;
            })
          );
          
          setMatches(matchesWithRating);
          console.log(`Loaded ${matchesWithRating.length} matches for ${currentUserId}`);
        } else {
          setMatches([]);
        }
      } catch (error) {
        console.error('Match loading error:', error);
        setMatches([]);
      }

      // 2. Load players with error handling
      try {
        const playersResponse = await fetch('/api/players');
        if (playersResponse.ok) {
          const playersData = await playersResponse.json();
          setPlayers(Array.isArray(playersData) ? playersData : []);
        } else {
          setPlayers([]);
        }
      } catch (error) {
        console.error('Players loading error:', error);
        setPlayers([]);
      }

      // 3. Load tournament participation history
      try {
        console.log('=== Loading tournament participation history ===');
        const tournamentsResponse = await fetch('/api/tournaments');
        if (tournamentsResponse.ok) {
          const tournamentsData = await tournamentsResponse.json();
          console.log('All tournaments:', tournamentsData);
          console.log('User matches:', matchesWithRating);
          
          // Find tournaments where the user has matches
          const tournamentsWithMatches = tournamentsData.filter((tournament: any) => {
            const hasMatches = matchesWithRating.some((match: any) => match.tournament_id === tournament.id);
            console.log(`Tournament ${tournament.id} (${tournament.tournament_name}): has matches = ${hasMatches}`);
            return hasMatches;
          });
          
          console.log('Tournaments with user matches:', tournamentsWithMatches);
          
          const userTournaments = await Promise.all(
            tournamentsWithMatches
              .map(async (tournament: any) => {
                // Get actual participants for this tournament
                let actualParticipants = 0;
                try {
                  const participantsResponse = await fetch(`/api/matches?tournamentId=${tournament.id}`);
                  if (participantsResponse.ok) {
                    const tournamentMatches = await participantsResponse.json();
                    // Count unique players from all matches in this tournament
                    const playerSet = new Set();
                    tournamentMatches.forEach((match: any) => {
                      if (match.player1_id) playerSet.add(match.player1_id);
                      if (match.player2_id) playerSet.add(match.player2_id);
                    });
                    actualParticipants = playerSet.size;
                  }
                } catch (error) {
                  console.error('Error counting participants:', error);
                }
                
                return {
                  archive_id: tournament.id,
                  tournament_date: tournament.date,
                  tournament_name: tournament.tournament_name || tournament.name || 'BUNGU SQUAD大会',
                  total_participants_that_day: actualParticipants,
                  entry_timestamp: tournament.date
                };
              })
          );
          
          console.log('Final user tournaments:', userTournaments);
          setTournamentArchive(userTournaments);
        } else {
          console.log('Failed to fetch tournaments');
          setTournamentArchive([]);
        }
      } catch (error) {
        console.error('Tournament archive loading error:', error);
        setTournamentArchive([]);
      }

    } catch (error) {
      console.error('LoadPlayerHistory error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOpponentName = (match: Match) => {
    const opponentId = match.player1_id === currentUserId ? match.player2_id : match.player1_id;
    const opponent = players.find(p => p.id === opponentId);
    return opponent?.nickname || '不明';
  };

  const getOpponentRating = (match: Match) => {
    // Get actual opponent rating from players data
    const opponentId = match.player1_id === currentUserId ? match.player2_id : match.player1_id;
    const opponent = players.find(p => p.id === opponentId);
    return opponent?.current_rating || 1200;
  };

  const getPlayerResult = (match: Match) => {
    if (match.winner_id === currentUserId) return '勝ち';
    // If not winner, then loser (no draws in this system)
    return '負け';
  };

  const getPlayerRatingChange = (match: Match) => {
    // If this player is the winner, get winner rating change
    if (match.winner_id === currentUserId) {
      return match.player1_rating_change || 0;
    } else {
      // If loser, get loser rating change (should be negative)
      return match.player2_rating_change || 0;
    }
  };

  const getGameTypeName = (gameRule: string) => {
    return gameRule === 'trump' ? 'トランプ' : 'カード+';
  };

  // Group tournament archive by date to create tournament history
  const getTournamentHistory = () => {
    const groupedByDate = tournamentArchive.reduce((acc, entry) => {
      const date = entry.tournament_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          participants: entry.total_participants_that_day,
          matches: matches.filter(m => m.match_start_time.startsWith(date))
        };
      }
      return acc;
    }, {} as any);

    return Object.values(groupedByDate).map((tournament: any) => ({
      name: `BUNGU SQUAD大会`,
      date: tournament.date,
      participants: tournament.participants,
      matches: tournament.matches,
      games: tournament.matches.length,
      wins: tournament.matches.filter((m: Match) => getPlayerResult(m) === '勝ち').length,
      ratingChange: tournament.matches.reduce((sum: number, m: Match) => sum + getPlayerRatingChange(m), 0)
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">履歴を読み込み中...</p>
        </div>
      </div>
    );
  }
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">履歴</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament History */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              大会参加履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tournamentArchive.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>大会参加履歴がありません</p>
              </div>
            ) : (
              tournamentArchive.map((entry, index) => (
              <div
                key={`${entry.archive_id}-${index}`}
                className="p-4 bg-muted/30 rounded-lg border border-fantasy-frame/20 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">
                      {entry.tournament_name || 'BUNGU SQUAD大会'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(entry.tournament_date)}
                    </div>
                  </div>
                  <Badge variant="outline">
                    参加
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{entry.total_participants_that_day}名</div>
                    <div className="text-muted-foreground">参加者</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">
                      {matches.filter(m => m.tournament_id === entry.archive_id).length}試合
                    </div>
                    <div className="text-muted-foreground">対戦数</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">
                      {matches.filter(m => m.tournament_id === entry.archive_id && m.winner_id === currentUserId).length}勝
                      {matches.filter(m => m.tournament_id === entry.archive_id && m.winner_id !== currentUserId).length}敗
                    </div>
                    <div className="text-muted-foreground">成績</div>
                  </div>
                </div>
              </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Games */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              最近の対戦記録
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>対戦記録がありません</p>
              </div>
            ) : (
              matches.slice(0, 10).map((match, index) => (
              <div
                key={match.id}
                className="p-3 bg-muted/20 rounded-lg border border-fantasy-frame/10 animate-slide-up"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">vs {getOpponentName(match)}</span>
                    <Badge variant="outline" className="text-xs">
                      {getGameTypeName(match.game_rule) === "トランプ" ? "♠️" : "➕"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(match.match_start_time)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={getPlayerResult(match) === "勝ち" ? "default" : "destructive"}
                      className={getPlayerResult(match) === "勝ち" ? "bg-success" : ""}
                    >
                      {getPlayerResult(match)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      対戦相手レート: {getOpponentRating(match)}
                    </span>
                  </div>
                  <div className={`font-semibold text-sm flex items-center gap-1 ${
                    getPlayerRatingChange(match) > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {getPlayerRatingChange(match) > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {getPlayerRatingChange(match) > 0 ? '+' : ''}{getPlayerRatingChange(match)}
                  </div>
                </div>
              </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};