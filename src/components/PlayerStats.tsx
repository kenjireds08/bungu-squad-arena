import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, TrendingUp, Target, Calendar, Trophy, Users, Loader2 } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';

interface PlayerStatsProps {
  onClose: () => void;
  currentUserId?: string;
}

interface PlayerStatsData {
  currentRating: number;
  highestRating: number;
  totalGames: number;
  winRate: number;
  wins: number;
  losses: number;
  averageOpponentRating: number;
  recentForm: number[];
  monthlyStats: Array<{
    month: string;
    games: number;
    wins: number;
    rating: number;
  }>;
}

export const PlayerStats = ({ onClose, currentUserId = "player_001" }: PlayerStatsProps) => {
  const [statsData, setStatsData] = useState<PlayerStatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: rankings } = useRankings();

  useEffect(() => {
    const loadPlayerStats = async () => {
      try {
        setIsLoading(true);
        
        // Find current user from rankings
        const currentUser = rankings?.find(player => player.id === currentUserId);
        
        if (currentUser) {
          // Calculate stats from available data
          const stats: PlayerStatsData = {
            currentRating: currentUser.current_rating,
            highestRating: currentUser.highest_rating || currentUser.current_rating,
            totalGames: currentUser.total_games || 0,
            winRate: currentUser.total_games > 0 ? (currentUser.wins / currentUser.total_games) * 100 : 0,
            wins: currentUser.wins || 0,
            losses: (currentUser.total_games || 0) - (currentUser.wins || 0),
            averageOpponentRating: 1585, // TODO: Calculate from match history
            recentForm: [1, 1, 0, 1, 1, 1, 0, 1, 1, 0], // TODO: Get from match history
            monthlyStats: [
              { month: '4月', games: 8, wins: 6, rating: 1580 },
              { month: '5月', games: 12, wins: 8, rating: 1620 },
              { month: '6月', games: 15, wins: 10, rating: 1650 },
              { month: '7月', games: 10, wins: 7, rating: currentUser.current_rating }
            ] // TODO: Get from historical data
          };
          
          setStatsData(stats);
        }
      } catch (error) {
        console.error('Failed to load player stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (rankings) {
      loadPlayerStats();
    }
  }, [rankings, currentUserId]);

  if (isLoading || !statsData) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">統計データを読み込み中...</p>
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
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">統計</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Current Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">現在レーティング</span>
              </div>
              <div className="text-2xl font-bold text-primary">{statsData.currentRating}</div>
              <div className="text-xs text-muted-foreground">最高: {statsData.highestRating}</div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-muted-foreground">勝率</span>
              </div>
              <div className="text-2xl font-bold text-success">{statsData.winRate.toFixed(1)}%</div>
              <div className="text-xs text-muted-foreground">{statsData.wins}勝{statsData.losses}敗</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Form */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              最近の成績（直近10戦）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 mb-4">
              {statsData.recentForm.map((result, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    result === 1 
                      ? 'bg-success text-success-foreground' 
                      : 'bg-destructive text-destructive-foreground'
                  }`}
                >
                  {result === 1 ? '勝' : '負'}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              直近10戦：{statsData.recentForm.filter(r => r === 1).length}勝{statsData.recentForm.filter(r => r === 0).length}敗
            </div>
          </CardContent>
        </Card>

        {/* Monthly Progress */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              月別成績
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {statsData.monthlyStats.map((month, index) => (
              <div key={month.month} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 text-center font-semibold">{month.month}</div>
                  <div className="space-y-1">
                    <div className="text-sm">
                      {month.games}戦 {month.wins}勝{month.games - month.wins}敗
                    </div>
                    <div className="text-xs text-muted-foreground">
                      勝率: {((month.wins / month.games) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">{month.rating}</div>
                  <div className="text-xs text-muted-foreground">レート</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Stats */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              その他の統計
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">{statsData.totalGames}</div>
                <div className="text-sm text-muted-foreground">総対戦数</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-foreground">{statsData.averageOpponentRating}</div>
                <div className="text-sm text-muted-foreground">平均対戦相手レート</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};