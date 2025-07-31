import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  ArrowLeft, Edit, Trash2, Plus, Save, Users, Spade, Plus as PlusIcon, 
  AlertCircle, RefreshCw, Trophy, Clock, Play, CheckCircle, Bell, 
  Edit2, Timer, Shuffle, Settings
} from 'lucide-react';
import { useRankings } from '@/hooks/useApi';
import { toast } from '@/components/ui/use-toast';
import { TournamentMatchmaking } from './TournamentMatchmaking';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface TournamentManagementViewProps {
  onClose: () => void;
  tournamentId: string;
  tournamentName: string;
}

interface Match {
  match_id: string;
  tournament_id: string;
  match_number: string;
  player1_id: string;
  player1_name: string;
  player2_id: string;
  player2_name: string;
  game_type: 'trump' | 'cardplus';
  status: 'scheduled' | 'in_progress' | 'completed' | 'approved';
  winner_id: string;
  result_details: string;
  created_at: string;
  completed_at: string;
  approved_at: string;
}

export const TournamentManagementView = ({ onClose, tournamentId, tournamentName }: TournamentManagementViewProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMatchmaking, setShowMatchmaking] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSaving, setIsSaving] = useState(false);
  const { data: players } = useRankings();
  
  const activePlayers = players?.filter(p => p.tournament_active) || [];

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Fetch matches
  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      }
    } catch (error) {
      console.error('Failed to fetch matches:', error);
      toast({
        title: 'エラー',
        description: '組み合わせの読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  // Match statistics
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');
  const inProgressMatches = matches.filter(m => m.status === 'in_progress');
  const pendingMatches = matches.filter(m => m.status === 'completed');
  const completedMatches = matches.filter(m => m.status === 'approved');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-muted text-muted-foreground';
      case 'in_progress':
        return 'bg-info text-info-foreground';
      case 'completed':
        return 'bg-warning text-warning-foreground';
      case 'approved':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '待機中';
      case 'in_progress':
        return '対戦中';
      case 'completed':
        return '報告待ち';
      case 'approved':
        return '完了';
      default:
        return '不明';
    }
  };

  const canEditMatch = (match: Match) => {
    return match.status === 'scheduled';
  };

  const canDeleteMatch = (match: Match) => {
    return match.status === 'scheduled';
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;

    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/matches?matchId=${editingMatch.match_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player1_id: editingMatch.player1_id,
          player2_id: editingMatch.player2_id,
          game_type: editingMatch.game_type,
        }),
      });

      if (response.ok) {
        toast({
          title: '保存完了',
          description: '試合情報を更新しました',
        });
        await fetchMatches();
        setEditingMatch(null);
      } else {
        throw new Error('Failed to save match');
      }
    } catch (error) {
      console.error('Failed to save match:', error);
      toast({
        title: 'エラー',
        description: '試合情報の保存に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMatch = async () => {
    if (!deleteMatchId) return;

    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/matches?matchId=${deleteMatchId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: '削除完了',
          description: '試合を削除しました',
        });
        await fetchMatches();
        setDeleteMatchId(null);
      } else {
        throw new Error('Failed to delete match');
      }
    } catch (error) {
      console.error('Failed to delete match:', error);
      toast({
        title: 'エラー',
        description: '試合の削除に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMatch = async (newMatch: Partial<Match>) => {
    try {
      setIsSaving(true);
      
      const matchData = {
        tournament_id: tournamentId,
        match_number: (matches.length + 1).toString(),
        player1_id: newMatch.player1_id,
        player2_id: newMatch.player2_id,
        game_type: newMatch.game_type,
      };

      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveTournamentMatches',
          tournamentId: tournamentId,
          matches: [matchData],
        }),
      });

      if (response.ok) {
        toast({
          title: '追加完了',
          description: '新しい試合を追加しました',
        });
        await fetchMatches();
        setShowAddMatch(false);
      } else {
        throw new Error('Failed to add match');
      }
    } catch (error) {
      console.error('Failed to add match:', error);
      toast({
        title: 'エラー',
        description: '試合の追加に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendReminder = (matchId: string) => {
    console.log('Sending reminder for match:', matchId);
    // TODO: Implement reminder notification
  };

  const handleDirectInput = (matchId: string) => {
    console.log('Opening direct input for match:', matchId);
    // TODO: Open direct input modal
  };

  if (showMatchmaking) {
    return (
      <TournamentMatchmaking
        onClose={() => {
          setShowMatchmaking(false);
          fetchMatches();
        }}
        tournamentId={tournamentId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">大会運営</h1>
                <p className="text-sm text-muted-foreground">{tournamentName}</p>
              </div>
            </div>
            <Button variant="fantasy" onClick={() => setShowMatchmaking(!showMatchmaking)}>
              <Shuffle className="h-4 w-4 mr-2" />
              組み合わせ設定
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">概要</TabsTrigger>
            <TabsTrigger value="matches">試合管理</TabsTrigger>
            <TabsTrigger value="progress">進行状況</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card className="border-fantasy-frame shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  大会進行状況
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{scheduledMatches.length}</div>
                    <div className="text-sm text-muted-foreground">待機中</div>
                  </div>
                  <div className="text-center p-4 bg-info/20 rounded-lg">
                    <div className="text-2xl font-bold text-info">{inProgressMatches.length}</div>
                    <div className="text-sm text-muted-foreground">対戦中</div>
                  </div>
                  <div className="text-center p-4 bg-warning/20 rounded-lg">
                    <div className="text-2xl font-bold text-warning">{pendingMatches.length}</div>
                    <div className="text-sm text-muted-foreground">報告待ち</div>
                  </div>
                  <div className="text-center p-4 bg-success/20 rounded-lg">
                    <div className="text-2xl font-bold text-success">{completedMatches.length}</div>
                    <div className="text-sm text-muted-foreground">完了</div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="mt-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>進行率</span>
                    <span>{Math.round((completedMatches.length / (matches.length || 1)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${(completedMatches.length / (matches.length || 1)) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Active Players */}
            <Card className="border-fantasy-frame shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  参加者一覧 ({activePlayers.length}名)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {activePlayers.map((player) => (
                    <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{player.nickname}</p>
                        <p className="text-sm text-muted-foreground">レート: {player.current_rating}</p>
                      </div>
                      <Badge className="bg-green-500 text-white">参加中</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Matches Management Tab */}
          <TabsContent value="matches" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">試合一覧</h2>
              <Button variant="fantasy" size="sm" onClick={() => setShowAddMatch(true)}>
                <Plus className="h-4 w-4 mr-2" />
                試合を追加
              </Button>
            </div>

            {isLoading ? (
              <Card className="border-fantasy-frame shadow-soft">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">読み込み中...</p>
                </CardContent>
              </Card>
            ) : matches.length === 0 ? (
              <Card className="border-fantasy-frame shadow-soft">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">まだ組み合わせがありません</p>
                  <Button variant="fantasy" onClick={() => setShowMatchmaking(true)}>
                    <Shuffle className="h-4 w-4 mr-2" />
                    組み合わせを作成
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <Card key={match.match_id} className="border-fantasy-frame shadow-soft">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground">
                              試合 {match.match_number}
                            </span>
                            <Badge className={getStatusColor(match.status)}>
                              {getStatusText(match.status)}
                            </Badge>
                            {match.game_type === 'trump' ? (
                              <div className="flex items-center gap-1 text-primary">
                                <Spade className="h-4 w-4" />
                                <span className="text-sm">トランプ</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-accent">
                                <PlusIcon className="h-4 w-4" />
                                <span className="text-sm">カード+</span>
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-lg">
                            {match.player1_name} vs {match.player2_name}
                          </p>
                          {match.winner_id && (
                            <p className="text-sm text-success">
                              勝者: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {canEditMatch(match) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditMatch(match)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDeleteMatch(match) && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteMatchId(match.match_id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {matches.some(m => m.status !== 'scheduled') && (
              <Card className="border-warning shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <p className="text-sm">
                      既に開始された試合は編集・削除できません
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Progress Monitoring Tab */}
          <TabsContent value="progress" className="space-y-4">
            {/* Current Time */}
            <Card className="border-fantasy-frame shadow-soft">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-primary">
                  {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {currentTime.toLocaleDateString('ja-JP')}
                </div>
              </CardContent>
            </Card>

            {/* In Progress Matches */}
            <Card className="border-fantasy-frame shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Play className="h-5 w-5 text-info" />
                  現在対戦中 ({inProgressMatches.length}件)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {inProgressMatches.length > 0 ? (
                  inProgressMatches.map((match) => (
                    <div
                      key={match.match_id}
                      className="p-4 bg-info/10 border border-info/20 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground">
                            {match.player1_name} vs {match.player2_name}
                          </h3>
                          <div className="text-sm text-muted-foreground">
                            試合{match.match_number} • {match.game_type === 'trump' ? 'トランプルール' : 'カードプラスルール'}
                          </div>
                        </div>
                        <Badge className={getStatusColor(match.status)}>
                          {getStatusText(match.status)}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>現在対戦中の試合はありません</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pending Matches */}
            <Card className="border-fantasy-frame shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-warning" />
                  報告待ち ({pendingMatches.length}件)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingMatches.length > 0 ? (
                  pendingMatches.map((match) => {
                    const createdAt = new Date(match.created_at);
                    const elapsedMinutes = Math.floor((currentTime.getTime() - createdAt.getTime()) / (1000 * 60));
                    const isOvertime = elapsedMinutes > 15;
                    
                    return (
                      <div
                        key={match.match_id}
                        className={`p-4 rounded-lg border ${
                          isOvertime 
                            ? 'bg-destructive/10 border-destructive/20' 
                            : 'bg-warning/10 border-warning/20'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-foreground">
                              {match.player1_name} vs {match.player2_name}
                            </h3>
                            <div className="text-sm text-muted-foreground">
                              試合{match.match_number} • {match.game_type === 'trump' ? 'トランプルール' : 'カードプラスルール'}
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge className={isOvertime ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}>
                              {isOvertime ? '長時間経過' : '報告待ち'}
                            </Badge>
                            <div className={`text-sm font-mono ${isOvertime ? 'text-destructive' : 'text-warning'}`}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {Math.max(0, elapsedMinutes)}分経過
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleSendReminder(match.match_id)}
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            催促通知
                          </Button>
                          <Button 
                            variant="tournament" 
                            size="sm"
                            onClick={() => handleDirectInput(match.match_id)}
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            代理入力
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>報告待ちの試合はありません</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit Match Dialog */}
      <Dialog open={!!editingMatch} onOpenChange={() => setEditingMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>試合編集 - 試合 {editingMatch?.match_number}</DialogTitle>
          </DialogHeader>
          {editingMatch && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>プレイヤー1</Label>
                <Select
                  value={editingMatch.player1_id}
                  onValueChange={(value) => setEditingMatch({ ...editingMatch, player1_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.nickname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>プレイヤー2</Label>
                <Select
                  value={editingMatch.player2_id}
                  onValueChange={(value) => setEditingMatch({ ...editingMatch, player2_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlayers.map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.nickname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>ゲームタイプ</Label>
                <Select
                  value={editingMatch.game_type}
                  onValueChange={(value) => setEditingMatch({ ...editingMatch, game_type: value as 'trump' | 'cardplus' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trump">
                      <div className="flex items-center gap-2">
                        <Spade className="h-4 w-4" />
                        トランプルール
                      </div>
                    </SelectItem>
                    <SelectItem value="cardplus">
                      <div className="flex items-center gap-2">
                        <PlusIcon className="h-4 w-4" />
                        カード+ルール
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMatch(null)}>
              キャンセル
            </Button>
            <Button variant="fantasy" onClick={handleSaveMatch} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Match Dialog */}
      <AddMatchDialog
        isOpen={showAddMatch}
        onClose={() => setShowAddMatch(false)}
        onAdd={handleAddMatch}
        activePlayers={activePlayers}
        isSaving={isSaving}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMatchId} onOpenChange={() => setDeleteMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>試合を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。本当に削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMatch}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Add Match Dialog Component
const AddMatchDialog = ({ isOpen, onClose, onAdd, activePlayers, isSaving }: {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (match: Partial<Match>) => void;
  activePlayers: any[];
  isSaving: boolean;
}) => {
  const [newMatch, setNewMatch] = useState<Partial<Match>>({
    player1_id: '',
    player2_id: '',
    game_type: 'trump',
  });

  const handleAdd = () => {
    if (!newMatch.player1_id || !newMatch.player2_id) {
      toast({
        title: 'エラー',
        description: '両方のプレイヤーを選択してください',
        variant: 'destructive',
      });
      return;
    }

    if (newMatch.player1_id === newMatch.player2_id) {
      toast({
        title: 'エラー',
        description: '同じプレイヤーを選択することはできません',
        variant: 'destructive',
      });
      return;
    }

    onAdd(newMatch);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しい試合を追加</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>プレイヤー1</Label>
            <Select
              value={newMatch.player1_id}
              onValueChange={(value) => setNewMatch({ ...newMatch, player1_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="プレイヤーを選択" />
              </SelectTrigger>
              <SelectContent>
                {activePlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>プレイヤー2</Label>
            <Select
              value={newMatch.player2_id}
              onValueChange={(value) => setNewMatch({ ...newMatch, player2_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="プレイヤーを選択" />
              </SelectTrigger>
              <SelectContent>
                {activePlayers.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>ゲームタイプ</Label>
            <Select
              value={newMatch.game_type}
              onValueChange={(value) => setNewMatch({ ...newMatch, game_type: value as 'trump' | 'cardplus' })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trump">
                  <div className="flex items-center gap-2">
                    <Spade className="h-4 w-4" />
                    トランプルール
                  </div>
                </SelectItem>
                <SelectItem value="cardplus">
                  <div className="flex items-center gap-2">
                    <PlusIcon className="h-4 w-4" />
                    カード+ルール
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button variant="fantasy" onClick={handleAdd} disabled={isSaving}>
            {isSaving ? '追加中...' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};