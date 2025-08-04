import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, Play, CheckCircle, AlertCircle, Trophy, Spade, Plus, RefreshCw } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';
import { useNotifications } from '@/hooks/useNotifications';
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
  winner_rating_change?: number;
  loser_rating_change?: number;
}

export const TournamentMatchesView = ({ onClose, currentUserId, tournamentId }: TournamentMatchesViewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserMatch, setCurrentUserMatch] = useState<Match | null>(null);
  const [showMatchInProgress, setShowMatchInProgress] = useState(false);
  const [tournamentProgress, setTournamentProgress] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [ratingChanges, setRatingChanges] = useState<Map<string, {winner_rating_change: number, loser_rating_change: number}>>(new Map());
  const { data: players } = useRankings();

  // Fetch rating changes for completed matches
  const fetchRatingChanges = async (matchList: Match[]) => {
    const newRatingChanges = new Map();
    
    for (const match of matchList) {
      if (match.status === 'approved' || match.status === 'completed') {
        try {
          const response = await fetch(`/api/rating-history?matchId=${match.match_id}`);
          if (response.ok) {
            const ratingData = await response.json();
            newRatingChanges.set(match.match_id, {
              winner_rating_change: ratingData.winner_rating_change,
              loser_rating_change: ratingData.loser_rating_change
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch rating changes for ${match.match_id}:`, error);
        }
      }
    }
    
    setRatingChanges(newRatingChanges);
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    // Force refresh by adding timestamp to avoid cache
    const timestamp = new Date().getTime();
    try {
      const response = await fetch(`/api/matches?tournamentId=${tournamentId}&t=${timestamp}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      if (response.ok) {
        const matchesData = await response.json();
        setMatches(matchesData);
        
        // Fetch rating changes for completed matches
        await fetchRatingChanges(matchesData);
        
        // Find current user's match that's ready to start or in progress
        const userMatch = matchesData.find((match: Match) => 
          (match.player1_id === currentUserId || match.player2_id === currentUserId) &&
          (match.status === 'scheduled' || match.status === 'in_progress')
        );
        setCurrentUserMatch(userMatch || null);
        
        // Calculate tournament progress  
        const completedMatches = matchesData.filter((m: Match) => m.status === 'approved' || m.status === 'completed').length;
        const totalMatches = matchesData.length;
        const nextAvailableMatches = matchesData.filter((m: Match) => m.status === 'scheduled');
        
        setTournamentProgress({
          completed: completedMatches,
          total: totalMatches,
          nextAvailable: nextAvailableMatches
        });
      }
    } catch (error) {
      console.error('Error refreshing matches:', error);
    }
    setIsRefreshing(false);
  };

  // Fetch tournament matches with improved error handling
  const fetchMatches = async () => {
    try {
      const response = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      if (response.ok) {
        const matchesData = await response.json();
        setMatches(matchesData);
        
        // Fetch rating changes for completed matches
        await fetchRatingChanges(matchesData);
        
        // Find current user's match that's ready to start or in progress
        const userMatch = matchesData.find((match: Match) => 
          (match.player1_id === currentUserId || match.player2_id === currentUserId) &&
          (match.status === 'scheduled' || match.status === 'in_progress')
        );
        setCurrentUserMatch(userMatch || null);
        
        // Calculate tournament progress  
        const completedMatches = matchesData.filter((m: Match) => m.status === 'approved' || m.status === 'completed').length;
        const totalMatches = matchesData.length;
        const nextAvailableMatches = matchesData.filter((m: Match) => m.status === 'scheduled');
        
        setTournamentProgress({
          completed: completedMatches,
          total: totalMatches,
          nextAvailable: nextAvailableMatches
        });
      } else if (response.status === 429) {
        // Rate limit exceeded - wait longer before next request
        console.warn('API rate limit exceeded. Reducing request frequency.');
      } else {
        console.error('API Error:', response.status, response.statusText);
      }
    } catch (error) {
      // Network error or other issues - fail silently to avoid console spam
      console.warn('Network error fetching matches, will retry later:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchMatches, 5000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" />待機中</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500 text-white animate-pulse"><Play className="h-3 w-3 mr-1" />対戦中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-orange-500 text-white"><AlertCircle className="h-3 w-3 mr-1" />報告待ち</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />完了</Badge>;
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
    if (!isUserInMatch(match) || match.status !== 'scheduled') {
      return false;
    }

    // Check if this is the next match in sequence
    const matchNumber = parseInt(match.match_number.replace(/^match_/, ''));
    
    // Find all completed matches
    const completedMatches = matches.filter(m => m.status === 'approved');
    const completedMatchNumbers = completedMatches.map(m => parseInt(m.match_number.replace(/^match_/, '')));
    
    // For match 1, it can always start
    if (matchNumber === 1) {
      return true;
    }
    
    // For subsequent matches, check if all previous matches are completed
    for (let i = 1; i < matchNumber; i++) {
      if (!completedMatchNumbers.includes(i)) {
        return false; // Previous match not completed yet
      }
    }
    
    return true;
  };

  const handleStartMatch = async (match: Match) => {
    try {
      console.log('Starting match:', match.match_id, match);
      
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

      console.log('API Response:', response.status, response.statusText);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Match started successfully:', result);
        setShowMatchInProgress(true);
        // Refresh matches to show updated status
        fetchMatches();
      } else {
        const errorText = await response.text();
        console.error('Failed to start match - API Error:', response.status, errorText);
      }
    } catch (error) {
      console.error('Failed to start match - Network Error:', error);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">大会組み合わせ</h1>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleManualRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              更新
            </Button>
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
                    <div className="text-2xl font-bold text-success">
                      {matches.filter(m => m.status === 'approved' || m.status === 'completed').length}
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
                    {Math.round((matches.filter(m => m.status === 'approved' || m.status === 'completed').length / tournamentProgress.total) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">進行率</div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 mb-4">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${(matches.filter(m => m.status === 'approved' || m.status === 'completed').length / tournamentProgress.total) * 100}%` 
                  }}
                ></div>
              </div>

              {/* Detailed Status Overview */}
              <div className="space-y-3">
                {/* Current Status Summary */}
                <div className="grid grid-cols-2 gap-3">
                  {matches.filter(m => m.status === 'in_progress').length > 0 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-600 animate-pulse" />
                        <span className="font-medium text-blue-800">現在対戦中</span>
                      </div>
                      <div className="text-sm text-blue-600 mt-1">
                        {matches.filter(m => m.status === 'in_progress').map(m => {
                          // 強制的にmatch_プレフィックスを削除
                          const matchNum = m.match_number.replace(/^match_/, '');
                          return `${matchNum}試合目`;
                        }).join(', ')}
                      </div>
                    </div>
                  )}
                  
                  {matches.filter(m => m.status === 'completed').length > 0 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-orange-800">報告待ち</span>
                      </div>
                      <div className="text-sm text-orange-600 mt-1">
                        {matches.filter(m => m.status === 'completed').length}件
                      </div>
                    </div>
                  )}
                </div>

                {/* Next Up */}
                {(() => {
                  // Find the next scheduled match in sequence (not necessarily user's match)
                  const scheduledMatches = matches.filter(m => m.status === 'scheduled');
                  const nextMatch = scheduledMatches.find(m => {
                    const matchNumber = parseInt(m.match_number.replace(/^match_/, ''));
                    const completedMatches = matches.filter(match => match.status === 'approved' || match.status === 'completed');
                    const completedMatchNumbers = completedMatches.map(match => parseInt(match.match_number.replace(/^match_/, '')));
                    
                    // For match 1, it can always start
                    if (matchNumber === 1) return true;
                    
                    // For subsequent matches, check if all previous matches are completed
                    for (let i = 1; i < matchNumber; i++) {
                      if (!completedMatchNumbers.includes(i)) return false;
                    }
                    return true;
                  });
                  
                  if (nextMatch) {
                    return (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium text-primary">次の試合</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {nextMatch.match_number.replace(/^match_/, '')}試合目: {nextMatch.player1_name} vs {nextMatch.player2_name}
                            </div>
                          </div>
                          {isUserInMatch(nextMatch) && (
                            <Badge className="bg-primary text-white animate-bounce">
                              あなたの番！
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              
              {matches.filter(m => m.status === 'approved').length === tournamentProgress.total ? (
                <div className="text-center py-2 mt-4">
                  <Badge className="bg-success text-white">
                    <Trophy className="h-3 w-3 mr-1" />
                    大会完了！
                  </Badge>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
        {/* Current User's Match - Only show when it's their turn */}
        {currentUserMatch && canStartMatch(currentUserMatch) && (
          <Card className="border-primary shadow-golden animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Users className="h-5 w-5" />
                次はあなたの試合です
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="space-y-3">
                  <p className="text-lg font-bold">
                    <span className={currentUserMatch.player1_id === currentUserId ? "text-primary" : ""}>
                      {currentUserMatch.player1_name}
                    </span>
                    <span> vs </span>
                    <span className={currentUserMatch.player2_id === currentUserId ? "text-primary" : ""}>
                      {currentUserMatch.player2_name}
                    </span>
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {getGameTypeIcon(currentUserMatch.game_type)}
                        <span className="text-sm font-medium">
                          {getGameTypeName(currentUserMatch.game_type)}
                        </span>
                      </div>
                      {getStatusBadge(currentUserMatch.status)}
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="font-medium">席にお着きください</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                      管理者が試合開始の合図をするまでお待ちください
                    </p>
                  </div>
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
              matches.map((match) => {
                const matchStatusColor = {
                  'scheduled': 'bg-muted/50 border-muted',
                  'in_progress': 'bg-blue-50 border-blue-200',
                  'completed': 'bg-orange-50 border-orange-200',
                  'approved': 'bg-green-50 border-green-200'
                }[match.status] || 'bg-muted/50 border-muted';

                const userMatchHighlight = isUserInMatch(match) ? 'ring-2 ring-primary/20' : '';
                
                return (
                  <div 
                    key={match.match_id} 
                    className={`p-4 rounded-lg border transition-colors ${matchStatusColor} ${userMatchHighlight}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            {match.match_number.replace(/^match_/, '')}試合目
                          </span>
                        </div>
                        <p className="font-medium">
                          <span className={match.player1_id === currentUserId ? "text-primary font-bold" : ""}>
                            {match.player1_name}
                          </span>
                          <span> vs </span>
                          <span className={match.player2_id === currentUserId ? "text-primary font-bold" : ""}>
                            {match.player2_name}
                          </span>
                        </p>
                        {match.status === 'approved' && match.winner_id && (
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2 p-2 bg-success/10 rounded border border-success/20">
                              <Trophy className="h-4 w-4 text-success" />
                              <span className="text-sm font-medium text-success">
                                勝者: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                              </span>
                            </div>
                            {/* レーティング変動表示 */}
                            {(() => {
                              const ratingChange = ratingChanges.get(match.match_id);
                              if (ratingChange) {
                                return (
                                  <div className="flex items-center gap-3 p-2 bg-blue-50 rounded border border-blue-200">
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-green-600 font-medium">
                                        +{Math.abs(ratingChange.winner_rating_change)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        ({match.winner_id === match.player1_id ? match.player1_name : match.player2_name})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-red-600 font-medium">
                                        {ratingChange.loser_rating_change > 0 ? '-' : ''}{Math.abs(ratingChange.loser_rating_change)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        ({match.winner_id === match.player1_id ? match.player2_name : match.player1_name})
                                      </span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        {/* ルール（上） */}
                        <div className="flex items-center gap-1">
                          {getGameTypeIcon(match.game_type)}
                          <span className="text-xs text-muted-foreground">
                            {getGameTypeName(match.game_type)}
                          </span>
                        </div>
                        {/* ステータス（下） */}
                        {getStatusBadge(match.status)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="border-info shadow-soft">
          <CardHeader>
            <CardTitle className="text-info">当日の流れ</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>自分の試合の順番が来るまでお待ちください</li>
              <li>「次はあなたの試合です」が表示されたら席についてください</li>
              <li>管理者が「試合開始」の合図をします</li>
              <li>ゲーム終了後、管理者が勝敗を入力します</li>
              <li>ランキングがすぐに更新されます</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                💡 プレイヤーの皆様は結果入力の必要がありません。管理者が全て操作いたします。
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};