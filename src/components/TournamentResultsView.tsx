import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Clock, Calendar, MapPin, Users, Spade, Plus } from 'lucide-react';

interface TournamentResultsViewProps {
  onClose: () => void;
  tournament: any;
}

interface Match {
  match_id: string;
  tournament_id: string;
  match_number: string;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  game_type: 'trump' | 'cardplus';
  status: 'scheduled' | 'in_progress' | 'completed' | 'approved';
  winner_id: string;
  result_details: string;
  created_at: string;
  completed_at: string;
  approved_at: string;
  winner_rating_change?: number;
  loser_rating_change?: number;
}

export const TournamentResultsView = ({ onClose, tournament }: TournamentResultsViewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actualParticipants, setActualParticipants] = useState(0);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/matches?tournamentId=${tournament.id}`);
        if (response.ok) {
          const data = await response.json();
          // 完了した試合のみをフィルター
          const completedMatches = data.filter((match: Match) => match.status === 'approved');
          
          // レーティング変更情報を取得（データベースに既に保存済み）
          const matchesWithRating = completedMatches.map((match: Match) => {
            // winner_idとresultから勝者・敗者のレーティング変動を特定
            const isPlayer1Winner = match.winner_id === match.player1_id;
            
            return {
              ...match,
              winner_rating_change: isPlayer1Winner 
                ? (match.player1_rating_change || 0)
                : (match.player2_rating_change || 0),
              loser_rating_change: isPlayer1Winner 
                ? (match.player2_rating_change || 0) 
                : (match.player1_rating_change || 0)
            };
          });
          
          setMatches(matchesWithRating);
          
          // Calculate actual participants from matches
          const playerSet = new Set();
          matchesWithRating.forEach(match => {
            if (match.player1_id) playerSet.add(match.player1_id);
            if (match.player2_id) playerSet.add(match.player2_id);
          });
          setActualParticipants(playerSet.size);
        }
      } catch (error) {
        console.error('Failed to fetch tournament results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [tournament.id]);

  const getGameTypeIcon = (gameType: string) => {
    return gameType === 'trump' ? 
      <Spade className="h-4 w-4 text-primary" /> : 
      <Plus className="h-4 w-4 text-accent" />;
  };

  const getGameTypeName = (gameType: string) => {
    return gameType === 'trump' ? 'トランプルール' : 'カードプラスルール';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '未記録';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '未記録';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">結果を読み込み中...</p>
        </div>
      </div>
    );
  }

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
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">大会結果</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              {tournament.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{tournament.date} {tournament.time}〜</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{tournament.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>参加者: {actualParticipants || tournament.current_participants || 0}名</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Match Results */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              試合結果 ({matches.length}試合)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>この大会の結果データが見つかりません</p>
              </div>
            ) : (
              matches
                .sort((a, b) => {
                  const aNum = parseInt(a.match_number.replace(/^match_/, '')) || 0;
                  const bNum = parseInt(b.match_number.replace(/^match_/, '')) || 0;
                  return aNum - bNum;
                })
                .map((match) => {
                  const winnerName = match.winner_id === match.player1_id ? match.player1_name : match.player2_name;
                  const loserName = match.winner_id === match.player1_id ? match.player2_name : match.player1_name;
                  
                  return (
                    <div
                      key={match.match_id}
                      className="p-4 bg-success/10 border border-success/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground text-lg">
                            {match.player1_name} vs {match.player2_name}
                          </h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="font-medium">
                              {match.match_number.replace(/^match_/, '')}試合目
                            </span>
                            <div className="flex items-center gap-1">
                              {getGameTypeIcon(match.game_type)}
                              <span>{getGameTypeName(match.game_type)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <Badge className="bg-success text-success-foreground">
                            完了
                          </Badge>
                          <div className="text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {formatDate(match.approved_at || match.completed_at)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-success/20">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-success" />
                          <div className="flex flex-col">
                            <span className="font-bold text-success text-lg">勝者: {winnerName}</span>
                            {match.winner_rating_change && (
                              <span className="text-sm text-success font-medium">
                                +{match.winner_rating_change}ポイント
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-muted-foreground text-right">
                          <div>敗者: {loserName}</div>
                          {match.loser_rating_change && (
                            <span className="text-sm text-red-600 font-medium">
                              -{Math.abs(match.loser_rating_change)}ポイント
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </CardContent>
        </Card>

        {/* Tournament Summary */}
        {matches.length > 0 && (
          <Card className="border-fantasy-frame shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                大会サマリー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{matches.length}</div>
                  <div className="text-sm text-muted-foreground">総試合数</div>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg">
                  <div className="text-2xl font-bold text-accent">
                    {matches.filter(m => m.game_type === 'trump').length}
                  </div>
                  <div className="text-sm text-muted-foreground">トランプルール</div>
                </div>
                <div className="p-3 bg-info/10 rounded-lg">
                  <div className="text-2xl font-bold text-info">
                    {matches.filter(m => m.game_type === 'cardplus').length}
                  </div>
                  <div className="text-sm text-muted-foreground">カードプラス</div>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <div className="text-2xl font-bold text-success">{actualParticipants || tournament.current_participants || 0}</div>
                  <div className="text-sm text-muted-foreground">参加者数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};