import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Users, Shuffle, Grid3X3, Hand, Play, Spade, Plus, Loader2, Settings, Hash, Check, ChevronsUpDown, X } from 'lucide-react';
import { usePlayers } from '@/hooks/useApi';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [openPlayerSelects, setOpenPlayerSelects] = useState<Record<string, boolean>>({});

  // Filter active tournament participants
  const tournamentParticipants = players.filter(p => p.tournament_active).slice(0, 20);

  // Calculate match count for each player
  const playerMatchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tournamentParticipants.forEach(player => {
      counts[player.id] = 0;
    });

    matches.forEach(match => {
      if (match.player1?.id) {
        counts[match.player1.id] = (counts[match.player1.id] || 0) + 1;
      }
      if (match.player2?.id) {
        counts[match.player2.id] = (counts[match.player2.id] || 0) + 1;
      }
    });

    return counts;
  }, [matches, tournamentParticipants]);

  // Calculate average matches per player
  const averageMatchCount = useMemo(() => {
    if (tournamentParticipants.length === 0 || matches.length === 0) return 0;
    const totalSlots = matches.length * 2;
    return totalSlots / tournamentParticipants.length;
  }, [matches.length, tournamentParticipants.length]);

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
      playerLastMatch.set(player.id, -999);
    });

    for (let matchIndex = 0; matchIndex < matchCount; matchIndex++) {
      const candidatePairings = [];

      for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
          const player1 = participants[i];
          const player2 = participants[j];

          const player1Count = playerMatchCount.get(player1.id);
          const player2Count = playerMatchCount.get(player2.id);
          const player1LastMatch = playerLastMatch.get(player1.id);
          const player2LastMatch = playerLastMatch.get(player2.id);

          const gap1 = matchIndex - player1LastMatch;
          const gap2 = matchIndex - player2LastMatch;

          if (gap1 <= 1 || gap2 <= 1) {
            continue;
          }

          const countScore = Math.max(0, 10 - (player1Count + player2Count));
          const gapScore = Math.min(gap1, gap2);
          const weight = Math.max(1, countScore + gapScore * 2);

          candidatePairings.push({
            player1,
            player2,
            weight
          });
        }
      }

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

        if (!selectedPairing) {
          selectedPairing = candidatePairings[candidatePairings.length - 1];
        }
      }

      if (!selectedPairing) {
        for (let i = 0; i < participants.length; i++) {
          for (let j = i + 1; j < participants.length; j++) {
            const player1 = participants[i];
            const player2 = participants[j];
            const gap1 = matchIndex - (playerLastMatch.get(player1.id) || -999);
            const gap2 = matchIndex - (playerLastMatch.get(player2.id) || -999);

            if (gap1 > 1 || gap2 > 1) {
              selectedPairing = { player1, player2 };
              break;
            }
          }
          if (selectedPairing) break;
        }

        if (!selectedPairing) {
          selectedPairing = {
            player1: participants[0],
            player2: participants[1]
          };
        }
      }

      if (selectedPairing) {
        matches.push(selectedPairing);
        playerMatchCount.set(selectedPairing.player1.id, (playerMatchCount.get(selectedPairing.player1.id) || 0) + 1);
        playerMatchCount.set(selectedPairing.player2.id, (playerMatchCount.get(selectedPairing.player2.id) || 0) + 1);
        playerLastMatch.set(selectedPairing.player1.id, matchIndex);
        playerLastMatch.set(selectedPairing.player2.id, matchIndex);
      }
    }

    return matches;
  };

  const generateRoundRobinMatches = useCallback(() => {
    const newMatches: Match[] = [];
    const participants = [...tournamentParticipants];
    let matchIndex = 0;

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        newMatches.push({
          id: `match_${matchIndex + 1}`,
          player1: participants[i],
          player2: participants[j],
          gameType
        });
        matchIndex++;
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

    // Validate that no match has the same player in both slots
    const invalidMatches = matches.filter(match =>
      match.player1 && match.player2 && match.player1.id === match.player2.id
    );

    if (invalidMatches.length > 0) {
      toast({
        title: "エラー",
        description: "同じプレイヤーが両方のスロットに選択されている試合があります",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsGenerating(true);

      const existingMatchesResponse = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      const existingMatches = existingMatchesResponse.ok ? await existingMatchesResponse.json() : [];

      if (existingMatches.length > 0) {
        const appendPromises = matches.map(async (match) => {
          const matchData = {
            player1_id: match.player1?.id,
            player2_id: match.player2?.id,
            game_type: match.gameType || 'trump',
          };

          return fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'saveTournamentMatches',
              tournamentId: tournamentId,
              matches: [matchData],
            }),
          });
        });

        await Promise.all(appendPromises);

        toast({
          title: "試合を追加しました",
          description: `${matches.length}試合を既存の組み合わせに追加しました。`
        });
      } else {
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

        toast({
          title: "組み合わせが確定しました",
          description: `${result.matchCount}試合の組み合わせを保存しました。参加者にプッシュ通知を送信しました。`
        });
      }

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

  const updateMatchPlayer = (matchId: string, position: 'player1' | 'player2', player: any) => {
    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          [position]: player
        };
      }
      return match;
    }));
  };

  const clearMatchPlayer = (matchId: string, position: 'player1' | 'player2') => {
    setMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          [position]: null
        };
      }
      return match;
    }));
  };

  const updateMatchGameType = (matchId: string, newGameType: 'trump' | 'cardplus') => {
    setMatches(prev => prev.map(match =>
      match.id === matchId ? { ...match, gameType: newGameType } : match
    ));
  };

  const getPlayerBadges = (player: any) => {
    const badges = [];
    const championBadges = player.champion_badges || '';

    if (championBadges.includes('🥇')) {
      badges.push(<Badge key="gold" variant="default" className="text-xs bg-yellow-500">🥇</Badge>);
    }
    if (championBadges.includes('🥈')) {
      badges.push(<Badge key="silver" variant="default" className="text-xs bg-gray-400">🥈</Badge>);
    }
    if (championBadges.includes('🥉')) {
      badges.push(<Badge key="bronze" variant="default" className="text-xs bg-orange-600">🥉</Badge>);
    }

    if (championBadges.includes('♠️')) {
      badges.push(<Badge key="trump" variant="secondary" className="text-xs"><Spade className="h-3 w-3 mr-1" />トランプ</Badge>);
    }
    if (championBadges.includes('➕') || championBadges.includes('+')) {
      badges.push(<Badge key="cardplus" variant="secondary" className="text-xs"><Plus className="h-3 w-3 mr-1" />カード+</Badge>);
    }

    return badges;
  };

  const getMatchCountColor = (count: number) => {
    if (count === 0) return 'text-muted-foreground';
    if (count < averageMatchCount) return 'text-green-600';
    if (count > averageMatchCount) return 'text-orange-600';
    return 'text-blue-600';
  };

  const PlayerSelector = ({ matchId, position }: { matchId: string, position: 'player1' | 'player2' }) => {
    const match = matches.find(m => m.id === matchId);
    const selectedPlayer = match?.[position];
    const oppositePosition = position === 'player1' ? 'player2' : 'player1';
    const oppositePlayer = match?.[oppositePosition];
    const selectKey = `${matchId}-${position}`;
    const isOpen = openPlayerSelects[selectKey] || false;

    return (
      <Popover open={isOpen} onOpenChange={(open) => setOpenPlayerSelects(prev => ({ ...prev, [selectKey]: open }))}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className={cn(
              "w-full justify-between h-auto min-h-[60px] p-2 text-xs",
              !selectedPlayer && "text-muted-foreground border-dashed"
            )}
          >
            {selectedPlayer ? (
              <div className="flex flex-col items-start gap-0.5 w-full">
                <p className="font-medium text-left text-sm">{selectedPlayer.nickname}</p>
                <p className="text-xs text-muted-foreground">{selectedPlayer.current_rating}pt</p>
              </div>
            ) : (
              <span className="text-center w-full text-xs">{position === 'player1' ? 'P1' : 'P2'}</span>
            )}
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="プレイヤーを検索..." className="h-9" />
            <CommandEmpty>プレイヤーが見つかりません</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {selectedPlayer && (
                <CommandItem
                  key="clear"
                  onSelect={() => {
                    clearMatchPlayer(matchId, position);
                    setOpenPlayerSelects(prev => ({ ...prev, [selectKey]: false }));
                  }}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  クリア
                </CommandItem>
              )}
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b">
                平均: {averageMatchCount.toFixed(1)}試合/人
              </div>
              {tournamentParticipants.map((player) => {
                const matchCount = playerMatchCounts[player.id] || 0;
                const isOpponentPlayer = oppositePlayer?.id === player.id;
                return (
                  <CommandItem
                    key={player.id}
                    value={`${player.nickname} ${player.id}`}
                    disabled={isOpponentPlayer}
                    onSelect={() => {
                      if (isOpponentPlayer) return;
                      updateMatchPlayer(matchId, position, player);
                      setOpenPlayerSelects(prev => ({ ...prev, [selectKey]: false }));
                    }}
                    className={cn(isOpponentPlayer && "opacity-50 cursor-not-allowed")}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedPlayer?.id === player.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{player.nickname}</span>
                        <span className="text-xs text-muted-foreground">{player.current_rating}pt</span>
                      </div>
                      <Badge variant="outline" className={cn("text-xs", getMatchCountColor(matchCount))}>
                        {matchCount}試合
                        {isOpponentPlayer && " (対戦相手)"}
                      </Badge>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-parchment pb-20">
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

        {/* Participants Info */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader>
            <CardTitle>参加者一覧 ({tournamentParticipants.length}名)</CardTitle>
          </CardHeader>
          <CardContent>
            {tournamentParticipants.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                エントリー済みの参加者がいません
              </p>
            ) : (
              <div className="space-y-2">
                {matches.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    平均試合数: {averageMatchCount.toFixed(1)}試合/人
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {tournamentParticipants.map((player) => {
                    const matchCount = playerMatchCounts[player.id] || 0;
                    return (
                      <div
                        key={player.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-muted/50 rounded text-xs"
                      >
                        <span className="font-medium">{player.nickname}</span>
                        {matches.length > 0 && (
                          <Badge variant="outline" className={cn("text-xs h-4 px-1", getMatchCountColor(matchCount))}>
                            {matchCount}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matches */}
        {matches.length > 0 && (
          <Card className="border-fantasy-frame shadow-soft">
            <CardHeader>
              <div className="space-y-3">
                <CardTitle>
                  対戦組み合わせ ({matches.length}試合)
                  <div className="text-sm font-normal text-muted-foreground mt-1">
                    (タップして選択)
                  </div>
                </CardTitle>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="heroic"
                      className="w-full"
                      size="lg"
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {matches.map((match) => (
                  <div key={match.id} className="p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">試合 {match.id.split('_')[1]}</span>
                      <Select
                        value={match.gameType}
                        onValueChange={(value: 'trump' | 'cardplus') => updateMatchGameType(match.id, value)}
                      >
                        <SelectTrigger className="w-28 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trump">
                            <div className="flex items-center gap-1">
                              <Spade className="h-3 w-3" />
                              <span className="text-xs">トランプ</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="cardplus">
                            <div className="flex items-center gap-1">
                              <Plus className="h-3 w-3" />
                              <span className="text-xs">カード+</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                      <PlayerSelector matchId={match.id} position="player1" />
                      <div className="text-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-gold flex items-center justify-center">
                          <span className="text-xs font-bold text-white">VS</span>
                        </div>
                      </div>
                      <PlayerSelector matchId={match.id} position="player2" />
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
