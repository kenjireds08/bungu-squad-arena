import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ArrowLeft, Trophy, Star, Crown, Target, Award, Calendar, Loader2, TrendingUp, Zap, Flag, Sparkles, ChevronRight, Users } from 'lucide-react';
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

interface TournamentStats {
  tournament_id: string;
  tournament_name: string;
  date: string;
  wins: number;
  losses: number;
  matches: {
    opponent_name: string;
    result: 'win' | 'lose';
    rating_change: number;
  }[];
}

interface OpponentStats {
  opponent_name: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
}

interface RatingDataPoint {
  date: string;
  rating: number;
  displayDate: string;
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

  // 年間成績詳細ダイアログの状態管理
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearlyDetailOpen, setYearlyDetailOpen] = useState(false);
  const [yearlyTournaments, setYearlyTournaments] = useState<TournamentStats[]>([]);
  const [yearlyOpponents, setYearlyOpponents] = useState<OpponentStats[]>([]);
  const [yearlyRatingHistory, setYearlyRatingHistory] = useState<RatingDataPoint[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

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

          // 現在年度を取得
          const currentYear = new Date().getFullYear();

          // チャンピオンバッジをYearlyArchiveから取得
          const championBadges: Achievement[] = [];

          try {
            const archiveResponse = await fetch(`/api/yearly-archive?playerId=${currentUserId}`);
            if (archiveResponse.ok) {
              const archives = await archiveResponse.json();

              // 年度別アーカイブからバッジを生成（上位3名のみ）
              // また、過去年度の統計データをyearlyStatsMapにマージ
              archives.forEach((archive: any) => {
                const year = parseInt(archive.year, 10);
                const rank = parseInt(archive.annual_rank, 10);
                const badge = archive.champion_badge;
                const finalRating = parseInt(archive.final_rating, 10) || 1200;
                const wins = parseInt(archive.annual_wins, 10) || 0;
                const losses = parseInt(archive.annual_losses, 10) || 0;

                // 過去年度の統計データをyearlyStatsMapにマージ
                // アーカイブされた年度は確定データなので上書き
                yearlyStatsMap[year] = {
                  year,
                  rank,
                  rating: finalRating,
                  highestRating: finalRating, // アーカイブには最高レートがないため最終レートを使用
                  games: wins + losses,
                  wins,
                  losses,
                  badge: rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}位`
                };

                // 上位3名のみチャンピオンバッジを追加
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
                      // バッジ獲得日は年度末（12月31日）に固定（archived_atはアーカイブ処理日のため使用しない）
                      date: `${year}-12-31`
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

              console.log(`[PlayerAchievements] Loaded ${championBadges.length} champion badges and ${archives.length} yearly stats from YearlyArchive`);
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

          // YearlyArchive取得後にyearlyStatsを構築（アーカイブデータを含む）
          // Object.entriesでキー（年度）を基準に明示的にソートしてから配列化
          const entries = Object.entries(yearlyStatsMap).sort((a, b) => Number(b[0]) - Number(a[0]));
          const yearlyStats: YearlyStats[] = entries.map(([, stat]) => stat);

          // 現在年度のランキング順位とバッジを設定（アーカイブされていない場合）
          yearlyStats.forEach(stat => {
            if (stat.year === currentYear && stat.badge === '進行中') {
              stat.rank = currentUser.rank || 0;
              stat.rating = currentUser.current_rating || stat.rating;
              stat.highestRating = currentUser.highest_rating || stat.highestRating;
              stat.badge = currentUser.rank <= 3
                ? (currentUser.rank === 1 ? '🥇' : currentUser.rank === 2 ? '🥈' : '🥉')
                : '進行中';
            }
          });

          // 現在年度の行がまだ無い場合は追加（過去アーカイブのみ存在する場合も対応）
          const hasCurrentYear = yearlyStats.some(stat => stat.year === currentYear);
          if (!hasCurrentYear) {
            yearlyStats.unshift({
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

  // コンポーネントアンマウント時にリクエストをキャンセル
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  // 年間成績詳細を取得する関数
  const loadYearlyDetail = useCallback(async (year: number) => {
    // 前のリクエストをキャンセル
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 新しいAbortControllerを作成
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoadingDetail(true);
    setYearlyTournaments([]);
    setYearlyOpponents([]);
    setYearlyRatingHistory([]);

    try {
      // 試合履歴と大会一覧を並列取得
      const [matchResponse, tournamentsResponse] = await Promise.all([
        fetch(`/api/matches?playerId=${currentUserId}`, { signal: controller.signal }),
        fetch('/api/tournaments', { signal: controller.signal })
      ]);

      // このリクエストがまだアクティブかチェック
      if (abortControllerRef.current !== controller) {
        return;
      }

      if (!matchResponse.ok || !tournamentsResponse.ok) {
        throw new Error('データの取得に失敗しました');
      }

      const matchHistory = await matchResponse.json();
      const tournaments = await tournamentsResponse.json();

      // 大会ID→大会名のマップを作成（t.id を優先、なければ t.tournament_id）
      const tournamentMap = new Map<string, { name: string; date: string }>();
      for (const t of tournaments) {
        const tid = t.id ?? t.tournament_id;
        if (tid) {
          tournamentMap.set(tid, {
            name: t.tournament_name || t.name || '大会',
            date: t.date || t.start_date || ''
          });
        }
      }

      // 指定年度の試合をフィルタリング（JSTベースで年度判定）
      const yearMatches = matchHistory.filter((match: any) => {
        const matchDateStr = match.timestamp || match.match_date || match.created_at;
        if (!matchDateStr) return false;
        // JSTに変換して年度を取得（UTC + 9時間）
        const matchDate = new Date(matchDateStr);
        const jstDate = new Date(matchDate.getTime() + 9 * 60 * 60 * 1000);
        const matchYear = jstDate.getUTCFullYear();
        return matchYear === year && (match.result === 'win' || match.result === 'lose');
      });

      // 大会ごとに集計
      const tournamentStatsMap = new Map<string, TournamentStats>();

      for (const match of yearMatches) {
        // 大会IDがない場合は試合日時から一意キーを生成
        const matchTimestamp = match.timestamp || match.match_date || match.created_at || '';
        const tournamentId = match.tournament_id || `unknown_${matchTimestamp}`;
        const tournamentInfo = tournamentMap.get(match.tournament_id);

        if (!tournamentStatsMap.has(tournamentId)) {
          tournamentStatsMap.set(tournamentId, {
            tournament_id: tournamentId,
            tournament_name: tournamentInfo?.name || (match.tournament_id ? '大会' : '個別試合'),
            date: tournamentInfo?.date || matchTimestamp,
            wins: 0,
            losses: 0,
            matches: []
          });
        }

        const stats = tournamentStatsMap.get(tournamentId)!;
        const isWin = match.result === 'win';

        if (isWin) {
          stats.wins++;
        } else {
          stats.losses++;
        }

        // 対戦相手名を取得（APIはopponentをオブジェクト{id, name}として返す）
        const opponentNameForMatch = typeof match.opponent === 'object' && match.opponent !== null
          ? (match.opponent.name || match.opponent.id || '不明')
          : (match.opponent || match.opponent_name || '不明');

        stats.matches.push({
          opponent_name: opponentNameForMatch,
          result: isWin ? 'win' : 'lose',
          rating_change: parseInt(match.rating_change) || 0
        });
      }

      // 日付順にソート（新しい順）
      const sortedStats = Array.from(tournamentStatsMap.values()).sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      // 対戦相手別成績を計算
      const opponentStatsMap = new Map<string, OpponentStats>();

      for (const match of yearMatches) {
        // 対戦相手名を取得（APIはopponentをオブジェクト{id, name}として返す）
        const opponentName = typeof match.opponent === 'object' && match.opponent !== null
          ? (match.opponent.name || match.opponent.id || '不明')
          : (match.opponent || match.opponent_name || '不明');
        const isWin = match.result === 'win';

        if (!opponentStatsMap.has(opponentName)) {
          opponentStatsMap.set(opponentName, {
            opponent_name: opponentName,
            wins: 0,
            losses: 0,
            total: 0,
            winRate: 0
          });
        }

        const stats = opponentStatsMap.get(opponentName)!;
        stats.total++;
        if (isWin) {
          stats.wins++;
        } else {
          stats.losses++;
        }
        stats.winRate = stats.wins / stats.total;
      }

      // 対戦回数降順でソート
      const sortedOpponentStats = Array.from(opponentStatsMap.values()).sort((a, b) => {
        return b.total - a.total;
      });

      // レート推移を計算（年初1200からスタート）
      const sortedMatchesByDate = yearMatches.sort((a: any, b: any) => {
        const dateA = new Date(a.timestamp || a.match_date || a.created_at).getTime();
        const dateB = new Date(b.timestamp || b.match_date || b.created_at).getTime();
        return dateA - dateB;
      });

      const ratingHistory: RatingDataPoint[] = [];
      let currentRating = 1200;

      // 年初のデータポイントを追加
      ratingHistory.push({
        date: `${year}-01-01`,
        rating: currentRating,
        displayDate: '年初'
      });

      // 各試合後のレートを記録
      for (const match of sortedMatchesByDate) {
        const ratingChange = parseInt(match.rating_change) || 0;
        currentRating += ratingChange;

        const matchDate = new Date(match.timestamp || match.match_date || match.created_at);
        const jstDate = new Date(matchDate.getTime() + 9 * 60 * 60 * 1000);
        const displayDate = `${jstDate.getUTCMonth() + 1}/${jstDate.getUTCDate()}`;

        ratingHistory.push({
          date: matchDate.toISOString(),
          rating: currentRating,
          displayDate
        });
      }

      // このリクエストがまだアクティブかチェック
      if (abortControllerRef.current === controller) {
        setYearlyTournaments(sortedStats);
        setYearlyOpponents(sortedOpponentStats);
        setYearlyRatingHistory(ratingHistory);
      }
    } catch (error) {
      // AbortErrorは無視
      if (error instanceof Error && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to load yearly detail:', error);
    } finally {
      // このリクエストがアクティブな場合のみloadingを解除
      if (abortControllerRef.current === controller) {
        setIsLoadingDetail(false);
      }
    }
  }, [currentUserId]);

  // 年間成績をクリックした時のハンドラー
  const handleYearlyStatsClick = (year: number, games: number) => {
    // 試合数が0の場合は何もしない
    if (games === 0) return;

    setSelectedYear(year);
    setYearlyDetailOpen(true);
    loadYearlyDetail(year);
  };

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
              <div
                key={year.year}
                className={`p-4 bg-muted/30 rounded-lg border border-fantasy-frame/20 transition-all ${
                  year.games > 0 ? 'cursor-pointer hover:bg-muted/50 hover:border-primary/30 active:scale-[0.99]' : ''
                }`}
                onClick={() => handleYearlyStatsClick(year.year, year.games)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{year.year}年度</h3>
                  {/* 試合数0の場合は順位を表示しない */}
                  {year.games === 0 ? (
                    <Badge variant="outline" className="text-sm text-muted-foreground">
                      大会未参加
                    </Badge>
                  ) : year.badge === "進行中" ? (
                    <Badge variant="outline" className="text-sm">
                      {year.badge}
                    </Badge>
                  ) : year.rank <= 3 ? (
                    <Badge variant="secondary" className="bg-gradient-gold text-sm">
                      {year.badge} {year.rank}位
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-sm">
                      {year.rank}位
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="space-y-1">
                    <div className="text-xl font-bold text-primary">{year.games === 0 ? '-' : year.rank}</div>
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
                {/* クリック可能な場合はインジケーターを表示 */}
                {year.games > 0 && (
                  <div className="flex items-center justify-center mt-3 text-muted-foreground text-sm">
                    <span>詳細を見る</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      </div>

      {/* 年間成績詳細ダイアログ */}
      <Dialog open={yearlyDetailOpen} onOpenChange={setYearlyDetailOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {selectedYear}年度 詳細成績
            </DialogTitle>
            <DialogDescription>
              参加大会と各大会での成績
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-muted-foreground">読み込み中...</span>
            </div>
          ) : yearlyTournaments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>この年度の大会データがありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* サマリー */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">参加大会数</div>
                <div className="text-2xl font-bold">{yearlyTournaments.length}大会</div>
              </div>

              {/* 大会一覧 */}
              <div className="space-y-3">
                {yearlyTournaments.map((tournament) => (
                  <div
                    key={tournament.tournament_id}
                    className="p-3 bg-muted/20 rounded-lg border border-fantasy-frame/10"
                  >
                    {/* 大会ヘッダー */}
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium text-sm">{tournament.tournament_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tournament.date ? new Date(tournament.date).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : '日付不明'}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap flex-shrink-0">
                        <span className="text-success font-bold">{tournament.wins}勝</span>
                        <span className="text-muted-foreground mx-1">-</span>
                        <span className="text-destructive font-bold">{tournament.losses}敗</span>
                      </div>
                    </div>

                    {/* 対戦詳細 */}
                    <div className="space-y-1">
                      {tournament.matches.map((match, idx) => (
                        <div
                          key={idx}
                          className={`flex items-center justify-between text-sm px-2 py-1 rounded ${
                            match.result === 'win' ? 'bg-success/10' : 'bg-destructive/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={match.result === 'win' ? 'text-success' : 'text-destructive'}>
                              {match.result === 'win' ? '○' : '●'}
                            </span>
                            <span>vs {match.opponent_name}</span>
                          </div>
                          {match.rating_change !== 0 && (
                            <span className={`text-xs ${
                              match.rating_change > 0 ? 'text-success' : 'text-destructive'
                            }`}>
                              {match.rating_change > 0 ? '+' : ''}{match.rating_change}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* レート推移グラフ */}
              {yearlyRatingHistory.length > 1 && (
                <div className="pt-4 border-t border-fantasy-frame/20">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-sm">レート推移</h4>
                  </div>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={yearlyRatingHistory}
                        margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground) / 0.2)" />
                        <XAxis
                          dataKey="displayDate"
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                        />
                        <YAxis
                          domain={[
                            (dataMin: number) => Math.min(1200, Math.floor((dataMin - 20) / 50) * 50),
                            (dataMax: number) => Math.ceil((dataMax + 20) / 50) * 50
                          ]}
                          ticks={(() => {
                            const min = Math.min(1200, ...yearlyRatingHistory.map(d => d.rating));
                            const max = Math.max(...yearlyRatingHistory.map(d => d.rating));
                            const start = Math.floor((min - 20) / 50) * 50;
                            const end = Math.ceil((max + 20) / 50) * 50;
                            const ticks = [];
                            for (let t = start; t <= end; t += 50) ticks.push(t);
                            if (!ticks.includes(1200)) ticks.push(1200);
                            return ticks.sort((a, b) => a - b);
                          })()}
                          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                          tickLine={false}
                          axisLine={{ stroke: 'hsl(var(--muted-foreground) / 0.3)' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value: number) => [`${value}`, 'レート']}
                          labelFormatter={(label: string) => label}
                        />
                        <Line
                          type="monotone"
                          dataKey="rating"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>初期: 1200</span>
                    <span>最終: {yearlyRatingHistory[yearlyRatingHistory.length - 1]?.rating || 1200}</span>
                  </div>
                </div>
              )}

              {/* 対戦相手別成績 */}
              {yearlyOpponents.length > 0 && (
                <div className="pt-4 border-t border-fantasy-frame/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-primary" />
                    <h4 className="font-medium text-sm">対戦相手別成績</h4>
                  </div>
                  <div className="space-y-2">
                    {yearlyOpponents.map((opponent) => (
                      <div
                        key={opponent.opponent_name}
                        className="flex items-center justify-between p-2 bg-muted/20 rounded-lg text-sm"
                      >
                        <span className="font-medium">{opponent.opponent_name}</span>
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-success">{opponent.wins}勝</span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className="text-destructive">{opponent.losses}敗</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            opponent.winRate >= 0.5 ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'
                          }`}>
                            {Math.round(opponent.winRate * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};