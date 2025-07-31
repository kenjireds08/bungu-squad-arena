import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, Play, CheckCircle, AlertCircle, Trophy, Spade, Plus } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';
import { MatchInProgress } from './MatchInProgress';

interface TournamentMatchesViewProps {
  onClose: () => void;
  currentUserId: string;
  tournamentId: string;
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
}

export const TournamentMatchesView = ({ onClose, currentUserId, tournamentId }: TournamentMatchesViewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserMatch, setCurrentUserMatch] = useState<Match | null>(null);
  const [showMatchInProgress, setShowMatchInProgress] = useState(false);
  const [tournamentProgress, setTournamentProgress] = useState<any>(null);
  const { data: players } = useRankings();

  // Fetch tournament matches
  const fetchMatches = async () => {
    try {
      const response = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      if (response.ok) {
        const matchesData = await response.json();
        setMatches(matchesData);
        
        // Find current user's match that's ready to start or in progress
        console.log('Current User ID:', currentUserId);
        console.log('All matches:', matchesData);
        
        const userMatch = matchesData.find((match: Match) => 
          (match.player1_id === currentUserId || match.player2_id === currentUserId) &&
          (match.status === 'scheduled' || match.status === 'in_progress')
        );
        console.log('Found user match:', userMatch);
        setCurrentUserMatch(userMatch || null);
        
        // Calculate tournament progress
        const completedMatches = matchesData.filter((m: Match) => m.status === 'completed').length;
        const totalMatches = matchesData.length;
        const nextAvailableMatches = matchesData.filter((m: Match) => m.status === 'scheduled');
        
        setTournamentProgress({
          completed: completedMatches,
          total: totalMatches,
          nextAvailable: nextAvailableMatches
        });
        
        console.log('Matches loaded:', matchesData);
        console.log('User match:', userMatch);
        console.log('Tournament progress:', { completedMatches, totalMatches });
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />待機中</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500"><Play className="h-3 w-3 mr-1" />進行中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-orange-500"><AlertCircle className="h-3 w-3 mr-1" />承認待ち</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getGameTypeIcon = (gameType: string) => {
    return gameType === 'trump' ? 
      <Spade className="h-4 w-4 text-primary" /> : 
      <Plus className="h-4 w-4 text-accent" />;
  };

  const getGameTypeName = (gameType: string) => {
    return gameType === 'trump' ? 'トランプ' : 'カード+';
  };

  const isUserInMatch = (match: Match) => {
    return match.player1_id === currentUserId || match.player2_id === currentUserId;
  };

  const canStartMatch = (match: Match) => {
    return isUserInMatch(match) && match.status === 'scheduled';
  };

  const handleStartMatch = async (match: Match) => {
    try {
      // Update match status to in_progress
      const response = await fetch(`/api/matches?matchId=${match.match_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'in_progress'
        }),
      });

      if (response.ok) {
        console.log('Match started:', match);
        setShowMatchInProgress(true);
        // Refresh matches to show updated status
        fetchMatches();
      }
    } catch (error) {
      console.error('Failed to start match:', error);
    }
  };

  const handleFinishMatch = () => {
    // Navigate back to matches view and refresh
    setShowMatchInProgress(false);
    fetchMatches();
  };

  // Show match in progress screen
  if (showMatchInProgress && currentUserMatch) {
    return (
      <MatchInProgress 
        onClose={() => setShowMatchInProgress(false)}
        onFinishMatch={handleFinishMatch}
        currentUserId={currentUserId}
        matchId={currentUserMatch.match_id}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">組み合わせを読み込み中...</p>
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
              <h1 className="text-xl font-bold text-foreground">大会組み合わせ</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Progress */}
        {tournamentProgress && (
          <Card className="border-info shadow-soft animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-info">
                <Trophy className="h-5 w-5" />
                大会進行状況
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">
                      {tournamentProgress.completed}
                    </div>
                    <div className="text-sm text-muted-foreground">完了試合</div>
                  </div>
                  <div className="text-muted-foreground">/</div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {tournamentProgress.total}
                    </div>
                    <div className="text-sm text-muted-foreground">総試合数</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-primary">
                    {Math.round((tournamentProgress.completed / tournamentProgress.total) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">進行率</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-3">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(tournamentProgress.completed / tournamentProgress.total) * 100}%` 
                  }}
                ></div>
              </div>
              
              {tournamentProgress.completed === tournamentProgress.total ? (
                <div className="text-center py-2">
                  <Badge className="bg-success text-white">
                    <Trophy className="h-3 w-3 mr-1" />
                    大会完了！
                  </Badge>
                </div>
              ) : (
                <div className="text-center text-sm text-muted-foreground">
                  残り {tournamentProgress.total - tournamentProgress.completed} 試合
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {/* Current User's Match */}
        {currentUserMatch && (
          <Card className="border-primary shadow-golden animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                あなたの試合
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {getGameTypeIcon(currentUserMatch.game_type)}
                    <span className="font-medium">
                      {getGameTypeName(currentUserMatch.game_type)}ルール
                    </span>
                  </div>
                  <p className="text-lg font-bold">
                    {currentUserMatch.player1_name} vs {currentUserMatch.player2_name}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  {getStatusBadge(currentUserMatch.status)}
                  {canStartMatch(currentUserMatch) && (
                    <div>
                      <Button 
                        variant="heroic" 
                        size="sm" 
                        onClick={() => handleStartMatch(currentUserMatch)}
                        className="animate-bounce-gentle"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        試合開始
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Matches */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              全ての組み合わせ ({matches.length}試合)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>組み合わせがまだ決まっていません</p>
              </div>
            ) : (
              matches.map((match) => (
                <div 
                  key={match.match_id} 
                  className={`p-4 rounded-lg border transition-colors ${
                    isUserInMatch(match) 
                      ? 'bg-primary/10 border-primary/20' 
                      : 'bg-muted/50 border-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {match.match_number}試合目
                        </span>
                        {getGameTypeIcon(match.game_type)}
                        <span className="text-xs text-muted-foreground">
                          {getGameTypeName(match.game_type)}
                        </span>
                      </div>
                      <p className="font-medium">
                        {match.player1_name} vs {match.player2_name}
                      </p>
                      {match.winner_id && (
                        <p className="text-sm text-success">
                          勝者: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {getStatusBadge(match.status)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-info shadow-soft">
          <CardHeader>
            <CardTitle className="text-info">進行の流れ</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>自分の試合の順番が来るまでお待ちください</li>
              <li>「試合開始」ボタンが表示されたら席につきゲームを開始</li>
              <li>試合中は時間が表示されます</li>
              <li>ゲーム終了後、勝敗結果を入力してください</li>
              <li>管理者の承認をお待ちください</li>
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};