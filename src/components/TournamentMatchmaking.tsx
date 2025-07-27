import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Users, Shuffle, Brain, Edit3, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';

interface TournamentMatchmakingProps {
  onBack: () => void;
  tournamentId: string;
}

interface Player {
  id: string;
  nickname: string;
  current_rating: number;
  tournament_active: boolean;
}

interface Match {
  id: string;
  player1: Player;
  player2: Player;
  tableNumber: number;
}

type MatchMode = 'random' | 'rating' | 'manual';

export const TournamentMatchmaking = ({ onBack, tournamentId }: TournamentMatchmakingProps) => {
  const [matchMode, setMatchMode] = useState<MatchMode>('random');
  const [activePlayers, setActivePlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const { data: rankings, isLoading } = useRankings();
  const { toast } = useToast();

  useEffect(() => {
    if (rankings) {
      // Filter only active tournament players
      const active = rankings.filter(player => player.tournament_active === true);
      setActivePlayers(active);
    }
  }, [rankings]);

  const generateRandomMatches = (players: Player[]): Match[] => {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const newMatches: Match[] = [];
    
    for (let i = 0; i < shuffled.length - 1; i += 2) {
      newMatches.push({
        id: `match-${i / 2 + 1}`,
        player1: shuffled[i],
        player2: shuffled[i + 1],
        tableNumber: Math.floor(i / 2) + 1
      });
    }
    
    return newMatches;
  };

  const generateRatingBasedMatches = (players: Player[]): Match[] => {
    // Sort by rating (similar ratings play together)
    const sorted = [...players].sort((a, b) => b.current_rating - a.current_rating);
    const newMatches: Match[] = [];
    
    for (let i = 0; i < sorted.length - 1; i += 2) {
      newMatches.push({
        id: `match-${i / 2 + 1}`,
        player1: sorted[i],
        player2: sorted[i + 1],
        tableNumber: Math.floor(i / 2) + 1
      });
    }
    
    return newMatches;
  };

  const handleGenerateMatches = () => {
    if (activePlayers.length < 2) {
      toast({
        title: "エラー",
        description: "組み合わせを作成するには最低2名の参加者が必要です",
        variant: "destructive"
      });
      return;
    }

    if (activePlayers.length % 2 !== 0) {
      toast({
        title: "警告",
        description: "参加者が奇数のため、1名が待機となります",
        variant: "default"
      });
    }

    let newMatches: Match[] = [];
    
    switch (matchMode) {
      case 'random':
        newMatches = generateRandomMatches(activePlayers);
        break;
      case 'rating':
        newMatches = generateRatingBasedMatches(activePlayers);
        break;
      case 'manual':
        // TODO: Implement manual matching UI
        toast({
          title: "未実装",
          description: "手動組み合わせ機能は準備中です",
          variant: "default"
        });
        return;
    }

    setMatches(newMatches);
    setShowConfirmDialog(true);
  };

  const handleConfirmMatches = async () => {
    setIsGenerating(true);
    
    try {
      // Step 1: Ensure TournamentMatches sheet exists
      const sheetResponse = await fetch('/api/tournament-system?action=create-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!sheetResponse.ok) {
        const errorData = await sheetResponse.json();
        // Only throw error if it's not "sheet already exists"
        if (!errorData.error?.includes('already exists')) {
          throw new Error(errorData.error || 'Failed to create sheet');
        }
      }

      // Step 2: Save matches
      const response = await fetch('/api/tournament-system?action=save-matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tournamentId,
          matches: matches
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save matches');
      }

      const result = await response.json();
      
      toast({
        title: "組み合わせ確定",
        description: `${matches.length}組の対戦を作成しました`,
      });
      
      setShowConfirmDialog(false);
      
      // Navigate back after successful save
      setTimeout(() => {
        onBack();
      }, 1000);
      
    } catch (error) {
      console.error('Error saving matches:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "組み合わせの保存に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwapPlayers = (matchId: string) => {
    setMatches(prevMatches => 
      prevMatches.map(match => {
        if (match.id === matchId) {
          return {
            ...match,
            player1: match.player2,
            player2: match.player1
          };
        }
        return match;
      })
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-xl font-bold text-foreground">組み合わせ決定</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Active Players Overview */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>エントリー済みプレイヤー</span>
              <Badge variant="secondary">{activePlayers.length}名</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {activePlayers.map(player => (
                <div key={player.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <span className="text-sm font-medium">{player.nickname}</span>
                  <Badge variant="outline" className="text-xs">
                    {player.current_rating}pt
                  </Badge>
                </div>
              ))}
            </div>
            
            {activePlayers.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  まだエントリーしたプレイヤーがいません
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Matchmaking Settings */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle>組み合わせ設定</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>対戦方式</Label>
              <Select value={matchMode} onValueChange={(value) => setMatchMode(value as MatchMode)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">
                    <div className="flex items-center gap-2">
                      <Shuffle className="h-4 w-4" />
                      <span>ランダム</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="rating">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      <span>レーティング考慮</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manual">
                    <div className="flex items-center gap-2">
                      <Edit3 className="h-4 w-4" />
                      <span>手動設定</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <p className="text-xs text-muted-foreground">
                {matchMode === 'random' && 'プレイヤーをランダムに組み合わせます'}
                {matchMode === 'rating' && '近いレーティングのプレイヤー同士で対戦します'}
                {matchMode === 'manual' && '管理者が手動で組み合わせを設定します'}
              </p>
            </div>

            <Button 
              variant="heroic" 
              className="w-full"
              onClick={handleGenerateMatches}
              disabled={activePlayers.length < 2}
            >
              <Shuffle className="h-4 w-4 mr-2" />
              組み合わせを生成
            </Button>
          </CardContent>
        </Card>

        {/* Generated Matches Preview */}
        {matches.length > 0 && (
          <Card className="border-fantasy-frame shadow-golden animate-slide-up">
            <CardHeader className="pb-3">
              <CardTitle>生成された組み合わせ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {matches.map((match, index) => (
                <div key={match.id} className="p-3 bg-muted/30 rounded-lg border border-fantasy-frame/20">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">テーブル {match.tableNumber}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSwapPlayers(match.id)}
                    >
                      <Shuffle className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="text-right">
                      <div className="font-medium">{match.player1.nickname}</div>
                      <div className="text-xs text-muted-foreground">{match.player1.current_rating}pt</div>
                    </div>
                    <div className="text-center text-lg font-bold text-primary">VS</div>
                    <div className="text-left">
                      <div className="font-medium">{match.player2.nickname}</div>
                      <div className="text-xs text-muted-foreground">{match.player2.current_rating}pt</div>
                    </div>
                  </div>
                </div>
              ))}

              {activePlayers.length % 2 !== 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    待機: {activePlayers[activePlayers.length - 1]?.nickname}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>組み合わせを確定しますか？</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {matches.length}組の対戦を作成します。
              確定後は参加者に通知され、対戦が開始されます。
            </p>
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                確定後の変更は管理画面から個別に行ってください
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isGenerating}
            >
              キャンセル
            </Button>
            <Button
              variant="heroic"
              onClick={handleConfirmMatches}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  確定中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  確定する
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};