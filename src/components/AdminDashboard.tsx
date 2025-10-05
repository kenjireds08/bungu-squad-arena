import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ArrowLeft,
  Shield,
  Users,
  Plus,
  Settings as SettingsIcon,
  Trophy,
  Calendar,
  BarChart3,
  FileText,
  LogOut,
  Loader2,
  Database,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  QrCode
} from 'lucide-react';
import { AdminApprovals } from './AdminApprovals';
import { TournamentProgress } from './TournamentProgress';
import { DataExport } from './DataExport';
import { useRankings, useTournaments, useVersionPolling } from '@/hooks/useApi';

interface AdminDashboardProps {
  onClose: () => void;
}

interface AdminData {
  tournaments: {
    active: number;
    upcoming: number;
    total: number;
  };
  players: {
    registered: number;
    active: number;
    newThisMonth: number;
  };
  pendingApprovals: number;
  recentActivity: Array<{
    type: string;
    description: string;
    time: string;
  }>;
}

// 相対時間のフォーマット関数
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '昨日';
  if (diffDays < 7) return `${diffDays}日前`;

  // 7日以上前は日付表示
  return date.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  });
};

export const AdminDashboard = ({ onClose }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [currentAdminPage, setCurrentAdminPage] = useState('dashboard');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showTournamentSelectModal, setShowTournamentSelectModal] = useState(false);
  const { data: rankings, isLoading: rankingsLoading } = useRankings();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  
  // Disable polling in admin dashboard to improve performance
  // useVersionPolling('current'); // Commented out to reduce API calls

  // Directly calculate admin data without additional state
  const isLoading = rankingsLoading || tournamentsLoading;
  
  const adminData = useMemo<AdminData | null>(() => {
    // Skip if still loading or data not available
    if (!rankings || !tournaments) {
      return null;
    }

    try {
      // Calculate active players (tournament_active = true)
      const activePlayers = rankings.filter(player => player.tournament_active === true).length;

      // Calculate players registered this month
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      const newThisMonth = rankings.filter(player => {
        if (!player.created_at) return false;
        const createdDate = new Date(player.created_at);
        return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear;
      }).length;

      // Calculate tournament stats using date-based logic
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      const activeTournaments = tournaments.filter(t => {
        const tournamentDate = new Date(t.date).toISOString().split('T')[0];
        // 今日の大会、またはstatusが'active'の大会を開催中とする
        return tournamentDate === today || t.status === 'active';
      }).length;

      const upcomingTournaments = tournaments.filter(t => {
        const tournamentDate = new Date(t.date).toISOString().split('T')[0];
        // 未来の大会を予定とする
        return tournamentDate > today && t.status !== 'completed' && t.status !== 'ended';
      }).length;

      // Generate recent activity (最新5件)
      const activities: Array<{ type: string; description: string; time: string; timestamp: Date }> = [];

      // 大会作成アクティビティ（created_atまたはdateを使用）
      tournaments.forEach(tournament => {
        const tournamentName = tournament.tournament_name || tournament.name || '無名の大会';

        if (tournament.created_at) {
          // created_atが存在する場合はそれを使用
          const createdDate = new Date(tournament.created_at);
          if (!isNaN(createdDate.getTime())) {
            activities.push({
              type: 'tournament',
              description: `『${tournamentName}』を作成しました`,
              time: formatRelativeTime(createdDate),
              timestamp: createdDate
            });
          }
        } else if (tournament.date) {
          // created_atがない場合は、大会日の前日を作成日と仮定
          const createdDate = new Date(tournament.date);
          createdDate.setDate(createdDate.getDate() - 1);
          createdDate.setHours(12, 0, 0, 0);

          if (!isNaN(createdDate.getTime())) {
            activities.push({
              type: 'tournament',
              description: `『${tournamentName}』を作成しました`,
              time: formatRelativeTime(createdDate),
              timestamp: createdDate
            });
          }
        }
      });

      // 大会開始アクティビティ（rawStatusで判定）
      tournaments.forEach(tournament => {
        const tournamentName = tournament.tournament_name || tournament.name || '無名の大会';
        const startTime = tournament.start_time || tournament.time;

        // rawStatusが存在する場合はそれを使用、なければstatusで判定
        const tournamentStatus = (tournament as any).rawStatus || tournament.status;

        if (tournamentStatus === 'active' || tournamentStatus === 'ended' || tournamentStatus === 'completed') {
          const tournamentDate = new Date(tournament.date);

          // 開始時刻をstart_timeから取得、なければ10:00と仮定
          if (startTime && startTime.includes(':')) {
            const [hours, minutes] = startTime.split(':').map(Number);
            tournamentDate.setHours(hours, minutes, 0, 0);
          } else {
            tournamentDate.setHours(10, 0, 0, 0);
          }

          if (!isNaN(tournamentDate.getTime())) {
            activities.push({
              type: 'tournament',
              description: `『${tournamentName}』が開始されました`,
              time: formatRelativeTime(tournamentDate),
              timestamp: tournamentDate
            });
          }
        }
      });

      // 大会終了アクティビティ（rawStatusで判定）
      tournaments.forEach(tournament => {
        const tournamentName = tournament.tournament_name || tournament.name || '無名の大会';

        // rawStatusが存在する場合はそれを使用、なければstatusで判定
        const tournamentStatus = (tournament as any).rawStatus || tournament.status;

        if (tournamentStatus === 'ended' || tournamentStatus === 'completed') {
          // 大会日の終了時刻を仮定（17:00）
          const tournamentEndDate = new Date(tournament.date);
          tournamentEndDate.setHours(17, 0, 0, 0);

          if (!isNaN(tournamentEndDate.getTime())) {
            activities.push({
              type: 'tournament',
              description: `『${tournamentName}』が終了しました`,
              time: formatRelativeTime(tournamentEndDate),
              timestamp: tournamentEndDate
            });
          }
        }
      });

      // 新規プレイヤー登録アクティビティ
      rankings.forEach(player => {
        if (player.created_at) {
          const createdDate = new Date(player.created_at);
          if (!isNaN(createdDate.getTime())) {
            activities.push({
              type: 'player',
              description: `新規プレイヤー『${player.nickname}』が登録されました`,
              time: formatRelativeTime(createdDate),
              timestamp: createdDate
            });
          }
        }
      });

      // タイムスタンプでソート（新しい順）してすべて保持
      const recentActivity = activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .map(({ type, description, time }) => ({ type, description, time }));

      // 今日の大会をフィルタリング
      const todayTournaments = tournaments.filter(t => {
        const tournamentDate = new Date(t.date).toISOString().split('T')[0];
        return tournamentDate === today;
      });

      const data: AdminData = {
        tournaments: {
          active: activeTournaments,
          upcoming: upcomingTournaments,
          total: tournaments.length
        },
        players: {
          registered: rankings.length,
          active: activePlayers,
          newThisMonth: newThisMonth
        },
        pendingApprovals: 0, // TODO: Get from match results API
        recentActivity: recentActivity.length > 0 ? recentActivity : [
          { type: 'system', description: 'システムが稼働中です', time: '現在' }
        ]
      };

      return data;
    } catch (error) {
      console.error('Failed to calculate admin data:', error);
      return null;
    }
  }, [rankings, tournaments]);

  // 今日の大会を取得
  const todayTournaments = useMemo(() => {
    if (!tournaments) return [];
    const today = new Date().toISOString().split('T')[0];
    return tournaments.filter(t => {
      const tournamentDate = new Date(t.date).toISOString().split('T')[0];
      return tournamentDate === today;
    });
  }, [tournaments]);

  // 参加者カードクリック時の処理
  const handleParticipantsCardClick = () => {
    // プレイヤー管理画面へ遷移
    navigate('/admin/players');
  };

  if (isLoading || !adminData) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">管理データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const adminMenuItems = [
    {
      icon: Trophy,
      title: "大会管理",
      description: "大会作成・運営・進行管理",
      page: "tournaments",
      count: adminData.tournaments.active
    },
    {
      icon: Users,
      title: "プレイヤー管理",
      description: "登録・承認・統計",
      page: "players",
      count: adminData.players.registered
    },
    {
      icon: FileText,
      title: "データ出力",
      description: "CSV・PDFレポート生成",
      page: "data-export"
    }
  ];

  // Tournament routes are now handled by App.tsx router (/admin/tournaments)
  // Data export still uses state-based routing
  if (currentAdminPage === 'data-export') {
    return <DataExport onClose={() => setCurrentAdminPage('dashboard')} />;
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
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">管理者ダッシュボード</h1>
              </div>
            </div>
            <Badge variant="secondary" className="bg-gradient-gold">
              管理者モード
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. 開催中の大会 */}
          <Card
            className="border-fantasy-frame shadow-soft animate-fade-in cursor-pointer hover:shadow-glow transition-all duration-300"
            onClick={() => navigate('/admin/tournaments')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{adminData.tournaments.active}</div>
              <div className="text-sm text-muted-foreground">開催中の大会</div>
            </CardContent>
          </Card>

          {/* 2. 参加者 → QRコード表示 */}
          <Card
            className={`border-fantasy-frame shadow-soft animate-fade-in transition-all duration-300 ${
              todayTournaments.length > 0
                ? 'cursor-pointer hover:shadow-glow'
                : 'opacity-50 cursor-not-allowed'
            }`}
            style={{ animationDelay: '100ms' }}
            onClick={handleParticipantsCardClick}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{adminData.players.active}</div>
              <div className="text-sm text-muted-foreground">参加者</div>
              {todayTournaments.length === 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  (本日の大会なし)
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. 完了試合 → 試合経過 */}
          <Card
            className="border-fantasy-frame shadow-soft animate-fade-in cursor-pointer hover:shadow-glow transition-all duration-300"
            style={{ animationDelay: '200ms' }}
            onClick={() => navigate('/admin/tournaments')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">-/-</div>
              <div className="text-sm text-muted-foreground">完了試合</div>
            </CardContent>
          </Card>

          {/* 4. 総大会数 → クリック不可 */}
          <Card
            className="border-fantasy-frame shadow-soft animate-fade-in opacity-70"
            style={{ animationDelay: '300ms' }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-info">{adminData.tournaments.total}</div>
              <div className="text-sm text-muted-foreground">総大会数</div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Menu */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5 text-primary" />
              管理機能
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminMenuItems.map((item, index) => (
              <Button
                key={item.page}
                variant="ghost"
                className="w-full h-auto p-4 justify-start hover:bg-accent/50 animate-slide-in-right"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => {
                  if (item.page === 'tournaments') {
                    navigate('/admin/tournaments');
                  } else if (item.page === 'players') {
                    navigate('/admin/players');
                  } else {
                    setCurrentAdminPage(item.page);
                  }
                }}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  {item.count !== undefined && (
                    <Badge variant={item.count > 0 ? "default" : "outline"} className="ml-2">
                      {item.count}
                    </Badge>
                  )}
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              最近のアクティビティ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {adminData.recentActivity.slice(0, showAllActivities ? adminData.recentActivity.length : 5).map((activity, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-fantasy-frame/10"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'game' ? 'bg-success/20' :
                  activity.type === 'tournament' ? 'bg-primary/20' :
                  'bg-info/20'
                }`}>
                  {activity.type === 'game' ? <Trophy className="h-4 w-4 text-success" /> :
                   activity.type === 'tournament' ? <Calendar className="h-4 w-4 text-primary" /> :
                   <Users className="h-4 w-4 text-info" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm text-foreground">{activity.description}</div>
                  <div className="text-xs text-muted-foreground">{activity.time}</div>
                </div>
              </div>
            ))}

            {/* Show more/less button */}
            {adminData.recentActivity.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAllActivities(!showAllActivities)}
              >
                {showAllActivities ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    閉じる
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    もっと見る ({adminData.recentActivity.length - 5}件)
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="fantasy" size="lg" className="h-16" onClick={() => navigate('/admin/tournaments')}>
            <Plus className="h-5 w-5 mr-2" />
            新しい大会を作成
          </Button>

          <Button variant="tournament" size="lg" className="h-16" onClick={() => navigate('/admin/tournaments')}>
            <TrendingUp className="h-5 w-5 mr-2" />
            試合経過を確認
          </Button>
        </div>
      </main>

      {/* 複数大会選択モーダル */}
      <Dialog open={showTournamentSelectModal} onOpenChange={setShowTournamentSelectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>大会を選択してください</DialogTitle>
            <DialogDescription>
              QRコードを表示する大会を選択してください
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {todayTournaments.map((tournament) => (
              <Button
                key={tournament.id}
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => {
                  navigate(`/admin/qr/${tournament.id}`);
                  setShowTournamentSelectModal(false);
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  <QrCode className="h-5 w-5 text-primary" />
                  <div className="text-left flex-1">
                    <div className="font-medium">{tournament.tournament_name || tournament.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {tournament.start_time || tournament.time}〜
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Remove the placeholder AdminTournaments component since we now have the real one
