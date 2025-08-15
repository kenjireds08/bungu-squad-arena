import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Users, UserPlus, Search, Mail, Trophy, Calendar, Eye, Loader2 } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';

interface AdminPlayersProps {
  onBack: () => void;
}

export const AdminPlayers = ({ onBack }: AdminPlayersProps) => {
  const { data: players, isLoading, error, refetch } = useRankings();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPlayers = players?.filter(player => {
    const matchesSearch = player.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' && player.tournament_active);
    return matchesSearch && matchesStatus;
  }) || [];

  const activePlayersCount = players?.filter(p => p.tournament_active).length || 0;
  const totalPlayersCount = players?.length || 0;

  const isRecentTournamentParticipant = (player: any) => {
    if (!player.tournament_active) return false;
    
    // 24時間以内の大会参加かを判定
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // 現在日付の大会があるかをチェック
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // 簡易判定: 今日または昨日が大会日なら「最近の参加者」とみなす
    // より正確にはTournamentDailyArchiveから最新のentry_timestampを取得すべき
    // 現在は tournament_active=TRUE なら最近の参加とみなす（手動リセットがあるため）
    
    // 代替案: last_activity_date が24時間以内かで判定
    if (player.last_activity_date) {
      const lastActivity = new Date(player.last_activity_date);
      return lastActivity > twentyFourHoursAgo;
    }
    
    // より正確な実装のためには、QRスキャン時に tournament_entry_timestamp を記録する必要がある
    // 現状では手動リセットまで「参加中」として表示
    return true;
  };

  const getStatusBadge = (player: any) => {
    // tournament_activeの状態をチェック
    if (player.tournament_active === true) {
      return <Badge className="bg-green-500 text-white">大会参加中</Badge>;
    }
    
    // is_activeフィールドに基づいてシンプルに表示
    if (player.is_active === false) {
      return <Badge variant="outline">非アクティブ</Badge>;
    }
    
    // デフォルトは通常状態
    return <Badge className="bg-blue-500 text-white">通常</Badge>;
  };

  const calculateWinRate = (wins: number, losses: number) => {
    const total = wins + losses;
    if (total === 0) return 0;
    return ((wins / total) * 100).toFixed(1);
  };

  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (!confirm(`${playerName}を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/players?id=${playerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete player');
      }

      // Success - refresh data and close dialog
      await refetch();
      setSelectedPlayer(null);
      
      // Show success message (optional)
      console.log(`Player ${playerName} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete player:', error);
      alert(`プレイヤーの削除に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '') return '未設定';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '未設定';
    return date.toLocaleDateString('ja-JP');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">プレイヤーデータを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">データの読み込みに失敗しました</p>
          <Button onClick={onBack}>戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="border-fantasy-frame shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">アクティブプレイヤー</p>
                  <p className="text-2xl font-bold text-primary">{activePlayersCount}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">総プレイヤー数</p>
                  <p className="text-2xl font-bold text-foreground">{totalPlayersCount}</p>
                </div>
                <Trophy className="h-8 w-8 text-muted-foreground opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Actions */}
        <Card className="border-warning shadow-soft">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-warning">管理者操作</h3>
                <p className="text-sm text-muted-foreground">大会エントリー状態をリセット</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (confirm('全プレイヤーの大会エントリー状態をリセットしますか？')) {
                    try {
                      const response = await fetch('/api/admin?action=reset-tournament-active', {
                        method: 'POST'
                      });
                      
                      console.log('Response status:', response.status);
                      console.log('Response headers:', response.headers);
                      
                      if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                      }
                      
                      const result = await response.json();
                      console.log('API result:', result);
                      
                      if (result.success) {
                        const message = result.archivedCount > 0 
                          ? `${result.updatedCount}名のプレイヤーをリセットし、${result.archivedCount}名の大会参加記録をアーカイブしました`
                          : `${result.updatedCount}名のプレイヤーをリセットしました`;
                        alert(message);
                        window.location.reload();
                      } else {
                        alert(`リセットに失敗しました: ${result.error || result.message}`);
                      }
                    } catch (error) {
                      console.error('Reset error:', error);
                      alert(`リセットに失敗しました: ${error.message}`);
                    }
                  }
                }}
                className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
              >
                エントリー状態リセット
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search and Filter */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="プレイヤーを検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players Table */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>プレイヤー一覧 ({filteredPlayers.length}人)</span>
              <Button variant="heroic" size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                新規追加
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>プレイヤー名</TableHead>
                    <TableHead className="text-center">レーティング</TableHead>
                    <TableHead className="text-center hidden sm:table-cell">ステータス</TableHead>
                    <TableHead className="text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlayers.map((player) => (
                    <TableRow key={player.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{player.nickname}</TableCell>
                      <TableCell className="text-center font-mono text-sm">{player.current_rating}</TableCell>
                      <TableCell className="text-center hidden sm:table-cell">
                        {getStatusBadge(player)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPlayer(player)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Player Detail Dialog */}
        <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">プレイヤー詳細</DialogTitle>
            </DialogHeader>
            {selectedPlayer && (
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{selectedPlayer.nickname}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {selectedPlayer.email}
                      </p>
                    </div>
                    {getStatusBadge(selectedPlayer)}
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">レーティング</p>
                      <p className="text-2xl font-bold text-primary">{selectedPlayer.current_rating}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">総対戦数</p>
                      <p className="text-2xl font-bold">{selectedPlayer.total_wins + selectedPlayer.total_losses}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">勝率</p>
                      <p className="text-2xl font-bold text-success">
                        {calculateWinRate(selectedPlayer.total_wins, selectedPlayer.total_losses)}%
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">登録日</p>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(selectedPlayer.registration_date)}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">バッジ</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedPlayer.champion_badges?.split(',').filter(Boolean).map((badge, index) => (
                        <span key={index} className="text-2xl" title={
                          badge.trim().match(/[🥇🥈🥉]/) ? "チャンピオンバッジ" : "ルール習得バッジ"
                        }>
                          {badge.trim()}
                        </span>
                      )) || <span className="text-sm text-muted-foreground">なし</span>}
                    </div>
                  </div>

                  {/* Last Login */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">最終ログイン</p>
                    <p className="text-sm">
                      {selectedPlayer.last_login && selectedPlayer.last_login !== '' 
                        ? (() => {
                            const date = new Date(selectedPlayer.last_login);
                            return isNaN(date.getTime()) ? '未ログイン' : date.toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          })()
                        : '未ログイン'}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-center pt-4">
                    <Button 
                      variant="outline" 
                      className="w-32 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeletePlayer(selectedPlayer.id, selectedPlayer.nickname)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? '削除中...' : '削除'}
                    </Button>
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