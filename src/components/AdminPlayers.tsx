import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, UserPlus, Search, MoreVertical, Mail, Trophy, Calendar } from 'lucide-react';

interface AdminPlayersProps {
  onBack: () => void;
}

// Mock players data
const mockPlayers = [
  {
    id: 1,
    nickname: "鈴木さん",
    email: "suzuki@example.com",
    currentRating: 1850,
    joinDate: "2024-04-15",
    totalGames: 52,
    winRate: 73.1,
    status: "active",
    badges: ["★", "★", "☆", "♠️", "➕"],
    lastSeen: "2024-07-25 20:30"
  },
  {
    id: 2,
    nickname: "佐藤さん",
    email: "sato@example.com",
    currentRating: 1685,
    joinDate: "2024-04-20",
    totalGames: 48,
    winRate: 64.6,
    status: "active",
    badges: ["★", "♠️"],
    lastSeen: "2024-07-25 20:25"
  },
  {
    id: 3,
    nickname: "田中さん",
    email: "tanaka@example.com",
    currentRating: 1620,
    joinDate: "2024-05-01",
    totalGames: 35,
    winRate: 60.0,
    status: "active",
    badges: ["♠️", "➕"],
    lastSeen: "2024-07-25 19:45"
  },
  {
    id: 4,
    nickname: "新規ユーザー",
    email: "newuser@example.com",
    currentRating: 1500,
    joinDate: "2024-07-25",
    totalGames: 0,
    winRate: 0,
    status: "pending",
    badges: [],
    lastSeen: "申請中"
  }
];

export const AdminPlayers = ({ onBack }: AdminPlayersProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'pending'>('all');

  const filteredPlayers = mockPlayers.filter(player => {
    const matchesSearch = player.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || player.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activePlayersCount = mockPlayers.filter(p => p.status === 'active').length;
  const pendingPlayersCount = mockPlayers.filter(p => p.status === 'pending').length;

  const handleApprovePlayer = (playerId: number) => {
    // TODO: Implement player approval
    console.log('Approving player:', playerId);
  };

  const handleRejectPlayer = (playerId: number) => {
    // TODO: Implement player rejection
    console.log('Rejecting player:', playerId);
  };

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">プレイヤー管理</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{activePlayersCount}</div>
              <div className="text-sm text-muted-foreground">アクティブプレイヤー</div>
            </CardContent>
          </Card>
          
          <Card className="border-fantasy-frame shadow-soft animate-fade-in" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{pendingPlayersCount}</div>
              <div className="text-sm text-muted-foreground">承認待ち</div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-fade-in" style={{ animationDelay: '200ms' }}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{mockPlayers.length}</div>
              <div className="text-sm text-muted-foreground">総プレイヤー数</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="プレイヤー名またはメールアドレスで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('all')}
                >
                  全て
                </Button>
                <Button
                  variant={filterStatus === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('active')}
                >
                  アクティブ
                </Button>
                <Button
                  variant={filterStatus === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterStatus('pending')}
                >
                  承認待ち
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players List */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>プレイヤー一覧</span>
              <Button variant="fantasy" size="sm">
                <UserPlus className="h-4 w-4" />
                新規追加
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border transition-all ${
                  player.status === 'pending' 
                    ? 'bg-warning/10 border-warning/20' 
                    : 'bg-muted/20 border-muted/40 hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{player.nickname}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {player.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {player.status === 'pending' ? (
                      <Badge variant="outline" className="text-warning border-warning">
                        承認待ち
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-success">
                        アクティブ
                      </Badge>
                    )}
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Player Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div className="text-center">
                    <div className="font-semibold text-primary">{player.currentRating}</div>
                    <div className="text-muted-foreground">レーティング</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{player.totalGames}</div>
                    <div className="text-muted-foreground">総対戦数</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-success">{player.winRate}%</div>
                    <div className="text-muted-foreground">勝率</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground flex items-center justify-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {player.joinDate}
                    </div>
                    <div className="text-muted-foreground">参加日</div>
                  </div>
                </div>

                {/* Badges */}
                {player.badges.length > 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-muted-foreground">バッジ:</span>
                    {player.badges.map((badge, badgeIndex) => (
                      <Badge 
                        key={badgeIndex} 
                        variant={badge.match(/[★☆⭐]/) ? "default" : "outline"}
                        className={`text-xs ${badge.match(/[★☆⭐]/) ? 'bg-gradient-gold' : ''}`}
                      >
                        {badge}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Last Seen */}
                <div className="text-xs text-muted-foreground mb-3">
                  最終ログイン: {player.lastSeen}
                </div>

                {/* Actions */}
                {player.status === 'pending' ? (
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-success hover:bg-success/90"
                      onClick={() => handleApprovePlayer(player.id)}
                    >
                      承認
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleRejectPlayer(player.id)}
                    >
                      却下
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">詳細</Button>
                    <Button variant="outline" size="sm">編集</Button>
                    <Button variant="outline" size="sm">履歴</Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};