import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Users, Shuffle, Grid3X3, Hand, Play, Spade, Plus, Loader2 } from 'lucide-react';
import { usePlayers } from '@/hooks/useApi';
import { toast } from '@/components/ui/use-toast';

interface TournamentMatchmakingProps {
  onClose: () => void;
  tournamentId?: string;
}

interface Match {
  id: string;
  player1: any;
  player2: any;
  gameType: 'trump' | 'cardplus';
}

export const TournamentMatchmaking = ({ onClose, tournamentId }: TournamentMatchmakingProps) => {
  const { data: players = [] } = usePlayers();
  const [matchType, setMatchType] = useState<'random' | 'round-robin' | 'manual'>('random');
  const [gameType, setGameType] = useState<'trump' | 'cardplus'>('trump');
  const [matches, setMatches] = useState<Match[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter active tournament participants (mock data for now)
  const tournamentParticipants = players.filter(p => p.tournament_active).slice(0, 8);

  const generateRandomMatches = useCallback(() => {
    const shuffled = [...tournamentParticipants].sort(() => Math.random() - 0.5);
    const newMatches: Match[] = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
      if (i + 1 < shuffled.length) {
        newMatches.push({
          id: `match_${i / 2 + 1}`,
          player1: shuffled[i],
          player2: shuffled[i + 1],
          gameType
        });
      }
    }
    
    setMatches(newMatches);
  }, [tournamentParticipants, gameType]);

  const generateRoundRobinMatches = useCallback(() => {
    const newMatches: Match[] = [];
    let matchId = 1;
    
    for (let i = 0; i < tournamentParticipants.length; i++) {
      for (let j = i + 1; j < tournamentParticipants.length; j++) {
        newMatches.push({
          id: `match_${matchId}`,
          player1: tournamentParticipants[i],
          player2: tournamentParticipants[j],
          gameType
        });
        matchId++;
      }
    }
    
    setMatches(newMatches);
  }, [tournamentParticipants, gameType]);

  const generateMatches = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      if (matchType === 'random') {
        generateRandomMatches();
      } else if (matchType === 'round-robin') {
        generateRoundRobinMatches();
      } else {
        // Manual - just create empty matches for manual assignment
        const emptyMatches: Match[] = [];
        for (let i = 0; i < Math.floor(tournamentParticipants.length / 2); i++) {
          emptyMatches.push({
            id: `match_${i + 1}`,
            player1: null,
            player2: null,
            gameType
          });
        }
        setMatches(emptyMatches);
      }
      setIsGenerating(false);
      toast({ title: "組み合わせを生成しました" });
    }, 1000);
  };

  const confirmMatches = async () => {
    if (matches.length === 0) {
      toast({ 
        title: "エラー",
        description: "組み合わせが生成されていません",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Save tournament matches to backend
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'saveTournamentMatches',
          tournamentId: tournamentId,
          matches: matches
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save tournament matches');
      }

      const result = await response.json();
      console.log('Tournament matches saved:', result);

      toast({ 
        title: "組み合わせが確定しました",
        description: `${result.matchCount}試合の組み合わせを保存しました。参加者にプッシュ通知を送信しました。`
      });
      
      // Close the matchmaking screen after successful save
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (error) {
      console.error('Error confirming matches:', error);
      toast({ 
        title: "エラー",
        description: "組み合わせの保存に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, player: any) => {
    setDraggedPlayer(player);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, matchId: string, position: 'player1' | 'player2') => {
    e.preventDefault();
    if (!draggedPlayer) return;

    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        // Remove dragged player from any other position
        const updatedMatches = prev.map(m => ({
          ...m,
          player1: m.player1?.id === draggedPlayer.id ? null : m.player1,
          player2: m.player2?.id === draggedPlayer.id ? null : m.player2
        }));

        // Find the match to update
        const targetMatch = updatedMatches.find(m => m.id === matchId);
        if (targetMatch) {
          return {
            ...targetMatch,
            [position]: draggedPlayer
          };
        }
      }
      return match;
    }));

    setDraggedPlayer(null);
  };

  const getPlayerBadges = (player: any) => {
    const badges = [];
    if (player.trump_rule_experienced) {
      badges.push(<Badge key="trump" variant="secondary" className="text-xs"><Spade className="h-3 w-3 mr-1" />トランプ</Badge>);
    }
    if (player.cardplus_rule_experienced) {
      badges.push(<Badge key="cardplus" variant="secondary" className="text-xs"><Plus className="h-3 w-3 mr-1" />カード+</Badge>);
    }
    return badges;
  };

  const unassignedPlayers = tournamentParticipants.filter(player => 
    !matches.some(match => 
      match.player1?.id === player.id || match.player2?.id === player.id
    )
  );

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">大会組み合わせ</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Settings */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle>組み合わせ設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">対戦方式</label>
                <Select value={matchType} onValueChange={(value: any) => setMatchType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">
                      <div className="flex items-center gap-2">
                        <Shuffle className="h-4 w-4" />
                        ランダム
                      </div>
                    </SelectItem>
                    <SelectItem value="round-robin">
                      <div className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        総当たり
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2">
                        <Hand className="h-4 w-4" />
                        手動設定
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">ゲームタイプ</label>
                <Select value={gameType} onValueChange={(value: any) => setGameType(value)}>
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
                        <Plus className="h-4 w-4" />
                        カードプラスルール
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={generateMatches} disabled={isGenerating || tournamentParticipants.length < 2}>
              {isGenerating ? "生成中..." : "組み合わせ生成"}
            </Button>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle>参加者一覧 ({tournamentParticipants.length}名)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {tournamentParticipants.map((player) => (
                <div
                  key={player.id}
                  draggable={matchType === 'manual'}
                  onDragStart={(e) => handleDragStart(e, player)}
                  className={`p-3 bg-muted rounded-lg border ${
                    matchType === 'manual' ? 'cursor-move hover:bg-muted/80' : ''
                  } ${unassignedPlayers.includes(player) ? 'border-warning' : 'border-muted'}`}
                >
                  <p className="font-medium text-sm">{player.nickname}</p>
                  <p className="text-xs text-muted-foreground">{player.current_rating}pt</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getPlayerBadges(player)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Matches */}
        {matches.length > 0 && (
          <Card className="border-fantasy-frame shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>対戦組み合わせ ({matches.length}試合)</CardTitle>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="heroic" 
                    disabled={matches.some(m => !m.player1 || !m.player2) || isGenerating}
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />保存中...</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" />組み合わせ確定</>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>組み合わせを確定しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      確定後、参加者全員にプッシュ通知が送信されます。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmMatches}>確定</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.id} className="p-4 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">試合 {match.id.split('_')[1]}</span>
                      <Badge variant="outline">
                        {match.gameType === 'trump' ? (
                          <>
                            <Spade className="h-3 w-3 mr-1" />
                            トランプ
                          </>
                        ) : (
                          <>
                            <Plus className="h-3 w-3 mr-1" />
                            カード+
                          </>
                        )}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-3 border-2 border-dashed rounded-lg ${
                          matchType === 'manual' ? 'min-h-[80px]' : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, match.id, 'player1')}
                      >
                        {match.player1 ? (
                          <div>
                            <p className="font-medium">{match.player1.nickname}</p>
                            <p className="text-sm text-muted-foreground">{match.player1.current_rating}pt</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getPlayerBadges(match.player1)}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center">プレイヤー1</p>
                        )}
                      </div>
                      <div
                        className={`p-3 border-2 border-dashed rounded-lg ${
                          matchType === 'manual' ? 'min-h-[80px]' : ''
                        }`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, match.id, 'player2')}
                      >
                        {match.player2 ? (
                          <div>
                            <p className="font-medium">{match.player2.nickname}</p>
                            <p className="text-sm text-muted-foreground">{match.player2.current_rating}pt</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {getPlayerBadges(match.player2)}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-center">プレイヤー2</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Unassigned Players (for manual mode) */}
        {matchType === 'manual' && unassignedPlayers.length > 0 && (
          <Card className="border-fantasy-frame shadow-soft border-warning">
            <CardHeader>
              <CardTitle className="text-warning">未割り当てプレイヤー</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {unassignedPlayers.map((player) => (
                  <div
                    key={player.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player)}
                    className="p-3 bg-warning/10 rounded-lg border border-warning cursor-move hover:bg-warning/20"
                  >
                    <p className="font-medium text-sm">{player.nickname}</p>
                    <p className="text-xs text-muted-foreground">{player.current_rating}pt</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {getPlayerBadges(player)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};