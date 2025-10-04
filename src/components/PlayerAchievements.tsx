import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Star, Crown, Target, Award, Calendar, Loader2, TrendingUp, Zap, Flag, Sparkles } from 'lucide-react';
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

  // スワイプジェスチャーの状態管理
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

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
          let fiveWinStreakAchievedDate: string | null = null;
          let tenGamesAchievedDate: string | null = null;
          let thirtyGamesAchievedDate: string | null = null;
          let fiftyGamesAchievedDate: string | null = null;
          let winRate50AchievedDate: string | null = null;
          let rating1250AchievedDate: string | null = null;
          let rating1300AchievedDate: string | null = null;
          let rating1350AchievedDate: string | null = null;
          
          // 年度別統計を格納する変数
          const yearlyStatsMap: { [year: number]: YearlyStats } = {};

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

              // 年度ごとに試合を分類して統計を計算（古い順に処理）
              const sortedMatches = matchHistory.slice().reverse();

              sortedMatches.forEach((match: any, index: number) => {
                // 年度を取得
                const matchDate = new Date(match.timestamp || match.match_date || match.created_at);
                const year = matchDate.getFullYear();

                // 年度別統計の初期化
                if (!yearlyStatsMap[year]) {
                  yearlyStatsMap[year] = {
                    year,
                    rank: 0,
                    rating: 1200,
                    highestRating: 1200,
                    games: 0,
                    wins: 0,
                    losses: 0,
                    badge: '進行中'
                  };
                }

                // 年度別の試合数・勝敗を集計（完了した試合のみ）
                if (match.result === 'win' || match.result === 'lose') {
                  yearlyStatsMap[year].games++;

                  if (match.result === 'win') {
                    currentWinStreak++;
                    totalWins++;
                    yearlyStatsMap[year].wins++;

                    // レート変動を加算（実際のrating_changeがあればそれを使用）
                    const ratingChange = Number(match.rating_change) || 15;
                    currentRating += ratingChange;

                    // 3連勝を初めて達成した時の日付を記録
                    if (currentWinStreak === 3 && !winStreakAchievedDate) {
                      winStreakAchievedDate = match.timestamp || match.match_date || match.created_at;
                    }

                    // 5連勝を初めて達成した時の日付を記録
                    if (currentWinStreak === 5 && !fiveWinStreakAchievedDate) {
                      fiveWinStreakAchievedDate = match.timestamp || match.match_date || match.created_at;
                    }

                    maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
                  } else if (match.result === 'lose') {
                    currentWinStreak = 0;
                    totalLosses++;
                    yearlyStatsMap[year].losses++;

                    // レート変動を減算
                    const ratingChange = Number(match.rating_change) || -15;
                    currentRating += ratingChange;
                  }

                  // 年度の最終レートと最高レートを更新（完了した試合のみ）
                  yearlyStatsMap[year].rating = currentRating;
                  yearlyStatsMap[year].highestRating = Math.max(
                    yearlyStatsMap[year].highestRating,
                    currentRating
                  );
                }

                const totalGamesPlayed = totalWins + totalLosses;

                // 10試合目の日付を記録
                if (totalGamesPlayed === 10 && !tenGamesAchievedDate) {
                  tenGamesAchievedDate = match.timestamp || match.match_date || match.created_at;
                }

                // 30試合目の日付を記録
                if (totalGamesPlayed === 30 && !thirtyGamesAchievedDate) {
                  thirtyGamesAchievedDate = match.timestamp || match.match_date || match.created_at;
                }

                // 50試合目の日付を記録
                if (totalGamesPlayed === 50 && !fiftyGamesAchievedDate) {
                  fiftyGamesAchievedDate = match.timestamp || match.match_date || match.created_at;
                }

                // 10戦以上で勝率50%を達成した日付を記録
                if (totalGamesPlayed >= 10 && totalWins / totalGamesPlayed >= 0.5 && !winRate50AchievedDate) {
                  winRate50AchievedDate = match.timestamp || match.match_date || match.created_at;
                }

                // レート1250を超えた日付を記録
                if (currentRating >= 1250 && !rating1250AchievedDate) {
                  rating1250AchievedDate = match.timestamp || match.match_date || match.created_at;
                }

                // レート1300を超えた日付を記録
                if (currentRating >= 1300 && !rating1300AchievedDate) {
                  rating1300AchievedDate = match.timestamp || match.match_date || match.created_at;
                }

                // レート1350を超えた日付を記録
                if (currentRating >= 1350 && !rating1350AchievedDate) {
                  rating1350AchievedDate = match.timestamp || match.match_date || match.created_at;
                }
              });
            }
          } catch (error) {
            console.warn('Failed to fetch match history for achievements:', error);
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
              icon: Award,
              title: "10戦達成",
              description: "累計10試合に到達",
              date: tenGamesAchievedDate,
              completed: totalGames >= 10
            },
            {
              icon: Crown,
              title: "3連勝",
              description: "3連勝を達成",
              date: winStreakAchievedDate,
              completed: maxWinStreak >= 3
            },
            {
              icon: TrendingUp,
              title: "レート1250突破",
              description: "レーティング1250を達成",
              date: rating1250AchievedDate,
              completed: currentUser.current_rating >= 1250
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
              icon: Flag,
              title: "30戦達成",
              description: "累計30試合に到達",
              date: thirtyGamesAchievedDate,
              completed: totalGames >= 30
            },
            {
              icon: Zap,
              title: "5連勝",
              description: "5連勝を達成",
              date: fiveWinStreakAchievedDate,
              completed: maxWinStreak >= 5
            },
            {
              icon: Sparkles,
              title: "レート1350突破",
              description: "レーティング1350を達成",
              date: rating1350AchievedDate,
              completed: currentUser.current_rating >= 1350
            },
            {
              icon: Flag,
              title: "50戦達成",
              description: "累計50試合に到達",
              date: fiftyGamesAchievedDate,
              completed: totalGames >= 50
            }
          ];

          // Generate yearly stats（年度別統計を配列に変換、降順ソート）
          const currentYear = new Date().getFullYear();
          const yearlyStats: YearlyStats[] = Object.values(yearlyStatsMap).sort((a, b) => b.year - a.year);

          // 現在年度のランキング順位とバッジを設定
          yearlyStats.forEach(stat => {
            if (stat.year === currentYear) {
              stat.rank = currentUser.rank || 0;
              stat.rating = currentUser.current_rating || stat.rating;
              stat.highestRating = currentUser.highest_rating || stat.highestRating;
              stat.badge = currentUser.rank <= 3
                ? (currentUser.rank === 1 ? '🥇' : currentUser.rank === 2 ? '🥈' : '🥉')
                : '進行中';
            }
          });

          // 試合履歴がない場合は現在年度のデータを追加
          if (yearlyStats.length === 0) {
            yearlyStats.push({
              year: currentYear,
              rank: currentUser.rank || 0,
              rating: currentUser.current_rating || 1200,
              highestRating: currentUser.highest_rating || currentUser.current_rating || 1200,
              games: totalGames,
              wins: currentUser.annual_wins || 0,
              losses: currentUser.annual_losses || 0,
              badge: currentUser.rank <= 3
                ? (currentUser.rank === 1 ? '🥇' : currentUser.rank === 2 ? '🥈' : '🥉')
                : '進行中'
            });
          }

          // チャンピオンバッジをYearlyArchiveから取得
          const championBadges: Achievement[] = [];

          try {
            const archiveResponse = await fetch(`/api/yearly-archive?playerId=${currentUserId}`);
            if (archiveResponse.ok) {
              const archives = await archiveResponse.json();

              // 年度別アーカイブからバッジを生成
              archives.forEach((archive: any) => {
                const year = parseInt(archive.year, 10);
                const rank = parseInt(archive.annual_rank, 10);
                const badge = archive.champion_badge;

                if (badge && rank <= 3) {
                  let title = '';
                  let description = '';

                  if (rank === 1) {
                    title = `${year}年度 チャンピオン`;
                    description = '年間ランキング1位を獲得';
                  } else if (rank === 2) {
                    title = `${year}年度 準優勝`;
                    description = '年間ランキング2位を獲得';
                  } else if (rank === 3) {
                    title = `${year}年度 3位`;
                    description = '年間ランキング3位を獲得';
                  }

                  if (title) {
                    championBadges.push({
                      badge,
                      title,
                      description,
                      date: archive.archived_at || `${year}-12-31`
                    });
                  }
                }
              });

              // バッジを年度降順でソート
              championBadges.sort((a, b) => {
                const yearA = parseInt(a.date.split('-')[0], 10);
                const yearB = parseInt(b.date.split('-')[0], 10);
                return yearB - yearA;
              });

              console.log(`[PlayerAchievements] Loaded ${championBadges.length} champion badges from YearlyArchive`);
            }
          } catch (error) {
            console.warn('Failed to fetch yearly archive, falling back to champion_badges field:', error);
          }

          // フォールバック: champion_badgesフィールドから取得（旧形式対応）
          if (championBadges.length === 0 && currentUser.champion_badges) {
            console.log('[PlayerAchievements] Using fallback: champion_badges field');
            const badges = currentUser.champion_badges.split(',').filter(b => b.trim());
            badges.forEach(badge => {
              const badgeTrim = badge.trim();

              // 年度付き形式: "2024:🥇"
              if (badgeTrim.includes(':')) {
                const [yearStr, badgeIcon] = badgeTrim.split(':');
                const year = parseInt(yearStr, 10);

                if (badgeIcon === '🥇') {
                  championBadges.push({
                    badge: '🥇',
                    title: `${year}年度 チャンピオン`,
                    description: '年間ランキング1位を獲得',
                    date: `${year}-12-31`
                  });
                } else if (badgeIcon === '🥈') {
                  championBadges.push({
                    badge: '🥈',
                    title: `${year}年度 準優勝`,
                    description: '年間ランキング2位を獲得',
                    date: `${year}-12-31`
                  });
                } else if (badgeIcon === '🥉') {
                  championBadges.push({
                    badge: '🥉',
                    title: `${year}年度 3位`,
                    description: '年間ランキング3位を獲得',
                    date: `${year}-12-31`
                  });
                }
              } else {
                // 後方互換: 年度なし形式（前年度として扱う）
                const badgeYear = currentYear - 1;
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
              }
            });

            // バッジを年度降順でソート
            championBadges.sort((a, b) => {
              const yearA = parseInt(a.date.split('-')[0], 10);
              const yearB = parseInt(b.date.split('-')[0], 10);
              return yearB - yearA;
            });
          }

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

  // スワイプジェスチャーハンドラー
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const screenWidth = window.innerWidth;

    // 左端10%以内からのタッチのみ記録
    if (touch.clientX < screenWidth * 0.1) {
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = touch.clientY - touchStart.y;

    // 右方向に50px以上スワイプ、かつ縦方向の移動が横方向の移動より小さい場合
    if (deltaX > 50 && Math.abs(deltaY) < Math.abs(deltaX)) {
      onClose();
    }

    setTouchStart(null);
  };

  const handleTouchMove = () => {
    // touchMoveが発生したら、スクロールとの競合を防ぐため何もしない
  };

  return (
    <div
      className="min-h-screen bg-gradient-parchment relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
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