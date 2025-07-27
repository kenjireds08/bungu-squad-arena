import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Users, UserPlus, Search, Mail, Trophy, Calendar, Eye } from 'lucide-react';

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
    badges: ["🥇", "🥇", "🥈", "♠️", "➕"],
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
    badges: ["🥇", "♠️"],
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
  const [selectedPlayer, setSelectedPlayer] = useState<typeof mockPlayers[0] | null>(null);

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

        {/* Players List - Compact Table */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>プレイヤー一覧 ({filteredPlayers.length}人)</span>
              <Button variant="fantasy" size="sm">
                <UserPlus className="h-4 w-4" />
                新規追加
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-fantasy-frame">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">プレイヤー名</TableHead>
                    <TableHead className="text-center w-[120px]">レーティング</TableHead>
                    <TableHead className="text-center w-[100px]">ステータス</TableHead>
                    <TableHead className="text-center w-[100px]">バッジ</TableHead>
                    <TableHead className="text-center w-[80px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="hover:bg-muted/30">
                      <TableCell>
                        <button
                          onClick={() => setSelectedPlayer(player)}
                          className="text-left hover:underline focus:outline-none"
                        >
                          <div className="font-medium text-foreground">{player.nickname}</div>
                          <div className="text-sm text-muted-foreground">{player.email}</div>
                        </button>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-semibold text-primary">{player.currentRating}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        {player.status === 'pending' ? (
                          <Badge variant="outline" className="text-warning border-warning">
                            承認待ち
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-success">
                            アクティブ
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          {player.badges.slice(0, 3).map((badge, badgeIndex) => (
                            <span key={badgeIndex} className="text-sm">
                              {badge}
                            </span>
                          ))}
                          {player.badges.length > 3 && (
                            <span className="text-xs text-muted-foreground">+{player.badges.length - 3}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-1">
                          {player.status === 'pending' ? (
                            <>
                              <Button 
                                variant="default" 
                                size="sm"
                                className="bg-success hover:bg-success/90 text-xs px-2 py-1 h-7"
                                onClick={() => handleApprovePlayer(player.id)}
                              >
                                承認
                              </Button>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                className="text-xs px-2 py-1 h-7"
                                onClick={() => handleRejectPlayer(player.id)}
                              >
                                却下
                              </Button>
                            </>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setSelectedPlayer(player)}
                              className="h-7 w-7 p-0"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Player Detail Modal */}
        <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {selectedPlayer?.nickname} の詳細情報
              </DialogTitle>
            </DialogHeader>
            
            {selectedPlayer && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">プレイヤー名</label>
                    <p className="text-lg font-semibold">{selectedPlayer.nickname}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">メールアドレス</label>
                    <p className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {selectedPlayer.email}
                    </p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{selectedPlayer.currentRating}</div>
                    <div className="text-sm text-muted-foreground">レーティング</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-foreground">{selectedPlayer.totalGames}</div>
                    <div className="text-sm text-muted-foreground">総対戦数</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-2xl font-bold text-success">{selectedPlayer.winRate}%</div>
                    <div className="text-sm text-muted-foreground">勝率</div>
                  </Card>
                  <Card className="p-3 text-center">
                    <div className="text-sm font-bold text-foreground flex items-center justify-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {selectedPlayer.joinDate}
                    </div>
                    <div className="text-sm text-muted-foreground">参加日</div>
                  </Card>
                </div>

                {/* Badges */}
                {selectedPlayer.badges.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">獲得バッジ</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedPlayer.badges.map((badge, badgeIndex) => (
                        <Badge 
                          key={badgeIndex} 
                          variant={badge.match(/[🥇🥈🥉]/) ? "default" : "outline"}
                          className={`${badge.match(/[🥇🥈🥉]/) ? 'bg-gradient-gold' : ''}`}
                        >
                          {badge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status and Actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">最終ログイン</label>
                    <p className="text-sm">{selectedPlayer.lastSeen}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedPlayer.status === 'pending' ? (
                      <>
                        <Button 
                          variant="default" 
                          className="bg-success hover:bg-success/90"
                          onClick={() => handleApprovePlayer(selectedPlayer.id)}
                        >
                          承認
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => handleRejectPlayer(selectedPlayer.id)}
                        >
                          却下
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline">編集</Button>
                        <Button variant="outline">対戦履歴</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};