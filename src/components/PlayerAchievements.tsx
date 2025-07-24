import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Star, Crown, Target, Award, Calendar } from 'lucide-react';

interface PlayerAchievementsProps {
  onClose: () => void;
}

// Mock achievements data
const mockAchievements = {
  championBadges: [
    { badge: "⭐", title: "2023年度 3位", description: "年間ランキング3位を獲得", date: "2023-12-31" }
  ],
  milestones: [
    { icon: Trophy, title: "初勝利", description: "記念すべき初勝利を達成", date: "2024-04-20", completed: true },
    { icon: Target, title: "勝率50%達成", description: "勝率50%を突破", date: "2024-06-01", completed: true },
    { icon: Star, title: "レート1600突破", description: "レーティング1600を達成", date: "2024-06-20", completed: true },
    { icon: Award, title: "10戦達成", description: "累計10戦に到達", date: "2024-05-15", completed: true },
    { icon: Crown, title: "連勝記録", description: "5連勝を達成", date: null, completed: false },
    { icon: Trophy, title: "大会優勝", description: "大会で1位を獲得", date: null, completed: false }
  ],
  yearlyStats: [
    { year: 2024, rank: 3, rating: 1650, games: 45, wins: 31, badge: "進行中" },
    { year: 2023, rank: 5, rating: 1580, games: 32, wins: 18, badge: "⭐" }
  ]
};

export const PlayerAchievements = ({ onClose }: PlayerAchievementsProps) => {
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
            {mockAchievements.championBadges.length > 0 ? (
              <div className="space-y-3">
                {mockAchievements.championBadges.map((achievement, index) => (
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
            {mockAchievements.milestones.map((milestone, index) => {
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
            {mockAchievements.yearlyStats.map((year, index) => (
              <div key={year.year} className="p-4 bg-muted/30 rounded-lg border border-fantasy-frame/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{year.year}年度</h3>
                  {year.badge !== "進行中" ? (
                    <Badge variant="secondary" className="bg-gradient-gold text-sm">
                      {year.badge} {year.rank}位
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