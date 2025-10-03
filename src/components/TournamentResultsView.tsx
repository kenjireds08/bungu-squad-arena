import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Trophy, Medal, Award, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Tournament {
  id: string;
  name: string;
  date: string;
  status: string;
}

interface TournamentResultsViewProps {
  onClose: () => void;
  tournament: Tournament;
}

interface Match {
  match_id: string;
  player1_name: string;
  player2_name: string;
  winner_id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  game_type: string;
}

interface PlayerResult {
  player_id: string;
  player_name: string;
  wins: number;
  losses: number;
  total_matches: number;
  win_rate: number;
  final_rating: number;
  rating_change: number;
}

export const TournamentResultsView = ({ onClose, tournament }: TournamentResultsViewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [playerResults, setPlayerResults] = useState<PlayerResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddMatchDialog, setShowAddMatchDialog] = useState(false);
  const [showEditMatchDialog, setShowEditMatchDialog] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Array<{ id: string; nickname: string }>>([]);
  const [newMatch, setNewMatch] = useState({
    player1_id: '',
    player2_id: '',
    winner_id: '',
    game_type: 'cardplus'
  });

  useEffect(() => {
    fetchTournamentResults();
    fetchPlayers();
  }, [tournament.id]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (response.ok) {
        const data = await response.json();
        setPlayers(data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    }
  };

  const fetchTournamentResults = async () => {
    try {
      setIsLoading(true);

      // Fetch tournament matches
      const matchesResponse = await fetch(`/api/matches?tournamentId=${tournament.id}`);
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData);

        // Calculate player results
        calculatePlayerResults(matchesData);
      }
    } catch (error) {
      console.error('Failed to fetch tournament results:', error);
      toast({
        title: 'エラー',
        description: '大会結果の読み込みに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculatePlayerResults = (matchesData: Match[]) => {
    const playerStats: { [key: string]: PlayerResult } = {};
    
    // Process each completed match
    matchesData
      .filter(match => match.status === 'approved' && match.winner_id)
      .forEach(match => {
        const { player1_id, player1_name, player2_id, player2_name, winner_id } = match;
        
        // Initialize player stats if not exists
        if (!playerStats[player1_id]) {
          playerStats[player1_id] = {
            player_id: player1_id,
            player_name: player1_name,
            wins: 0,
            losses: 0,
            total_matches: 0,
            win_rate: 0,
            final_rating: 1200, // Default rating
            rating_change: 0
          };
        }
        
        if (!playerStats[player2_id]) {
          playerStats[player2_id] = {
            player_id: player2_id,
            player_name: player2_name,
            wins: 0,
            losses: 0,
            total_matches: 0,
            win_rate: 0,
            final_rating: 1200, // Default rating
            rating_change: 0
          };
        }
        
        // Update stats
        playerStats[player1_id].total_matches++;
        playerStats[player2_id].total_matches++;
        
        if (winner_id === player1_id) {
          playerStats[player1_id].wins++;
          playerStats[player2_id].losses++;
        } else if (winner_id === player2_id) {
          playerStats[player2_id].wins++;
          playerStats[player1_id].losses++;
        }
      });
    
    // Calculate win rates and sort by performance
    const results = Object.values(playerStats).map(player => ({
      ...player,
      win_rate: player.total_matches > 0 ? (player.wins / player.total_matches) * 100 : 0
    })).sort((a, b) => {
      // Sort by wins first, then by win rate
      if (a.wins !== b.wins) return b.wins - a.wins;
      return b.win_rate - a.win_rate;
    });
    
    setPlayerResults(results);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <div className="w-6 h-6 flex items-center justify-center text-sm font-bold">{rank}</div>;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50 border-yellow-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-muted/30 border-border';
    }
  };

  const handleAddMatch = async () => {
    if (!newMatch.player1_id || !newMatch.player2_id || !newMatch.winner_id) {
      toast({
        title: 'エラー',
        description: 'すべての項目を選択してください',
        variant: 'destructive',
      });
      return;
    }

    if (newMatch.player1_id === newMatch.player2_id) {
      toast({
        title: 'エラー',
        description: '同じプレイヤーを選択できません',
        variant: 'destructive',
      });
      return;
    }

    // 勝者が選択中のプレイヤーと一致するか検証
    if (newMatch.winner_id !== newMatch.player1_id && newMatch.winner_id !== newMatch.player2_id) {
      toast({
        title: 'エラー',
        description: '勝者は選択したプレイヤーのいずれかである必要があります',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Step 1: Add match to tournament
      const addResponse = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveTournamentMatches',
          tournamentId: tournament.id,
          matches: [{
            player1_id: newMatch.player1_id,
            player2_id: newMatch.player2_id,
            game_type: newMatch.game_type
          }]
        })
      });

      const addResult = await addResponse.json();
      if (!addResult.success) {
        throw new Error(addResult.message || '試合の追加に失敗しました');
      }

      // Step 2: Submit match result
      const resultResponse = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adminDirectInput',
          matchId: addResult.matchId,
          winnerId: newMatch.winner_id,
          loserId: newMatch.winner_id === newMatch.player1_id ? newMatch.player2_id : newMatch.player1_id
        })
      });

      const resultData = await resultResponse.json();
      if (!resultData.success) {
        throw new Error(resultData.message || '試合結果の記録に失敗しました');
      }

      toast({
        title: '成功',
        description: '試合を追加しました',
      });

      setShowAddMatchDialog(false);
      setNewMatch({
        player1_id: '',
        player2_id: '',
        winner_id: '',
        game_type: 'cardplus'
      });
      fetchTournamentResults();
    } catch (error: any) {
      console.error('Failed to add match:', error);
      toast({
        title: 'エラー',
        description: error.message || '試合の追加に失敗しました',
        variant: 'destructive',
      });
    }
  };

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
    setNewMatch({
      player1_id: match.player1_id,
      player2_id: match.player2_id,
      winner_id: match.winner_id,
      game_type: match.game_type
    });
    setShowEditMatchDialog(true);
  };

  const handleUpdateMatch = async () => {
    if (!editingMatch || !newMatch.player1_id || !newMatch.player2_id || !newMatch.winner_id) {
      toast({
        title: 'エラー',
        description: 'すべての項目を選択してください',
        variant: 'destructive',
      });
      return;
    }

    if (newMatch.player1_id === newMatch.player2_id) {
      toast({
        title: 'エラー',
        description: '同じプレイヤーを選択できません',
        variant: 'destructive',
      });
      return;
    }

    // 勝者が選択中のプレイヤーと一致するか検証
    if (newMatch.winner_id !== newMatch.player1_id && newMatch.winner_id !== newMatch.player2_id) {
      toast({
        title: 'エラー',
        description: '勝者は選択したプレイヤーのいずれかである必要があります',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Delete old match and create new one
      await handleDeleteMatch(editingMatch.match_id, true);

      // Add new match with updated data
      const addResponse = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveTournamentMatches',
          tournamentId: tournament.id,
          matches: [{
            player1_id: newMatch.player1_id,
            player2_id: newMatch.player2_id,
            game_type: newMatch.game_type
          }]
        })
      });

      const addResult = await addResponse.json();
      if (!addResult.success) {
        throw new Error(addResult.message || '試合の更新に失敗しました');
      }

      // Submit match result
      const resultResponse = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adminDirectInput',
          matchId: addResult.matchId,
          winnerId: newMatch.winner_id,
          loserId: newMatch.winner_id === newMatch.player1_id ? newMatch.player2_id : newMatch.player1_id
        })
      });

      const resultData = await resultResponse.json();
      if (!resultData.success) {
        throw new Error(resultData.message || '試合結果の記録に失敗しました');
      }

      toast({
        title: '成功',
        description: '試合を更新しました',
      });

      setShowEditMatchDialog(false);
      setEditingMatch(null);
      setNewMatch({
        player1_id: '',
        player2_id: '',
        winner_id: '',
        game_type: 'cardplus'
      });
      fetchTournamentResults();
    } catch (error: any) {
      console.error('Failed to update match:', error);
      toast({
        title: 'エラー',
        description: error.message || '試合の更新に失敗しました',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteMatch = async (matchId: string, skipConfirm: boolean = false): Promise<void> => {
    if (!skipConfirm && !confirm('この試合を削除しますか？この操作は取り消せません。')) {
      return;
    }

    try {
      const response = await fetch(`/api/matches?matchId=${matchId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('試合の削除に失敗しました');
      }

      if (!skipConfirm) {
        toast({
          title: '成功',
          description: '試合を削除しました',
        });
        fetchTournamentResults();
      }
    } catch (error: any) {
      console.error('Failed to delete match:', error);
      if (!skipConfirm) {
        toast({
          title: 'エラー',
          description: error.message || '試合の削除に失敗しました',
          variant: 'destructive',
        });
      }
      // 削除失敗時は常にエラーを再送出（編集処理で検知するため）
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">大会結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">大会結果</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardContent className="p-4">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{tournament.name}</h2>
              <p className="text-muted-foreground">{tournament.date}</p>
              <Badge variant="outline">
                <Users className="h-4 w-4 mr-1" />
                参加者 {playerResults.length}名
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Results Ranking */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              最終順位
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {playerResults.length > 0 ? (
              playerResults.map((player, index) => (
                <div
                  key={player.player_id}
                  className={`p-4 rounded-lg border ${getRankColor(index + 1)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getRankIcon(index + 1)}
                      <div>
                        <p className="font-semibold text-lg">{player.player_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {player.wins}勝 {player.losses}敗 (勝率: {player.win_rate.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">試合数</p>
                      <p className="font-bold">{player.total_matches}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">まだ結果がありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Match Results Summary */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>試合結果一覧</CardTitle>
              <Button
                variant="fantasy"
                size="sm"
                onClick={() => setShowAddMatchDialog(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                試合を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matches
                .filter(match => match.status === 'approved' && match.winner_id)
                .map((match) => (
                  <div key={match.match_id} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">
                          {match.player1_name} vs {match.player2_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {match.game_type === 'trump' ? 'トランプ' : 'カード+'}
                        </p>
                        <p className="text-sm text-success font-medium mt-1">
                          勝者: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditMatch(match)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteMatch(match.match_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              }
              {matches.filter(match => match.status === 'approved' && match.winner_id).length === 0 && (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">完了した試合がありません</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Add Match Dialog */}
      <Dialog open={showAddMatchDialog} onOpenChange={setShowAddMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>試合を追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>プレイヤー1</Label>
              <Select
                value={newMatch.player1_id}
                onValueChange={(value) => setNewMatch(prev => ({
                  ...prev,
                  player1_id: value,
                  // プレイヤー1を変更したら、勝者IDがプレイヤー1だった場合はリセット
                  winner_id: prev.winner_id === prev.player1_id ? '' : prev.winner_id
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プレイヤーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
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
                onValueChange={(value) => setNewMatch(prev => ({
                  ...prev,
                  player2_id: value,
                  // プレイヤー2を変更したら、勝者IDがプレイヤー2だった場合はリセット
                  winner_id: prev.winner_id === prev.player2_id ? '' : prev.winner_id
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プレイヤーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>勝者</Label>
              <Select
                value={newMatch.winner_id}
                onValueChange={(value) => setNewMatch(prev => ({ ...prev, winner_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="勝者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {newMatch.player1_id && (
                    <SelectItem value={newMatch.player1_id}>
                      {players.find(p => p.id === newMatch.player1_id)?.nickname}
                    </SelectItem>
                  )}
                  {newMatch.player2_id && (
                    <SelectItem value={newMatch.player2_id}>
                      {players.find(p => p.id === newMatch.player2_id)?.nickname}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ルール</Label>
              <Select
                value={newMatch.game_type}
                onValueChange={(value) => setNewMatch(prev => ({ ...prev, game_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardplus">カード+</SelectItem>
                  <SelectItem value="trump">トランプ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddMatchDialog(false);
              setNewMatch({
                player1_id: '',
                player2_id: '',
                winner_id: '',
                game_type: 'cardplus'
              });
            }}>
              キャンセル
            </Button>
            <Button variant="fantasy" onClick={handleAddMatch}>
              追加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Dialog */}
      <Dialog open={showEditMatchDialog} onOpenChange={setShowEditMatchDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>試合を編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>プレイヤー1</Label>
              <Select
                value={newMatch.player1_id}
                onValueChange={(value) => setNewMatch(prev => ({
                  ...prev,
                  player1_id: value,
                  // プレイヤー1を変更したら、勝者IDがプレイヤー1だった場合はリセット
                  winner_id: prev.winner_id === prev.player1_id ? '' : prev.winner_id
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プレイヤーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
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
                onValueChange={(value) => setNewMatch(prev => ({
                  ...prev,
                  player2_id: value,
                  // プレイヤー2を変更したら、勝者IDがプレイヤー2だった場合はリセット
                  winner_id: prev.winner_id === prev.player2_id ? '' : prev.winner_id
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="プレイヤーを選択" />
                </SelectTrigger>
                <SelectContent>
                  {players.map(player => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>勝者</Label>
              <Select
                value={newMatch.winner_id}
                onValueChange={(value) => setNewMatch(prev => ({ ...prev, winner_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="勝者を選択" />
                </SelectTrigger>
                <SelectContent>
                  {newMatch.player1_id && (
                    <SelectItem value={newMatch.player1_id}>
                      {players.find(p => p.id === newMatch.player1_id)?.nickname}
                    </SelectItem>
                  )}
                  {newMatch.player2_id && (
                    <SelectItem value={newMatch.player2_id}>
                      {players.find(p => p.id === newMatch.player2_id)?.nickname}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ルール</Label>
              <Select
                value={newMatch.game_type}
                onValueChange={(value) => setNewMatch(prev => ({ ...prev, game_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cardplus">カード+</SelectItem>
                  <SelectItem value="trump">トランプ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditMatchDialog(false);
              setEditingMatch(null);
              setNewMatch({
                player1_id: '',
                player2_id: '',
                winner_id: '',
                game_type: 'cardplus'
              });
            }}>
              キャンセル
            </Button>
            <Button variant="fantasy" onClick={handleUpdateMatch}>
              更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};