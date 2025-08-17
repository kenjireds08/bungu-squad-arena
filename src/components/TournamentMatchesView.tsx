import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Edit, Trash2, Plus, Save, Users, Spade, Plus as PlusIcon, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';
import { toast } from '@/components/ui/use-toast';

interface TournamentMatchesEditorProps {
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
  status: 'scheduled' | 'in_progress' | 'completed' | 'approved' | 'cancelled' | 'invalid';
  winner_id: string;
  result_details: string;
  created_at: string;
  completed_at: string;
  approved_at: string;
  winner_rating_change?: number;
  loser_rating_change?: number;
}

interface TournamentMatchesViewProps {
  onClose: () => void;
  currentUserId: string;
  tournamentId: string;
}

export const TournamentMatchesView = ({ onClose, currentUserId, tournamentId }: TournamentMatchesViewProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { data: players } = useRankings();

  // Get player matches
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/matches?tournamentId=${tournamentId}`);
        if (response.ok) {
          const data = await response.json();
          // Show all matches, not just user's matches
          setMatches(data);
        }
      } catch (error) {
        console.error('Failed to fetch matches:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [tournamentId, currentUserId]);

  const getOpponentInfo = (match: Match) => {
    const isPlayer1 = match.player1_id === currentUserId;
    return {
      id: isPlayer1 ? match.player2_id : match.player1_id,
      name: isPlayer1 ? match.player2_name : match.player1_name
    };
  };

  const getMatchResult = (match: Match) => {
    if (!match.winner_id) return null;
    return match.winner_id === currentUserId ? 'win' : 'lose';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-muted text-muted-foreground';
      case 'in_progress': return 'bg-info text-info-foreground';
      case 'completed': return 'bg-warning text-warning-foreground';
      case 'approved': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '待機中';
      case 'in_progress': return '対戦中';
      case 'completed': return '結果報告済';
      case 'approved': return '完了';
      default: return '不明';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">試合データを読み込み中...</p>
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
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">対戦組み合わせ</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {matches.length === 0 ? (
          <Card className="border-fantasy-frame shadow-soft">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">まだ対戦組み合わせが決定されていません</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Check if it's user's turn */}
            {matches.some(match => 
              (match.player1_id === currentUserId || match.player2_id === currentUserId) && 
              match.status === 'scheduled'
            ) && (
              <Card className="border-primary bg-primary/10 shadow-golden animate-pulse">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold text-primary">
                    🎮 あなたの番です！席についてください
                  </p>
                </CardContent>
              </Card>
            )}
            
            {/* All matches list */}
            <div className="space-y-3">
              {matches.map((match, index) => {
                const isUserMatch = match.player1_id === currentUserId || match.player2_id === currentUserId;
                const isInProgress = match.status === 'in_progress';
                const isCompleted = match.status === 'completed' || match.status === 'approved';
                
                return (
                  <Card 
                    key={match.match_id} 
                    className={`border-fantasy-frame shadow-soft ${
                      isUserMatch ? 'border-primary ring-2 ring-primary/20' : ''
                    } ${isInProgress ? 'bg-info/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            第{index + 1}試合
                          </span>
                          <Badge className={getStatusColor(match.status)}>
                            {getStatusText(match.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {match.game_type === 'trump' ? '♠️ トランプ' : '➕ カード+'}
                          </span>
                        </div>
                        {isUserMatch && (
                          <Badge variant="outline" className="border-primary text-primary">
                            あなたの試合
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${
                            match.winner_id === match.player1_id ? 'text-success' : ''
                          }`}>
                            {match.player1_name}
                          </span>
                          <span className="text-muted-foreground">vs</span>
                          <span className={`font-semibold ${
                            match.winner_id === match.player2_id ? 'text-success' : ''
                          }`}>
                            {match.player2_name}
                          </span>
                        </div>
                        {isCompleted && match.winner_id && (
                          <Badge variant={match.winner_id === match.player1_id ? 'default' : 'secondary'}>
                            {match.winner_id === match.player1_id ? match.player1_name : match.player2_name} 勝利
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export const TournamentMatchesEditor = ({ onClose, tournamentId, tournamentName }: TournamentMatchesEditorProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showAddMatch, setShowAddMatch] = useState(false);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [cancelMatchId, setCancelMatchId] = useState<string | null>(null);
  const [ratingChanges, setRatingChanges] = useState<Map<string, {winner_rating_change: number, loser_rating_change: number}>>(new Map());
  const { data: players } = useRankings();
  
  // Get active players for dropdowns
  const activePlayers = players?.filter(p => p.tournament_active) || [];

  // Fetch rating changes for completed matches
  const fetchRatingChanges = async (matchList: Match[]) => {
    const newRatingChanges = new Map();
    
    for (const match of matchList) {
      if (match.status === 'approved' || match.status === 'completed') {
        try {
          // Rating history API temporarily disabled to prevent rate limit
          console.log('Rating history fetch disabled for match:', match.match_id);
          
          // Set default rating changes (temporary measure)
          newRatingChanges.set(match.match_id, {
            winner_rating_change: 0,
            loser_rating_change: 0
          });
        } catch (error) {
          console.warn(`Rating history disabled for ${match.match_id}:`, error);
        }
      }
    }
    
    setRatingChanges(newRatingChanges);
  };

  // Fetch current matches
  const fetchMatches = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
        
        // Fetch rating changes for completed matches
        await fetchRatingChanges(data);
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
  }, [tournamentId]);

  const handleEditMatch = (match: Match) => {
    setEditingMatch(match);
  };

  const handleSaveMatch = async () => {
    if (!editingMatch) return;

    try {
      setIsSaving(true);
      
      const updateData: any = {
        player1_id: editingMatch.player1_id,
        player2_id: editingMatch.player2_id,
        game_type: editingMatch.game_type,
      };

      // Add winner information if this is a completed match
      if (editingMatch.status === 'completed' || editingMatch.status === 'approved') {
        if (editingMatch.winner_id === 'invalid') {
          updateData.status = 'invalid';
          updateData.winner_id = '';
        } else if (editingMatch.winner_id) {
          updateData.winner_id = editingMatch.winner_id;
          updateData.status = 'completed';
        }
      }
      
      const response = await fetch(`/api/matches?matchId=${editingMatch.match_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
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

  const handleCancelMatch = async () => {
    if (!cancelMatchId) return;

    try {
      setIsSaving(true);
      
      const response = await fetch(`/api/matches?matchId=${cancelMatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'cancelled'
        }),
      });

      if (response.ok) {
        toast({
          title: 'キャンセル完了',
          description: '試合をキャンセルしました',
        });
        await fetchMatches();
        setCancelMatchId(null);
      } else {
        throw new Error('Failed to cancel match');
      }
    } catch (error) {
      console.error('Failed to cancel match:', error);
      toast({
        title: 'エラー',
        description: '試合のキャンセルに失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMatch = async (newMatch: Partial<Match>) => {
    console.log('DEBUG: handleAddMatch called', { isSaving, newMatch });
    
    if (isSaving) {
      console.log('DEBUG: Already saving, returning');
      return;
    }

    try {
      setIsSaving(true);
      console.log('DEBUG: setIsSaving(true) called');
      
      const matchData = {
        player1_id: newMatch.player1_id,
        player2_id: newMatch.player2_id,
        game_type: newMatch.game_type || 'trump',
      };

      console.log('DEBUG: Adding single match:', matchData);

      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveTournamentMatches',
          tournamentId: tournamentId,
          matches: [matchData],
        }),
      });

      const result = await response.json();
      console.log('DEBUG: Add match response:', result);

      if (response.ok && result.success !== false) {
        console.log('DEBUG: Match added successfully');
        toast({
          title: '追加完了',
          description: '新しい試合を追加しました',
        });
        await fetchMatches();
        setShowAddMatch(false);
      } else {
        console.log('DEBUG: Match add failed:', result);
        throw new Error(result.message || 'Failed to add match');
      }
    } catch (error) {
      console.error('Failed to add match:', error);
      toast({
        title: 'エラー',
        description: `試合の追加に失敗しました: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      console.log('DEBUG: setIsSaving(false) called in finally');
      setIsSaving(false);
    }
  };

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
      case 'cancelled':
        return 'bg-destructive/20 text-destructive border border-destructive/30';
      case 'invalid':
        return 'bg-orange-100 text-orange-700 border border-orange-300';
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
      case 'cancelled':
        return 'キャンセル済';
      case 'invalid':
        return '無効試合';
      default:
        return '不明';
    }
  };

  const canEditMatch = (match: Match) => {
    // Can edit scheduled matches, and completed/approved matches for admins
    return match.status === 'scheduled' || 
           (match.status === 'completed' || match.status === 'approved');
  };

  const canDeleteMatch = (match: Match) => {
    // Can delete scheduled matches, and completed/approved matches for admins
    return match.status === 'scheduled' || 
           (match.status === 'completed' || match.status === 'approved');
  };

  const canCancelMatch = (match: Match) => {
    // Can cancel matches that are scheduled or in progress
    return match.status === 'scheduled' || match.status === 'in_progress';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
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
              <div className="flex items-center gap-2">
                <Edit className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">組み合わせ編集</h1>
              </div>
            </div>
            <Button variant="fantasy" onClick={() => setShowAddMatch(true)}>
              <Plus className="h-4 w-4 mr-2" />
              試合を追加
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{tournamentName}</h2>
                <p className="text-sm text-muted-foreground">
                  合計 {matches.length} 試合
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchMatches}>
                <RefreshCw className="h-4 w-4 mr-2" />
                更新
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Matches List */}
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
                      <div className="space-y-1">
                        <p className="text-sm text-success">
                          勝者: {match.winner_id === match.player1_id ? match.player1_name : match.player2_name}
                        </p>
                        {/* レーティング変動表示 */}
                        {(() => {
                          const ratingChange = ratingChanges.get(match.match_id);
                          if (ratingChange) {
                            return (
                              <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-green-600 font-medium">
                                    +{Math.abs(ratingChange.winner_rating_change)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({match.winner_id === match.player1_id ? match.player1_name : match.player2_name})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-red-600 font-medium">
                                    {ratingChange.loser_rating_change > 0 ? '-' : ''}{Math.abs(ratingChange.loser_rating_change)}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({match.winner_id === match.player1_id ? match.player2_name : match.player1_name})
                                  </span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
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
                    {canCancelMatch(match) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setCancelMatchId(match.match_id)}
                      >
                        <XCircle className="h-4 w-4" />
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

        {matches.length === 0 && (
          <Card className="border-fantasy-frame shadow-soft">
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">まだ組み合わせがありません</p>
              <Button variant="fantasy" onClick={() => setShowAddMatch(true)}>
                <Plus className="h-4 w-4 mr-2" />
                最初の試合を追加
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info for match management */}
        {matches.some(m => m.status !== 'scheduled' && m.status !== 'cancelled') && (
          <Card className="border-info shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-info" />
                <p className="text-sm">
                  開始済みの試合は編集できませんが、キャンセルは可能です
                </p>
              </div>
            </CardContent>
          </Card>
        )}
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

              {/* Winner selection for completed matches */}
              {(editingMatch.status === 'completed' || editingMatch.status === 'approved') && (
                <div className="space-y-2">
                  <Label>試合結果</Label>
                  <Select
                    value={editingMatch.winner_id || 'none'}
                    onValueChange={(value) => setEditingMatch({ 
                      ...editingMatch, 
                      winner_id: value === 'none' ? '' : value 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">未決定</SelectItem>
                      <SelectItem value={editingMatch.player1_id}>
                        {editingMatch.player1_name} の勝利
                      </SelectItem>
                      <SelectItem value={editingMatch.player2_id}>
                        {editingMatch.player2_name} の勝利
                      </SelectItem>
                      <SelectItem value="invalid">無効試合</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelMatchId} onOpenChange={() => setCancelMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>試合をキャンセルしますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この試合をキャンセルします。キャンセルされた試合は再開できません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>戻る</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelMatch}>
              キャンセル実行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMatchId} onOpenChange={() => setDeleteMatchId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>試合を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は取り消せません。
              {(() => {
                const match = matches.find(m => m.match_id === deleteMatchId);
                if (match && (match.status === 'completed' || match.status === 'approved')) {
                  return '完了済みの試合を削除すると、レーティング履歴も削除されます。';
                }
                return '本当に削除しますか？';
              })()}
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

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNewMatch({
        player1_id: '',
        player2_id: '',
        game_type: 'trump',
      });
    }
  }, [isOpen]);

  const handleAdd = () => {
    console.log('DEBUG: AddMatchDialog handleAdd called', { newMatch, isSaving });
    
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

    console.log('DEBUG: About to call onAdd with:', newMatch);
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
          <Button 
            variant="fantasy" 
            onClick={handleAdd} 
            disabled={isSaving}
          >
            {isSaving ? '追加中...' : '追加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
