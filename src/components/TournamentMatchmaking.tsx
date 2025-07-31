import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Users, Shuffle, Grid3X3, Hand, Play, Spade, Plus, Loader2, Settings, Hash } from 'lucide-react';
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
  const [customMatchCount, setCustomMatchCount] = useState<number>(4);
  const [matches, setMatches] = useState<Match[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter active tournament participants (mock data for now)
  const tournamentParticipants = players.filter(p => p.tournament_active).slice(0, 8);

  const generateRandomMatches = useCallback(() => {
    const newMatches: Match[] = [];
    const participants = [...tournamentParticipants];
    
    // Generate balanced random matches with fair distribution
    const balancedRandomMatches = generateBalancedRandomMatches(participants, customMatchCount);
    
    balancedRandomMatches.forEach((pairing, index) => {
      newMatches.push({
        id: `match_${index + 1}`,
        player1: pairing.player1,
        player2: pairing.player2,
        gameType
      });
    });
    
    setMatches(newMatches);
  }, [tournamentParticipants, gameType, customMatchCount]);

  // Function to generate balanced random matches with fair player distribution
  const generateBalancedRandomMatches = (participants: any[], matchCount: number) => {
    if (participants.length < 2) return [];
    
    const matches = [];
    const playerMatchCount = new Map();
    const playerLastMatch = new Map();
    
    // Initialize player match counts
    participants.forEach(player => {
      playerMatchCount.set(player.id, 0);
      playerLastMatch.set(player.id, -2);
    });
    
    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      // Create weighted pool of possible pairings
      const candidatePairings = [];
      
      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const player1 = participants[i];
          const player2 = participants[j];
          
          const player1Count = playerMatchCount.get(player1.id);
          const player2Count = playerMatchCount.get(player2.id);
          const player1LastMatch = playerLastMatch.get(player1.id);
          const player2LastMatch = playerLastMatch.get(player2.id);
          
          // Calculate fairness score (lower match counts are better)
          const countScore = Math.max(0, 10 - (player1Count + player2Count));
          
          // Calculate gap score (higher gaps from last match are better)
          const gap1 = matchIndex - player1LastMatch;
          const gap2 = matchIndex - player2LastMatch;
          const gapScore = Math.min(gap1, gap2);
          
          // Calculate weight (higher weight = more likely to be selected)
          // Good pairings get higher weights, but still allow variety
          const weight = Math.max(1, countScore + gapScore * 2);
          
          candidatePairings.push({
            player1,
            player2,
            weight
          });
        }
      }
      
      // Weighted random selection
      let selectedPairing = null;
      if (candidatePairings.length > 0) {
        const totalWeight = candidatePairings.reduce((sum, pairing) => sum + pairing.weight, 0);
        let randomValue = Math.random() * totalWeight;
        
        for (const pairing of candidatePairings) {
          randomValue -= pairing.weight;
          if (randomValue <= 0) {
            selectedPairing = pairing;
            break;
          }
        }
        
        // Fallback to last pairing if none selected
        if (!selectedPairing) {
          selectedPairing = candidatePairings[candidatePairings.length - 1];
        }
      }
      
      // Final fallback if no pairing found
      if (!selectedPairing) {
        const shuffled = [...participants].sort(() => Math.random() - 0.5);
        selectedPairing = { player1: shuffled[0], player2: shuffled[1] };
      }
      
      matches.push({
        player1: selectedPairing.player1,
        player2: selectedPairing.player2
      });
      
      // Update counts and last match indices
      const player1Id = selectedPairing.player1.id;
      const player2Id = selectedPairing.player2.id;
      playerMatchCount.set(player1Id, playerMatchCount.get(player1Id) + 1);
      playerMatchCount.set(player2Id, playerMatchCount.get(player2Id) + 1);
      playerLastMatch.set(player1Id, matchIndex);
      playerLastMatch.set(player2Id, matchIndex);
    }
    
    return matches;
  };

  const generateRoundRobinMatches = useCallback(() => {
    const newMatches: Match[] = [];
    let matchId = 1;
    
    // Generate all possible pairings
    const allPairings = [];
    for (let i = 0; i < tournamentParticipants.length; i++) {
      for (let j = i + 1; j < tournamentParticipants.length; j++) {
        allPairings.push({
          player1: tournamentParticipants[i],
          player2: tournamentParticipants[j]
        });
      }
    }
    
    // Balance match distribution to avoid consecutive matches
    const balancedMatches = balanceMatchDistribution(allPairings);
    
    balancedMatches.forEach(pairing => {
      newMatches.push({
        id: `match_${matchId}`,
        player1: pairing.player1,
        player2: pairing.player2,
        gameType
      });
      matchId++;
    });
    
    setMatches(newMatches);
  }, [tournamentParticipants, gameType]);

  // Function to balance match distribution and avoid consecutive matches
  const balanceMatchDistribution = (pairings: any[]) => {
    const balanced = [];
    const remaining = [...pairings];
    const playerLastMatch = new Map();
    
    while (remaining.length > 0) {
      let bestMatch = null;
      let bestScore = -1;
      let bestIndex = -1;
      
      // Find the pairing that minimizes consecutive matches
      for (let i = 0; i < remaining.length; i++) {
        const pairing = remaining[i];
        const player1LastMatch = playerLastMatch.get(pairing.player1.id) || -2;
        const player2LastMatch = playerLastMatch.get(pairing.player2.id) || -2;
        const currentMatch = balanced.length;
        
        // Calculate gap score (higher is better)
        const gap1 = currentMatch - player1LastMatch;
        const gap2 = currentMatch - player2LastMatch;
        const score = Math.min(gap1, gap2);
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = pairing;
          bestIndex = i;
        }
      }
      
      if (bestMatch) {
        balanced.push(bestMatch);
        playerLastMatch.set(bestMatch.player1.id, balanced.length - 1);
        playerLastMatch.set(bestMatch.player2.id, balanced.length - 1);
        remaining.splice(bestIndex, 1);
      } else {
        // Fallback: just take the first remaining match
        const fallbackMatch = remaining.shift();
        balanced.push(fallbackMatch);
        playerLastMatch.set(fallbackMatch.player1.id, balanced.length - 1);
        playerLastMatch.set(fallbackMatch.player2.id, balanced.length - 1);
      }
    }
    
    return balanced;
  };

  const generateMatches = () => {
    setIsGenerating(true);
    
    setTimeout(() => {
      if (matchType === 'random') {
        generateRandomMatches();
      } else if (matchType === 'round-robin') {
        generateRoundRobinMatches();
      } else {
        // Manual - create empty matches based on custom count
        const emptyMatches: Match[] = [];
        for (let i = 0; i < customMatchCount; i++) {
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
        return {
          ...match,
          [position]: draggedPlayer
        };
      }
      return match;
    }));

    setDraggedPlayer(null);
  };

  const updateMatchGameType = (matchId: string, newGameType: 'trump' | 'cardplus') => {
    setMatches(prev => prev.map(match => 
      match.id === matchId ? { ...match, gameType: newGameType } : match
    ));
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

  // For manual and random modes, show all players as draggable (since they can be used multiple times)
  const availablePlayers = (matchType === 'manual' || matchType === 'random') ? tournamentParticipants : tournamentParticipants.filter(player => 
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <label className="text-sm font-medium">デフォルトゲームタイプ</label>
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

              {(matchType === 'random' || matchType === 'manual') && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">試合数</label>
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={customMatchCount}
                      onChange={(e) => setCustomMatchCount(parseInt(e.target.value) || 1)}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">試合</span>
                  </div>
                </div>
              )}
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
                  draggable={matchType === 'manual' || matchType === 'random'}
                  onDragStart={(e) => handleDragStart(e, player)}
                  className={`p-3 bg-muted rounded-lg border ${
                    (matchType === 'manual' || matchType === 'random') ? 'cursor-move hover:bg-muted/80' : ''
                  } border-muted`}
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
              <CardTitle>
                対戦組み合わせ ({matches.length}試合)
                {matchType === 'random' && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (ドラッグ&ドロップで手動調整可能)
                  </span>
                )}
              </CardTitle>
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
                      <div className="flex items-center gap-2">
                        <Settings className="h-3 w-3 text-muted-foreground" />
                        <Select 
                          value={match.gameType} 
                          onValueChange={(value: 'trump' | 'cardplus') => updateMatchGameType(match.id, value)}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trump">
                              <div className="flex items-center gap-2">
                                <Spade className="h-3 w-3" />
                                トランプ
                              </div>
                            </SelectItem>
                            <SelectItem value="cardplus">
                              <div className="flex items-center gap-2">
                                <Plus className="h-3 w-3" />
                                カード+
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        className={`p-3 border-2 border-dashed rounded-lg ${
                          (matchType === 'manual' || matchType === 'random') ? 'min-h-[80px]' : ''
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
                          (matchType === 'manual' || matchType === 'random') ? 'min-h-[80px]' : ''
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

        {/* Available Players (for manual and random modes) */}
        {(matchType === 'manual' || matchType === 'random') && (
          <Card className="border-fantasy-frame shadow-soft border-info">
            <CardHeader>
              <CardTitle className="text-info">
                プレイヤー選択エリア 
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {matchType === 'random' 
                    ? '(ランダム生成後の手動調整用)' 
                    : '(同じプレイヤーを複数試合に割り当て可能)'
                  }
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {availablePlayers.map((player) => (
                  <div
                    key={`manual-${player.id}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, player)}
                    className="p-3 bg-info/10 rounded-lg border border-info cursor-move hover:bg-info/20"
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