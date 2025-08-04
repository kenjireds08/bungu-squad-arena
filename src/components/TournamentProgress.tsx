import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Trophy, Clock, CheckCircle, Play, Users, TrendingUp, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TournamentProgressProps {
  onBack: () => void;
}

interface TournamentInfo {
  id: string;
  name: string;
  date: string;
  status: string;
  participants: number;
}

interface MatchInfo {
  match_id: string;
  tournament_id: string;
  match_number: string;
  player1_name: string;
  player2_name: string;
  status: string;
  game_type: string;
}

interface Progress {
  tournament: TournamentInfo;
  matches: MatchInfo[];
  completed: number;
  total: number;
  nextAvailable: MatchInfo[];
}

export const TournamentProgress = ({ onBack }: TournamentProgressProps) => {
  const [activeProgress, setActiveProgress] = useState<Progress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTournamentProgress();
    const interval = setInterval(loadTournamentProgress, 90000); // Refresh every 90 seconds - reduced to minimize API calls
    return () => clearInterval(interval);
  }, []);

  const loadTournamentProgress = async () => {
    try {
      setIsLoading(true);
      
      // Get active tournaments
      const tournamentsResponse = await fetch('/api/tournaments');
      if (!tournamentsResponse.ok) throw new Error('Failed to fetch tournaments');
      
      const tournaments = await tournamentsResponse.json();
      const activeTournaments = tournaments.filter((t: any) => t.status === 'active');
      
      const progressData: Progress[] = [];
      
      for (const tournament of activeTournaments) {
        // Get matches for each tournament
        const matchesResponse = await fetch(`/api/matches?tournamentId=${tournament.id}`);
        if (matchesResponse.ok) {
          const matches = await matchesResponse.json();
          const completed = matches.filter((m: MatchInfo) => m.status === 'completed').length;
          const nextAvailable = matches.filter((m: MatchInfo) => m.status === 'scheduled');
          
          progressData.push({
            tournament,
            matches,
            completed,
            total: matches.length,
            nextAvailable
          });
        }
      }
      
      setActiveProgress(progressData);
    } catch (error) {
      console.error('Failed to load tournament progress:', error);
      toast({
        title: "エラー",
        description: "大会進行状況の読み込みに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressPercentage = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />待機中</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-500"><Play className="h-3 w-3 mr-1" />進行中</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />完了</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">大会進行状況を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">大会進行管理</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {activeProgress.length === 0 ? (
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardContent className="text-center py-12">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">進行中の大会はありません</h3>
              <p className="text-muted-foreground">
                大会が開始されると、ここに進行状況が表示されます。
              </p>
            </CardContent>
          </Card>
        ) : (
          activeProgress.map((progress) => (
            <Card key={progress.tournament.id} className="border-fantasy-frame shadow-soft animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <span>{progress.tournament.name}</span>
                  </div>
                  <Badge 
                    variant={progress.completed === progress.total ? "default" : "secondary"}
                    className={progress.completed === progress.total ? "bg-success" : ""}
                  >
                    {progress.completed === progress.total ? "完了" : "進行中"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Overview */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{progress.completed}</div>
                    <div className="text-sm text-muted-foreground">完了試合</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{progress.total}</div>
                    <div className="text-sm text-muted-foreground">総試合数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-success">
                      {getProgressPercentage(progress.completed, progress.total)}%
                    </div>
                    <div className="text-sm text-muted-foreground">進行率</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>進行状況</span>
                    <span>{progress.completed}/{progress.total} 試合完了</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3">
                    <div 
                      className="bg-primary h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${getProgressPercentage(progress.completed, progress.total)}%` 
                      }}
                    ></div>
                  </div>
                </div>

                {/* Next Available Matches */}
                {progress.nextAvailable.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Play className="h-4 w-4 text-primary" />
                      実行可能な試合 ({progress.nextAvailable.length}試合)
                    </h4>
                    <div className="space-y-2">
                      {progress.nextAvailable.slice(0, 3).map((match) => (
                        <div 
                          key={match.match_id}
                          className="p-3 bg-primary/10 rounded-lg border border-primary/20"
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <div className="font-medium">
                                試合 {match.match_number}: {match.player1_name} vs {match.player2_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {match.game_type === 'trump' ? 'トランプルール' : 'カード+ルール'}
                              </div>
                            </div>
                            {getStatusBadge(match.status)}
                          </div>
                        </div>
                      ))}
                      {progress.nextAvailable.length > 3 && (
                        <div className="text-center text-sm text-muted-foreground">
                          他 {progress.nextAvailable.length - 3} 試合が実行可能
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tournament Complete */}
                {progress.completed === progress.total && (
                  <Alert>
                    <Trophy className="h-4 w-4" />
                    <AlertDescription>
                      🎉 この大会の全試合が完了しました！結果は自動的に保存され、ランキングが更新されています。
                    </AlertDescription>
                  </Alert>
                )}

                {/* Tournament Info */}
                <div className="pt-2 border-t border-muted">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {progress.tournament.participants || 0}名参加
                    </div>
                    <div>{progress.tournament.date}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription>
            進行状況は30秒ごとに自動更新されます。試合結果の承認後、次の試合が自動的に実行可能になります。
          </AlertDescription>
        </Alert>
      </main>
    </div>
  );
};