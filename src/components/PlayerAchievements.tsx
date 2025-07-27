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
  games: number;
  wins: number;
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
          // Parse champion badges from current user data
          const championBadges: Achievement[] = [];
          if (currentUser.champion_badges) {
            const badges = currentUser.champion_badges.split(',').filter(b => b.trim());
            badges.forEach(badge => {
              if (badge === '🥇') {
                championBadges.push({
                  badge: '🥇',
                  title: `${new Date().getFullYear()}年度 1位`,
                  description: '年間ランキング1位を獲得',
                  date: `${new Date().getFullYear()}-12-31`
                });
              } else if (badge === '🥈') {
                championBadges.push({
                  badge: '🥈',
                  title: `${new Date().getFullYear()}年度 2位`,
                  description: '年間ランキング2位を獲得',
                  date: `${new Date().getFullYear()}-12-31`
                });
              } else if (badge === '🥉') {
                championBadges.push({
                  badge: '🥉',
                  title: `${new Date().getFullYear()}年度 3位`,
                  description: '年間ランキング3位を獲得',
                  date: `${new Date().getFullYear()}-12-31`
                });
              }
            });
          }

          // Generate milestones based on player data
          const milestones: Milestone[] = [
            {
              icon: Trophy,
              title: "初勝利",
              description: "記念すべき初勝利を達成",
              date: currentUser.first_win_date || (currentUser.wins > 0 ? "2024-04-20" : null),
              completed: currentUser.wins > 0
            },
            {
              icon: Target,
              title: "勝率50%達成",
              description: "勝率50%を突破",
              date: currentUser.win_rate_50_date || ((currentUser.wins / Math.max(currentUser.total_games, 1)) >= 0.5 ? "2024-06-01" : null),
              completed: (currentUser.wins / Math.max(currentUser.total_games, 1)) >= 0.5
            },
            {
              icon: Star,
              title: "レート1600突破",
              description: "レーティング1600を達成",
              date: currentUser.rating_1600_date || (currentUser.current_rating >= 1600 ? "2024-06-20" : null),
              completed: currentUser.current_rating >= 1600
            },
            {
              icon: Award,
              title: "10戦達成",
              description: "累計10戦に到達",
              date: currentUser.games_10_date || (currentUser.total_games >= 10 ? "2024-05-15" : null),
              completed: currentUser.total_games >= 10
            },
            {
              icon: Crown,
              title: "連勝記録",
              description: "5連勝を達成",
              date: null, // TODO: Track win streak data
              completed: false
            },
            {
              icon: Trophy,
              title: "大会優勝",
              description: "大会で1位を獲得",
              date: null, // TODO: Track tournament victories
              completed: false
            }
          ];

          // Generate yearly stats
          const yearlyStats: YearlyStats[] = [
            {
              year: new Date().getFullYear(),
              rank: currentUser.rank,
              rating: currentUser.current_rating,
              games: currentUser.total_games,
              wins: currentUser.wins,
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
              <h1 className="text-xl font-bold text-foreground">実績</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Champion Badges */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in">
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
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
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
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
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
                
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-primary">{year.rank}</div>
                    <div className="text-xs text-muted-foreground">最終順位</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-foreground">{year.rating}</div>
                    <div className="text-xs text-muted-foreground">最終レート</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-foreground">{year.games}</div>
                    <div className="text-xs text-muted-foreground">総対戦数</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-success">{year.wins}</div>
                    <div className="text-xs text-muted-foreground">勝利数</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};