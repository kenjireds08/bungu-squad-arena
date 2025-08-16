import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, History, Trophy, Calendar, TrendingUp, TrendingDown, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

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
  const [matches, setMatches] = useState<Match[]>([]);
  const [tournamentArchive, setTournamentArchive] = useState<TournamentArchive[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [showAllTournaments, setShowAllTournaments] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);

  useEffect(() => {
    if (currentUserId) {
      loadPlayerHistory();
    } else {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const loadTournamentHistory = async (userMatches: any[]) => {
    try {
      console.log('Loading tournament history with matches:', userMatches.length);
      
      // Get tournaments
      const tournamentsResponse = await fetch('/api/tournaments');
      if (tournamentsResponse.ok) {
        const tournamentsData = await tournamentsResponse.json();
        console.log('Fetched tournaments:', tournamentsData.length);
        
        // Find tournaments this user participated in based on matches
        const tournamentIds = [...new Set(userMatches.map((match: any) => match.tournament_id).filter(Boolean))];
        console.log('Tournament IDs from matches:', tournamentIds);
        
        const participatedTournaments = tournamentsData.filter((tournament: any) => {
          return tournamentIds.includes(tournament.id);
        });
        
        console.log('Participated tournaments found:', participatedTournaments.length);
        
        const userTournaments = participatedTournaments.map((tournament: any) => {
          // Count user's matches in this tournament
          const tournamentMatches = userMatches.filter(m => m.tournament_id === tournament.id);
          
          // Use current_participants from tournament data, fallback to calculating from matches
          let actualParticipants = tournament.current_participants || 0;
          
          // If no current_participants data, try to estimate from user matches (limited view)
          if (actualParticipants === 0) {
            const tournamentUserMatches = userMatches.filter(m => m.tournament_id === tournament.id);
            const participantSet = new Set();
            tournamentUserMatches.forEach((match: any) => {
              participantSet.add(match.player1_id);
              participantSet.add(match.player2_id);
            });
            actualParticipants = participantSet.size;
          }
          
          return {
            archive_id: tournament.id,
            tournament_date: tournament.date,
            tournament_name: tournament.tournament_name || tournament.name || 'BUNGU SQUAD大会',
            total_participants_that_day: actualParticipants || tournament.current_participants || 0,
            entry_timestamp: tournament.created_at || tournament.date,
            matches_count: tournamentMatches.length
          };
        });
        
        console.log('Final tournament archive:', userTournaments);
        setTournamentArchive(userTournaments);
      } else {
        console.error('Failed to fetch tournaments:', tournamentsResponse.status);
        setTournamentArchive([]);
      }
    } catch (error) {
      console.error('Tournament archive loading error:', error);
      setTournamentArchive([]);
    }
  };

  const loadPlayerHistory = async () => {
    console.log('Loading player history for user:', currentUserId);
    setIsLoading(true);
    
    try {
      // 1. Load matches with error handling
      try {
        const matchUrl = `/api/matches?playerId=${currentUserId}`;
        console.log('Fetching matches from:', matchUrl);
        const matchResponse = await fetch(matchUrl);
        console.log('Match response status:', matchResponse.status);
        
        if (matchResponse.ok) {
          const matchData = await matchResponse.json();
          console.log('Match data received:', matchData);
          
          // Convert API format to expected format
          const convertedMatches = Array.isArray(matchData) ? matchData.map((match: any) => {
            // Convert API response format to internal Match format
            return {
              id: match.match_id || match.id,
              tournament_id: match.tournament_id,
              player1_id: currentUserId, // Current user
              player2_id: match.opponent?.id || match.player2_id,
              winner_id: match.result === 'win' ? currentUserId : 
                        match.result === 'lose' ? match.opponent?.id : 
                        null, // null for pending matches
              loser_id: match.result === 'win' ? match.opponent?.id :
                        match.result === 'lose' ? currentUserId :
                        null,
              game_rule: match.game_type || 'trump',
              match_start_time: match.timestamp || new Date().toISOString(),
              match_end_time: match.timestamp,
              player1_rating_change: match.rating_change || 0,
              player2_rating_change: -(match.rating_change || 0), // Opposite for opponent
              table_number: '',
              notes: ''
            };
          }) : [];
          
          console.log('Converted matches:', convertedMatches.length);
          
          setMatches(convertedMatches);
          
          // Continue with tournament loading after matches are ready
          await loadTournamentHistory(convertedMatches);
        } else {
          setMatches([]);
          await loadTournamentHistory([]);
        }
      } catch (error) {
        console.error('Match loading error:', error);
        setMatches([]);
        await loadTournamentHistory([]);
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


    } catch (error) {
      console.error('LoadPlayerHistory error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getOpponentName = (match: Match) => {
    const opponentId = match.player2_id; // opponent is always player2 in our converted format
    const opponent = players.find(p => p.id === opponentId);
    return opponent?.nickname || '不明';
  };

  const getOpponentRating = (match: Match) => {
    // Get actual opponent rating from players data
    const opponentId = match.player2_id; // opponent is always player2 in our converted format
    const opponent = players.find(p => p.id === opponentId);
    return opponent?.current_rating || 1200;
  };

  const getPlayerResult = (match: Match) => {
    if (match.winner_id === currentUserId) return '勝ち';
    if (match.winner_id === match.player2_id) return '負け';
    // No winner means pending/unknown
    return '未定';
  };

  const getPlayerRatingChange = (match: Match) => {
    // Current user is always player1 in our converted format
    return match.player1_rating_change || 0;
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
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString || dateString.trim() === '') {
      return '日付未設定';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date value: ${dateString}`);
        return '日付未設定';
      }
      
      return date.toLocaleDateString('ja-JP', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    } catch (error) {
      console.error(`Error formatting date: ${dateString}`, error);
      return '日付未設定';
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString || dateString.trim() === '') {
      return '時刻未設定';
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid datetime value: ${dateString}`);
        return '時刻未設定';
      }
      
      return date.toLocaleString('ja-JP', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error(`Error formatting datetime: ${dateString}`, error);
      return '時刻未設定';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background - Eraser (cleaning up history) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:bg-[length:60%] bg-[length:85%]"
        style={{
          backgroundImage: `url('/assets/characters/eraser.png')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          opacity: 0.08,
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10">
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
              <>
                {tournamentArchive
                  .slice(0, showAllTournaments ? tournamentArchive.length : 3)
                  .map((entry, index) => (
                  <div
                    key={`${entry.archive_id}-${index}`}
                    className="p-4 bg-muted/30 rounded-lg border border-fantasy-frame/20 animate-slide-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-foreground">
                          {entry.tournament_date || 'BUNGU SQUAD大会'}
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
                ))}
                
                {tournamentArchive.length > 3 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllTournaments(!showAllTournaments)}
                    className="w-full mt-4 text-primary"
                  >
                    {showAllTournaments ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        少なく表示
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        すべて表示 ({tournamentArchive.length - 3}件追加)
                      </>
                    )}
                  </Button>
                )}
              </>
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
              <>
                {matches
                  .slice(0, showAllMatches ? matches.length : 5)
                  .map((match, index) => (
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
                          variant={getPlayerResult(match) === "勝ち" ? "default" : 
                                  getPlayerResult(match) === "負け" ? "destructive" : "outline"}
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
                ))}
                
                {matches.length > 5 && (
                  <Button
                    variant="ghost"
                    onClick={() => setShowAllMatches(!showAllMatches)}
                    className="w-full mt-4 text-primary"
                  >
                    {showAllMatches ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-2" />
                        少なく表示
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        もっと見る ({matches.length - 5}件追加)
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
  );
};