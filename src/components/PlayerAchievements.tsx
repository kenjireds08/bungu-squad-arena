import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Star, Crown, Target, Award, Calendar, Loader2 } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';

interface PlayerAchievementsProps {
  onClose: () => void;
  currentUserId?: string;
}

interface Achievement {
  badge: string;
  title: string;
  description: string;
  date: string;
}

interface Milestone {
  icon: any;
  title: string;
  description: string;
  date: string | null;
  completed: boolean;
}

interface YearlyStats {
  year: number;
  rank: number;
  rating: number;
  highestRating: number;
  games: number;
  wins: number;
  losses: number;
  badge: string;
}

interface AchievementsData {
  championBadges: Achievement[];
  milestones: Milestone[];
  yearlyStats: YearlyStats[];
}

export const PlayerAchievements = ({ onClose, currentUserId = "player_001" }: PlayerAchievementsProps) => {
  const [achievementsData, setAchievementsData] = useState<AchievementsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { data: rankings } = useRankings();

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setIsLoading(true);
        
        const currentUser = rankings?.find(player => player.id === currentUserId);
        
        if (currentUser) {
          // Get match history to find first win date and calculate stats
          let firstWinDate: string | null = null;
          let maxWinStreak = 0;
          let currentWinStreak = 0;
          let winStreakAchievedDate: string | null = null;
          let tenGamesAchievedDate: string | null = null;
          let winRate50AchievedDate: string | null = null;
          let rating1300AchievedDate: string | null = null;
          
          try {
            const matchResponse = await fetch(`/api/matches?playerId=${currentUserId}`);
            if (matchResponse.ok) {
              const matchHistory = await matchResponse.json();
              
              // Find first win date and calculate win streaks
              const wins = matchHistory.filter((match: any) => match.result === 'win');
              if (wins.length > 0) {
                // Get the earliest win date - prefer timestamp over other fields
                const sortedWins = wins.sort((a: any, b: any) => 
                  new Date(a.timestamp || a.match_date || a.created_at).getTime() - 
                  new Date(b.timestamp || b.match_date || b.created_at).getTime()
                );
                firstWinDate = sortedWins[0].timestamp || sortedWins[0].match_date || sortedWins[0].created_at;
              }
              
              // Calculate win streak and find achievement dates
              let totalWins = 0;
              let totalLosses = 0;
              let currentRating = 1200; // Starting rating
              
              matchHistory.forEach((match: any, index: number) => {
                if (match.result === 'win') {
                  currentWinStreak++;
                  totalWins++;
                  currentRating += 15; // Approximate rating change
                  
                  // 3連勝を初めて達成した時の日付を記録
                  if (currentWinStreak === 3 && !winStreakAchievedDate) {
                    winStreakAchievedDate = match.timestamp || match.match_date || match.created_at;
                  }
                  maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                } else if (match.result === 'lose') {
                  currentWinStreak = 0;
                  totalLosses++;
                  currentRating -= 15; // Approximate rating change
                }
                
                const totalGamesPlayed = totalWins + totalLosses;
                
                // 10試合目の日付を記録
                if (totalGamesPlayed === 10 && !tenGamesAchievedDate) {
                  tenGamesAchievedDate = match.timestamp || match.match_date || match.created_at;
                }
                
                // 10戦以上で勝率50%を達成した日付を記録
                if (totalGamesPlayed >= 10 && totalWins / totalGamesPlayed >= 0.5 && !winRate50AchievedDate) {
                  winRate50AchievedDate = match.timestamp || match.match_date || match.created_at;
                }
                
                // レート1300を超えた日付を記録
                if (currentRating >= 1300 && !rating1300AchievedDate) {
                  rating1300AchievedDate = match.timestamp || match.match_date || match.created_at;
                }
              });
            }
          } catch (error) {
            console.warn('Failed to fetch match history for achievements:', error);
          }
          // Parse champion badges from current user data
          const championBadges: Achievement[] = [];
          if (currentUser.champion_badges) {
            const badges = currentUser.champion_badges.split(',').filter(b => b.trim());
            badges.forEach(badge => {
              const badgeTrim = badge.trim();
              // バッジは過去の実績なので、前年度として表示
              const badgeYear = new Date().getFullYear() - 1;
              if (badgeTrim === '🥇') {
                championBadges.push({
                  badge: '🥇',
                  title: `${badgeYear}年度 チャンピオン`,
                  description: '年間ランキング1位を獲得',
                  date: `${badgeYear}-12-31`
                });
              } else if (badgeTrim === '🥈') {
                championBadges.push({
                  badge: '🥈',
                  title: `${badgeYear}年度 準優勝`,
                  description: '年間ランキング2位を獲得',
                  date: `${badgeYear}-12-31`
                });
              } else if (badgeTrim === '🥉') {
                championBadges.push({
                  badge: '🥉',
                  title: `${badgeYear}年度 3位`,
                  description: '年間ランキング3位を獲得',
                  date: `${badgeYear}-12-31`
                });
              }
            });
          }

          // Calculate total games and win rate
          const totalGames = (currentUser.annual_wins || 0) + (currentUser.annual_losses || 0);
          const winRate = totalGames > 0 ? (currentUser.annual_wins || 0) / totalGames : 0;
          
          // Generate milestones based on player data
          const milestones: Milestone[] = [
            {
              icon: Trophy,
              title: "初勝利",
              description: "記念すべき初勝利を達成",
              date: firstWinDate,
              completed: firstWinDate !== null
            },
            {
              icon: Target,
              title: "勝率50%達成（10戦以上）",
              description: "10戦以上で勝率50%を突破",
              date: winRate50AchievedDate,
              completed: totalGames >= 10 && winRate >= 0.5
            },
            {
              icon: Star,
              title: "レート1300突破",
              description: "レーティング1300を達成",
              date: rating1300AchievedDate,
              completed: currentUser.current_rating >= 1300
            },
            {
              icon: Award,
              title: "10戦達成",
              description: "累計10戦に到達",
              date: tenGamesAchievedDate,
              completed: totalGames >= 10
            },
            {
              icon: Crown,
              title: "連勝記録",
              description: "3連勝を達成",
              date: winStreakAchievedDate,
              completed: maxWinStreak >= 3
            }
          ];

          // Generate yearly stats
          const yearlyStats: YearlyStats[] = [
            {
              year: new Date().getFullYear(),
              rank: currentUser.rank || 0,
              rating: currentUser.current_rating || 1500,
              highestRating: currentUser.highest_rating || currentUser.current_rating || 1500,
              games: totalGames,
              wins: currentUser.annual_wins || 0,
              losses: currentUser.annual_losses || 0,
              badge: currentUser.rank <= 3 ? (currentUser.rank === 1 ? '🥇' : currentUser.rank === 2 ? '🥈' : '🥉') : '進行中'
            }
          ];

          setAchievementsData({
            championBadges,
            milestones,
            yearlyStats
          });
        }
      } catch (error) {
        console.error('Failed to load achievements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (rankings) {
      loadAchievements();
    }
  }, [rankings, currentUserId]);

  if (isLoading || !achievementsData) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">実績データを読み込み中...</p>
        </div>
      </div>
    );
  }
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "未達成";
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background - Glue */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:bg-[length:60%] bg-[length:85%]"
        style={{
          backgroundImage: `url('/assets/characters/glue.png')`,
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
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">実績</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Champion Badges */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              チャンピオンバッジ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {achievementsData.championBadges.length > 0 ? (
              <div className="space-y-3">
                {achievementsData.championBadges.map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gradient-gold/20 rounded-lg border border-primary/20">
                    <div className="text-2xl">{achievement.badge}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">{achievement.title}</div>
                      <div className="text-sm text-muted-foreground">{achievement.description}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(achievement.date)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Crown className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>まだチャンピオンバッジはありません</p>
                <p className="text-sm">年間ランキング上位を目指しましょう！</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Milestones */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              マイルストーン
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievementsData.milestones.map((milestone, index) => {
              const IconComponent = milestone.icon;
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    milestone.completed 
                      ? 'bg-success/10 border-success/20' 
                      : 'bg-muted/20 border-muted/40 opacity-60'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    milestone.completed ? 'bg-success/20' : 'bg-muted/30'
                  }`}>
                    <IconComponent className={`h-5 w-5 ${
                      milestone.completed ? 'text-success' : 'text-muted-foreground'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-medium ${
                      milestone.completed ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {milestone.title}
                    </div>
                    <div className="text-sm text-muted-foreground">{milestone.description}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(milestone.date)}</div>
                  </div>
                  {milestone.completed && (
                    <Badge variant="default" className="bg-success">完了</Badge>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Yearly Performance */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              年間成績
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {achievementsData.yearlyStats.map((year, index) => (
              <div key={year.year} className="p-4 bg-muted/30 rounded-lg border border-fantasy-frame/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{year.year}年度</h3>
                  {year.badge !== "進行中" ? (
                    <Badge variant="secondary" className="bg-gradient-gold text-sm">
                      {year.rank <= 3 ? year.badge : ""} {year.rank}位
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-sm">
                      {year.badge}
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-primary">{year.rank}</div>
                    <div className="text-xs text-muted-foreground">最終順位</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-foreground">{year.rating}</div>
                    <div className="text-xs text-muted-foreground">最終レート</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-warning">{year.highestRating}</div>
                    <div className="text-xs text-muted-foreground">最高レート</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center mt-3">
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-foreground">{year.games}</div>
                    <div className="text-xs text-muted-foreground">総対戦数</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-success">{year.wins}勝</div>
                    <div className="text-xs text-muted-foreground">年間勝利</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-destructive">{year.losses}敗</div>
                    <div className="text-xs text-muted-foreground">年間敗北</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
  );
};