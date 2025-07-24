import { useState } from 'react';
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
  LogOut
} from 'lucide-react';

interface AdminDashboardProps {
  onClose: () => void;
}

// Mock admin data
const mockAdminData = {
  tournaments: {
    active: 1,
    upcoming: 2,
    total: 7
  },
  players: {
    registered: 24,
    active: 18,
    newThisMonth: 3
  },
  pendingApprovals: 5,
  recentActivity: [
    { type: 'game', description: '鈴木さん vs 佐藤さん の結果を承認', time: '5分前' },
    { type: 'tournament', description: '第8回BUNGU SQUAD大会を作成', time: '2時間前' },
    { type: 'player', description: '新規プレイヤー「田中さん」を承認', time: '1日前' }
  ]
};

export const AdminDashboard = ({ onClose }: AdminDashboardProps) => {
  const [currentAdminPage, setCurrentAdminPage] = useState('dashboard');

  const adminMenuItems = [
    {
      icon: Trophy,
      title: "大会管理",
      description: "大会作成・組み合わせ設定",
      page: "tournaments",
      count: mockAdminData.tournaments.active
    },
    {
      icon: Users,
      title: "プレイヤー管理",
      description: "登録・承認・統計",
      page: "players",
      count: mockAdminData.players.registered
    },
    {
      icon: FileText,
      title: "対戦結果承認",
      description: "試合結果の確認・承認",
      page: "approvals",
      count: mockAdminData.pendingApprovals
    },
    {
      icon: BarChart3,
      title: "統計・分析",
      description: "全体統計・レポート",
      page: "analytics"
    },
    {
      icon: SettingsIcon,
      title: "システム設定",
      description: "管理者・システム設定",
      page: "settings"
    }
  ];

  if (currentAdminPage === 'tournaments') {
    return <AdminTournaments onBack={() => setCurrentAdminPage('dashboard')} />;
  }

  // TODO: Add other admin pages

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
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{mockAdminData.tournaments.active}</div>
              <div className="text-sm text-muted-foreground">開催中の大会</div>
            </CardContent>
          </Card>
          
          <Card className="border-fantasy-frame shadow-soft animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{mockAdminData.players.active}</div>
              <div className="text-sm text-muted-foreground">アクティブプレイヤー</div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{mockAdminData.pendingApprovals}</div>
              <div className="text-sm text-muted-foreground">承認待ち</div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-fade-in" style={{ animationDelay: '300ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-info">{mockAdminData.tournaments.total}</div>
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
            {mockAdminData.recentActivity.map((activity, index) => (
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
          <Button variant="fantasy" size="lg" className="h-16" onClick={() => setCurrentAdminPage('tournaments')}>
            <Plus className="h-5 w-5 mr-2" />
            新しい大会を作成
          </Button>
          
          <Button variant="tournament" size="lg" className="h-16" onClick={() => setCurrentAdminPage('approvals')}>
            <FileText className="h-5 w-5 mr-2" />
            承認待ちを確認
          </Button>
        </div>
      </main>
    </div>
  );
};

// Admin Tournaments Component (placeholder)
const AdminTournaments = ({ onBack }: { onBack: () => void }) => {
  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">大会管理</h1>
            </div>
          </div>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-6">
        <Card className="border-fantasy-frame shadow-soft">
          <CardContent className="p-8 text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">大会管理機能</h2>
            <p className="text-muted-foreground">この機能は開発中です</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};