import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, TrendingUp, Medal, Star, Heart } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';

interface TournamentEndScreenProps {
  tournamentId: string;
  tournamentName: string;
  playerId: string;
  onClose: () => void;
}

export const TournamentEndScreen = ({ 
  tournamentId, 
  tournamentName, 
  playerId, 
  onClose 
}: TournamentEndScreenProps) => {
  const [tournamentResults, setTournamentResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: players } = useRankings();
  
  useEffect(() => {
    fetchTournamentResults();
  }, [tournamentId, playerId]);
  
  const fetchTournamentResults = async () => {
    try {
      setIsLoading(true);
      
      // Get player's match history for this tournament
      const matchesResponse = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      const matches = await matchesResponse.json();
      
      // Filter player's matches
      const playerMatches = matches.filter(
        (m: any) => (m.player1_id === playerId || m.player2_id === playerId) && 
                    (m.status === 'completed' || m.status === 'approved')
      );
      
      // Calculate wins and losses
      let wins = 0;
      let losses = 0;
      let totalRatingChange = 0;
      
      playerMatches.forEach((match: any) => {
        const isPlayer1 = match.player1_id === playerId;
        const won = match.winner_id === playerId;
        
        if (won) {
          wins++;
          const ratingChange = isPlayer1 ? match.player1_rating_change : match.player2_rating_change;
          if (ratingChange) totalRatingChange += parseInt(ratingChange);
        } else {
          losses++;
          const ratingChange = isPlayer1 ? match.player1_rating_change : match.player2_rating_change;
          if (ratingChange) totalRatingChange += parseInt(ratingChange);
        }
      });
      
      // Get player's current ranking
      const player = players?.find(p => p.id === playerId);
      const rank = player?.rank || '-';
      const currentRating = player?.current_rating || 1200;
      const previousRating = currentRating - totalRatingChange;
      
      // Calculate tournament rankings (simplified - based on wins)
      const tournamentPlayers = new Map();
      matches.forEach((match: any) => {
        if (match.status === 'completed' || match.status === 'approved') {
          // Initialize players if not exists
          if (!tournamentPlayers.has(match.player1_id)) {
            tournamentPlayers.set(match.player1_id, { 
              id: match.player1_id, 
              name: match.player1_name, 
              wins: 0, 
              losses: 0 
            });
          }
          if (!tournamentPlayers.has(match.player2_id)) {
            tournamentPlayers.set(match.player2_id, { 
              id: match.player2_id, 
              name: match.player2_name, 
              wins: 0, 
              losses: 0 
            });
          }
          
          // Update win/loss counts
          if (match.winner_id === match.player1_id) {
            tournamentPlayers.get(match.player1_id).wins++;
            tournamentPlayers.get(match.player2_id).losses++;
          } else if (match.winner_id === match.player2_id) {
            tournamentPlayers.get(match.player2_id).wins++;
            tournamentPlayers.get(match.player1_id).losses++;
          }
        }
      });
      
      // Sort by wins to get rankings
      const sortedPlayers = Array.from(tournamentPlayers.values())
        .sort((a, b) => b.wins - a.wins);
      
      const tournamentRank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
      
      setTournamentResults({
        wins,
        losses,
        totalRatingChange,
        previousRating,
        currentRating,
        overallRank: rank,
        tournamentRank: tournamentRank > 0 ? tournamentRank : '-',
        totalPlayers: sortedPlayers.length,
        topPlayers: sortedPlayers.slice(0, 3)
      });
    } catch (error) {
      console.error('Failed to fetch tournament results:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">結果を集計中...</p>
        </div>
      </div>
    );
  }
  
  const getRankEmoji = (rank: number) => {
    switch(rank) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };
  
  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">
      {/* Thank You Message */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="pt-6 text-center">
          <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">お疲れ様でした！</h2>
          <p className="text-muted-foreground">
            {tournamentName}にご参加いただき、<br />
            誠にありがとうございました
          </p>
        </CardContent>
      </Card>
      
      {/* Tournament Results */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            大会結果
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tournament Ranking */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">今大会順位</p>
              <p className="text-3xl font-bold">
                {tournamentResults?.tournamentRank}位
                {getRankEmoji(tournamentResults?.tournamentRank)}
              </p>
              <p className="text-xs text-muted-foreground">
                {tournamentResults?.totalPlayers}人中
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">成績</p>
              <p className="text-2xl font-bold">
                {tournamentResults?.wins}勝{tournamentResults?.losses}敗
              </p>
            </div>
          </div>
          
          {/* Rating Change */}
          <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">レーティング変化</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xl">{tournamentResults?.previousRating}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-2xl font-bold">{tournamentResults?.currentRating}</span>
              <span className={`text-lg font-bold ${
                tournamentResults?.totalRatingChange >= 0 ? 'text-success' : 'text-destructive'
              }`}>
                {tournamentResults?.totalRatingChange >= 0 ? '+' : ''}
                {tournamentResults?.totalRatingChange}
              </span>
            </div>
          </div>
          
          {/* Top 3 Players */}
          {tournamentResults?.topPlayers && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">上位入賞者</p>
              {tournamentResults.topPlayers.map((player: any, index: number) => (
                <div key={player.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getRankEmoji(index + 1)}</span>
                    <span className={player.id === playerId ? 'font-bold' : ''}>
                      {player.name}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {player.wins}勝{player.losses}敗
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Overall Ranking */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">現在の総合ランキング</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Medal className="h-5 w-5 text-primary" />
                {tournamentResults?.overallRank}位
              </p>
            </div>
            <Star className="h-8 w-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>
      
      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onClose}
          className="flex-1"
        >
          ホームに戻る
        </Button>
        <Button 
          onClick={() => window.location.href = '/#/ranking'}
          className="flex-1"
        >
          ランキングを見る
        </Button>
      </div>
    </div>
  );
};