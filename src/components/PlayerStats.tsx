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
  averageRatingChange: number;
  maxWinStreak: number;
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
      // Early return if no userId or rankings
      if (!currentUserId || !rankings || rankings.length === 0) {
        console.warn('No userId or rankings data for statistics');
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Find current user from rankings
        const currentUser = rankings.find(player => player.id === currentUserId);
        
        if (!currentUser) {
          console.warn('User not found in rankings:', currentUserId);
          setIsLoading(false);
          return;
        }
        
        console.log('[PlayerStats] Loading stats for user:', currentUserId, 'User data:', currentUser);
        
        // Use actual data from the database
        const annualGames = (currentUser.annual_wins || 0) + (currentUser.annual_losses || 0);
        const totalGames = currentUser.matches || (currentUser.total_wins || 0) + (currentUser.total_losses || 0);
        
        // Use annual stats for current year display
        const winRate = annualGames > 0 
          ? ((currentUser.annual_wins || 0) / annualGames) * 100 
          : 0;
        
        // 試合履歴を取得して詳細な統計を計算
        let matchHistory = [];
        let averageRatingChange = 0;
        let maxWinStreak = 0;
        let currentWinStreak = 0;
        let actualWins = 0;
        let actualLosses = 0;
        let averageOpponentRating = 1500;
        
        try {
          const matchResponse = await fetch(`/api/matches?playerId=${currentUserId}`);
          if (matchResponse.ok) {
            matchHistory = await matchResponse.json();
            
            // 平均レート変動と連勝記録、勝敗数を計算
            let totalRatingChange = 0;
            let ratingChangeCount = 0;
            let totalOpponentRating = 0;
            let opponentCount = 0;
            
            // 全プレイヤーのレーティング情報を取得して対戦相手のレートを計算
            const opponentRatings: { [key: string]: number } = {};
            rankings?.forEach(player => {
              opponentRatings[player.id] = player.current_rating || 1500;
            });
            
            matchHistory.forEach((match: any) => {
              // 勝敗を判定
              if (match.result === 'win') {
                actualWins++;
                currentWinStreak++;
                maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
              } else if (match.result === 'lose') {
                actualLosses++;
                currentWinStreak = 0;
              }
              
              // レート変動を計算
              if (match.rating_change) {
                totalRatingChange += parseInt(match.rating_change);
                ratingChangeCount++;
              }
              
              // 対戦相手のレートを集計
              if (match.opponent?.id) {
                const opponentRating = opponentRatings[match.opponent.id] || 1500;
                totalOpponentRating += opponentRating;
                opponentCount++;
              }
            });
            
            averageRatingChange = ratingChangeCount > 0 ? totalRatingChange / ratingChangeCount : 0;
            averageOpponentRating = opponentCount > 0 ? Math.round(totalOpponentRating / opponentCount) : 1500;
          }
        } catch (error) {
          console.warn('Failed to fetch match history:', error);
        }
        
        // 最近の成績を作成（直近10戦）
        const recentFormArray = matchHistory.slice(0, 10).map((match: any) =>
          match.result === 'win' ? 1 : 0
        );

        // 四半期別統計を計算（1-3月、4-6月、7-9月、10-12月）
        const quarterStats = [
          { month: '第1四半期', games: 0, wins: 0, rating: 1200, lastRating: 1200 },
          { month: '第2四半期', games: 0, wins: 0, rating: 1200, lastRating: 1200 },
          { month: '第3四半期', games: 0, wins: 0, rating: 1200, lastRating: 1200 },
          { month: '第4四半期', games: 0, wins: 0, rating: 1200, lastRating: 1200 }
        ];

        // 初期レート（試合参加前）
        const INITIAL_RATING = 1200;

        // 試合履歴を四半期ごとに集計
        matchHistory.forEach((match: any) => {
          if (!match.timestamp) return;

          // 日付から月を取得（YYYY-MM-DD形式を想定）
          const timestamp = match.timestamp;
          let month = 0;

          // ISO形式やその他の形式に対応
          const dateMatch = timestamp.match(/\d{4}-(\d{2})/);
          if (dateMatch) {
            month = parseInt(dateMatch[1], 10);
          } else {
            // フォールバック: Dateオブジェクトで解析
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
              month = date.getMonth() + 1; // 0-11 → 1-12
            }
          }

          if (month < 1 || month > 12) return; // 無効な月はスキップ

          // 四半期を判定（1-3月=Q1, 4-6月=Q2, 7-9月=Q3, 10-12月=Q4）
          let quarterIndex = 0;
          if (month >= 1 && month <= 3) quarterIndex = 0;
          else if (month >= 4 && month <= 6) quarterIndex = 1;
          else if (month >= 7 && month <= 9) quarterIndex = 2;
          else if (month >= 10 && month <= 12) quarterIndex = 3;

          quarterStats[quarterIndex].games++;
          if (match.result === 'win') {
            quarterStats[quarterIndex].wins++;
          }
        });

        // 各四半期の最終レートを計算（試合がある場合）
        // 試合履歴は最新→古い順なので、逆順で処理してレートを追跡
        let currentRating = INITIAL_RATING;
        const matchesByQuarter: { [key: number]: any[] } = { 0: [], 1: [], 2: [], 3: [] };

        // 四半期ごとに試合を分類（古い順にソート）
        matchHistory.slice().reverse().forEach((match: any) => {
          if (!match.timestamp) return;

          const timestamp = match.timestamp;
          let month = 0;
          const dateMatch = timestamp.match(/\d{4}-(\d{2})/);
          if (dateMatch) {
            month = parseInt(dateMatch[1], 10);
          } else {
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
              month = date.getMonth() + 1;
            }
          }

          if (month < 1 || month > 12) return;

          let quarterIndex = 0;
          if (month >= 1 && month <= 3) quarterIndex = 0;
          else if (month >= 4 && month <= 6) quarterIndex = 1;
          else if (month >= 7 && month <= 9) quarterIndex = 2;
          else if (month >= 10 && month <= 12) quarterIndex = 3;

          matchesByQuarter[quarterIndex].push(match);
        });

        // 各四半期の最終レートを計算
        [0, 1, 2, 3].forEach(quarterIndex => {
          if (matchesByQuarter[quarterIndex].length > 0) {
            // この四半期に試合があった場合
            const quarterMatches = matchesByQuarter[quarterIndex];

            // 最後の試合のレート変動を累積してレートを計算
            quarterMatches.forEach((match: any) => {
              if (match.rating_change) {
                currentRating += Number(match.rating_change) || 0;
              }
            });

            quarterStats[quarterIndex].lastRating = currentRating;
            quarterStats[quarterIndex].rating = currentRating;
          } else {
            // この四半期に試合がない場合は初期レート（1200）を表示
            quarterStats[quarterIndex].rating = INITIAL_RATING;
          }
        });

        const stats: PlayerStatsData = {
          currentRating: currentUser.current_rating || 1500,
          highestRating: currentUser.highest_rating || currentUser.current_rating || 1500,
          totalGames: matchHistory.length || totalGames,
          winRate: matchHistory.length > 0 ? (actualWins / matchHistory.length) * 100 : winRate,
          wins: actualWins || currentUser.annual_wins || 0,
          losses: actualLosses || currentUser.annual_losses || 0,
          averageOpponentRating: averageOpponentRating,
          recentForm: recentFormArray,
          averageRatingChange: Math.round(averageRatingChange * 10) / 10,
          maxWinStreak: maxWinStreak,
          monthlyStats: quarterStats
        };
        
        setStatsData(stats);
        
      } catch (error) {
        console.error('Failed to load player stats:', error);
        setStatsData(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if we have both rankings and userId
    if (rankings && currentUserId) {
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
    <div className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background - Eraser */}
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
              <BarChart3 className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">統計</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Current Stats Overview */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-fantasy-frame shadow-soft animate-fade-in bg-background/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">現在レーティング</span>
              </div>
              <div className="text-2xl font-bold text-primary">{statsData.currentRating}</div>
              <div className="text-xs text-muted-foreground">最高: {statsData.highestRating}</div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-fade-in bg-background/30" style={{ animationDelay: '100ms' }}>
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

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-fantasy-frame shadow-soft animate-fade-in bg-background/30" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-info" />
                <span className="text-sm font-medium text-muted-foreground">平均レート変動</span>
              </div>
              <div className="text-2xl font-bold text-info">
                {statsData.averageRatingChange && statsData.averageRatingChange > 0 ? '+' : ''}{statsData.averageRatingChange || 0}
              </div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-fade-in bg-background/30" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-muted-foreground">最高連勝</span>
              </div>
              <div className="text-2xl font-bold text-warning">{statsData.maxWinStreak || 0}連勝</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Form */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30">
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
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              四半期別成績
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
                      勝率: {month.games > 0 ? ((month.wins / month.games) * 100).toFixed(1) : '0.0'}%
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
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30" style={{ animationDelay: '300ms' }}>
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
    </div>
  );
};