import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Trophy, Users, Clock, CheckCircle, Loader2, MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MatchResultProps {
  onBack: () => void;
  currentUserId: string;
  matchId?: string;
}

interface Match {
  id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  table_number: number;
  match_status: string;
  player1_rating_before: number;
  player2_rating_before: number;
  created_at: string;
}

export const MatchResult = ({ onBack, currentUserId, matchId }: MatchResultProps) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState<'win' | 'loss' | null>(null);
  const { toast } = useToast();

  // Load actual match data from API
  useEffect(() => {
    const loadMatch = async () => {
      try {
        setIsLoading(true);
        
        if (!matchId) {
          throw new Error('Match ID is required');
        }
        
        const response = await fetch(`/api/matches?matchId=${matchId}`);
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const matchData = await response.json();
        
        // Convert API response to match format
        const match: Match = {
          id: matchData.match_id,
          tournament_id: matchData.tournament_id,
          player1_id: matchData.player1_id,
          player2_id: matchData.player2_id,
          player1_name: matchData.player1_name,
          player2_name: matchData.player2_name,
          table_number: parseInt(matchData.match_number) || 1,
          match_status: matchData.status,
          player1_rating_before: 1500, // TODO: Get from player data
          player2_rating_before: 1500, // TODO: Get from player data
          created_at: matchData.created_at || new Date().toISOString()
        };
        
        setMatch(match);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading match:', error);
        toast({
          title: "エラー",
          description: "対戦情報の読み込みに失敗しました",
          variant: "destructive"
        });
        setIsLoading(false);
      }
    };

    loadMatch();
  }, [matchId, toast]);

  const handleResultSubmit = (result: 'win' | 'loss') => {
    setSelectedResult(result);
    setShowConfirmDialog(true);
  };

  const handleConfirmResult = async () => {
    if (!selectedResult || !match) return;
    
    setIsSubmitting(true);
    
    try {
      const resultData = {
        match_id: match.id,
        reporter_id: currentUserId,
        result: selectedResult,
        reported_at: new Date().toISOString()
      };

      const response = await fetch('/api/matchResults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchId: match.id,
          playerId: currentUserId,
          result: selectedResult, // 'win' or 'loss'
          opponentId: match.player1_id === currentUserId ? match.player2_id : match.player1_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit result');
      }

      const result = await response.json();
      
      toast({
        title: "結果報告完了",
        description: "対戦結果を報告しました。管理者の承認をお待ちください。",
      });
      
      setShowConfirmDialog(false);
      
      // Navigate back after successful submission
      setTimeout(() => {
        onBack();
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting result:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "結果の報告に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOpponentName = () => {
    if (!match) return '';
    return match.player1_id === currentUserId ? match.player2_name : match.player1_name;
  };

  const getCurrentPlayerName = () => {
    if (!match) return '';
    return match.player1_id === currentUserId ? match.player1_name : match.player2_name;
  };

  const getCurrentPlayerRating = () => {
    if (!match) return 0;
    return match.player1_id === currentUserId ? match.player1_rating_before : match.player2_rating_before;
  };

  const getOpponentRating = () => {
    if (!match) return 0;
    return match.player1_id === currentUserId ? match.player2_rating_before : match.player1_rating_before;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">対戦情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Alert>
            <AlertDescription>
              対戦情報が見つかりません
            </AlertDescription>
          </Alert>
          <Button onClick={onBack}>戻る</Button>
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
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">対戦結果報告</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Match Info */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span>対戦情報</span>
              <Badge variant="outline">テーブル {match.table_number}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4 items-center">
              {/* Current Player */}
              <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
                <div className="font-bold text-lg text-primary">{getCurrentPlayerName()}</div>
                <div className="text-sm text-muted-foreground">{getCurrentPlayerRating()}pt</div>
                <Badge className="mt-2 bg-primary">あなた</Badge>
              </div>
              
              {/* VS */}
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">VS</div>
              </div>
              
              {/* Opponent */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <div className="font-bold text-lg">{getOpponentName()}</div>
                <div className="text-sm text-muted-foreground">{getOpponentRating()}pt</div>
                <Badge variant="secondary" className="mt-2">対戦相手</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>開始時刻: {new Date(match.created_at).toLocaleTimeString('ja-JP')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>ステータス: {match.match_status === 'in_progress' ? '対戦中' : match.match_status}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Selection */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle>対戦結果を報告してください</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col gap-2 border-green-200 hover:bg-green-50 hover:border-green-300"
                onClick={() => handleResultSubmit('win')}
              >
                <Trophy className="h-8 w-8 text-green-600" />
                <span className="font-bold text-green-700">勝利</span>
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                className="h-24 flex flex-col gap-2 border-red-200 hover:bg-red-50 hover:border-red-300"
                onClick={() => handleResultSubmit('loss')}
              >
                <Users className="h-8 w-8 text-red-600" />
                <span className="font-bold text-red-700">敗北</span>
              </Button>
            </div>

          </CardContent>
        </Card>

        {/* Information */}
        <Alert>
          <MessageSquare className="h-4 w-4" />
          <AlertDescription>
            結果を報告すると管理者に通知されます。承認後にレーティングが更新されます。
          </AlertDescription>
        </Alert>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>結果報告の確認</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-center space-y-2">
                <div className="text-lg font-bold">
                  {getCurrentPlayerName()} vs {getOpponentName()}
                </div>
                <div className="text-2xl font-bold text-primary">
                  {selectedResult === 'win' ? '勝利' : '敗北'}
                </div>
              </div>
            </div>
            
            
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                報告後の変更はできません。管理者の承認をお待ちください。
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              variant="heroic"
              onClick={handleConfirmResult}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  報告中...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  結果を報告
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};