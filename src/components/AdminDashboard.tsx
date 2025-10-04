import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  TrendingUp
} from 'lucide-react';
import { AdminTournaments } from './AdminTournaments';
import { AdminApprovals } from './AdminApprovals';
import { AdminPlayers } from './AdminPlayers';
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
  const [currentAdminPage, setCurrentAdminPage] = useState('dashboard');
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
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

      // タイムスタンプでソート（新しい順）して最新5件を取得
      const recentActivity = activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(({ type, description, time }) => ({ type, description, time }));

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

  if (currentAdminPage === 'tournaments') {
    return <AdminTournaments onBack={() => setCurrentAdminPage('dashboard')} selectedTournamentId={selectedTournamentId} />;
  }

  if (currentAdminPage === 'tournament-progress') {
    return <AdminTournaments onBack={() => setCurrentAdminPage('dashboard')} selectedTournamentId={selectedTournamentId} initialView="management-progress" />;
  }

  if (currentAdminPage === 'create-tournament') {
    return <AdminTournaments onBack={() => setCurrentAdminPage('dashboard')} initialView="create" />;
  }

  if (currentAdminPage === 'players') {
    return <AdminPlayers onBack={() => setCurrentAdminPage('dashboard')} />;
  }


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
          <Card 
            className="border-fantasy-frame shadow-soft animate-fade-in cursor-pointer hover:shadow-glow transition-all duration-300"
            onClick={() => setCurrentAdminPage('tournaments')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{adminData.tournaments.active}</div>
              <div className="text-sm text-muted-foreground">開催中の大会</div>
            </CardContent>
          </Card>
          
          <Card 
            className="border-fantasy-frame shadow-soft animate-fade-in cursor-pointer hover:shadow-glow transition-all duration-300" 
            style={{ animationDelay: '100ms' }}
            onClick={() => setCurrentAdminPage('players')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{adminData.players.active}</div>
              <div className="text-sm text-muted-foreground">アクティブプレイヤー</div>
            </CardContent>
          </Card>

          <Card 
            className="border-fantasy-frame shadow-soft animate-fade-in cursor-pointer hover:shadow-glow transition-all duration-300" 
            style={{ animationDelay: '200ms' }}
            onClick={() => {
              // 今日の大会を取得して直接進行状況タブへ
              const today = new Date().toLocaleDateString('sv-SE');
              const todaysTournament = tournaments?.find(t => t.date === today);
              if (todaysTournament) {
                setSelectedTournamentId(todaysTournament.id);
              }
              setCurrentAdminPage('tournament-progress');
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">⚡</div>
              <div className="text-sm text-muted-foreground">試合開始</div>
            </CardContent>
          </Card>

          <Card 
            className="border-fantasy-frame shadow-soft animate-fade-in cursor-pointer hover:shadow-glow transition-all duration-300" 
            style={{ animationDelay: '300ms' }}
            onClick={() => setCurrentAdminPage('tournaments')}
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
                onClick={() => setCurrentAdminPage(item.page)}
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
            {adminData.recentActivity.map((activity, index) => (
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
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button variant="fantasy" size="lg" className="h-16" onClick={() => setCurrentAdminPage('create-tournament')}>
            <Plus className="h-5 w-5 mr-2" />
            新しい大会を作成
          </Button>
          
          <Button variant="tournament" size="lg" className="h-16" onClick={() => {
            // 今日の大会を取得
            const today = new Date().toLocaleDateString('sv-SE');
            const todaysTournament = tournaments?.find(t => t.date === today);
            if (todaysTournament) {
              setSelectedTournamentId(todaysTournament.id);
            }
            setCurrentAdminPage('tournaments');
          }}>
            <TrendingUp className="h-5 w-5 mr-2" />
            試合経過を確認
          </Button>
        </div>
      </main>
    </div>
  );
};

// Remove the placeholder AdminTournaments component since we now have the real one