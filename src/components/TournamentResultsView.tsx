import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Medal, Award, Users } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface TournamentResultsViewProps {
  onClose: () => void;
  tournament: Tournament;
}

interface Match {
  match_id: string;
  player1_name: string;
  player2_name: string;
  winner_id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  game_type: string;
}

interface PlayerResult {
  player_id: string;
  player_name: string;
  wins: number;
  losses: number;
  total_matches: number;
  win_rate: number;
  final_rating: number;
  rating_change: number;
}

export const TournamentResultsView = ({ onClose, tournament }: TournamentResultsViewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTournamentResults();
  }, [tournament.id]);

  const fetchTournamentResults = async () => {
    try {
      setIsLoading(true);
      
      // Fetch tournament matches
      const matchesResponse = await fetch(`/api/matches?tournamentId=${tournament.id}`);
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData);
        
        // Calculate player results
        calculatePlayerResults(matchesData);
      }
    } catch (error) {
      console.error('Failed to fetch tournament results:', error);
      toast({
        title: 'エラー',
        description: '大会結果の読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePlayerResults = (matchesData: Match[]) => {
    const playerStats: { [key: string]: PlayerResult } = {};
    
    // Process each completed match
    matchesData
      .filter(match => match.status === 'approved' && match.winner_id)
      .forEach(match => {
        const { player1_id, player1_name, player2_id, player2_name, winner_id } = match;
        
        // Initialize player stats if not exists
        if (!playerStats[player1_id]) {
          playerStats[player1_id] = {
            player_id: player1_id,
            player_name: player1_name,
            wins: 0,
            losses: 0,
            total_matches: 0,
            win_rate: 0,
            final_rating: 1200, // Default rating
            rating_change: 0
          };
        }
        
        if (!playerStats[player2_id]) {
          playerStats[player2_id] = {
            player_id: player2_id,
            player_name: player2_name,
            wins: 0,
            losses: 0,
            total_matches: 0,
            win_rate: 0,
            final_rating: 1200, // Default rating
            rating_change: 0
          };
        }
        
        // Update stats
        playerStats[player1_id].total_matches++;
        playerStats[player2_id].total_matches++;
        
        if (winner_id === player1_id) {
          playerStats[player1_id].wins++;
          playerStats[player2_id].losses++;
        } else if (winner_id === player2_id) {
          playerStats[player2_id].wins++;
          playerStats[player1_id].losses++;
        }
      });
    
    // Calculate win rates and sort by performance
    const results = Object.values(playerStats).map(player => ({
      ...player,
      win_rate: player.total_matches > 0 ? (player.wins / player.total_matches) * 100 : 0
    })).sort((a, b) => {
      // Sort by wins first, then by win rate
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.win_rate - a.win_rate;
    });
    
    setPlayerResults(results);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-sm font-bold">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-muted/30 border-border';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">大会結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">大会結果</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{tournament.name}</h2>
              <p className="text-muted-foreground">{tournament.date}</p>
              <Badge variant="outline">
                <Users className="h-4 w-4 mr-1" />
                参加者 {playerResults.length}名
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Results Ranking */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              最終順位
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {playerResults.length > 0 ? (
              playerResults.map((player, index) => (
                <div
                  key={player.player_id}
                  className={`p-4 rounded-lg border ${getRankColor(index + 1)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRankIcon(index + 1)}
                      <div>
                        <p className="font-semibold text-lg">{player.player_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.wins}勝 {player.losses}敗 (勝率: {player.win_rate.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">試合数</p>
                      <p className="font-bold">{player.total_matches}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">まだ結果がありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Match Results Summary */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle>試合結果一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matches
                .filter(match => match.status === 'approved' && match.winner_id)
                .map((match) => (
                  <div key={match.match_id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {match.player1_name} vs {match.player2_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {match.game_type === 'trump' ? 'トランプ' : 'カード+'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-success font-medium">
                          勝者: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              }
              {matches.filter(match => match.status === 'approved' && match.winner_id).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">完了した試合がありません</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};