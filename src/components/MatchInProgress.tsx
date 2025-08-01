import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Swords, Clock, Flag } from 'lucide-react';
import { MatchResult } from './MatchResult';

interface MatchInProgressProps {
  onClose: () => void;
  onFinishMatch: () => void;
  currentUserId?: string;
  matchId?: string;
}

interface MatchData {
  match_id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  game_type: 'trump' | 'cardplus';
  status: string;
  match_number: string;
  created_at: string;
}

export const MatchInProgress = ({ onClose, onFinishMatch, currentUserId, matchId }: MatchInProgressProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load match data
  useEffect(() => {
    const loadMatchData = async () => {
      try {
        if (!matchId) return;
        
        const response = await fetch(`/api/matches?matchId=${matchId}`);
        if (response.ok) {
          const data = await response.json();
          setMatchData(data);
        }
      } catch (error) {
        console.error('Error loading match data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadMatchData();
  }, [matchId]);

  useEffect(() => {
    if (!matchData) return;
    
    const startTime = new Date(matchData.created_at);
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [matchData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinishMatch = () => {
    setShowResultScreen(true);
  };

  const handleResultBack = () => {
    setShowResultScreen(false);
    onFinishMatch();
  };

  // Show result screen if triggered
  if (showResultScreen) {
    return (
      <MatchResult 
        onBack={handleResultBack}
        currentUserId={currentUserId || ''}
        matchId={matchId}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Swords className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">対戦中</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Match Status */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Battle Icon */}
              <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <Swords className="h-10 w-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">⚔️ 対戦中</h2>
                <p className="text-lg">
                  {matchData ? (
                    <>
                      <span className="text-primary font-bold">
                        {matchData.player1_id === currentUserId ? matchData.player1_name : matchData.player2_name}
                      </span>
                      <span> vs </span>
                      <span>
                        {matchData.player1_id === currentUserId ? matchData.player2_name : matchData.player1_name}
                      </span>
                    </>
                  ) : (
                    '読み込み中...'
                  )}
                </p>
                <div className="text-sm text-muted-foreground">
                  {matchData ? (
                    `${matchData.match_number.replace('match_', '')}試合目 • ${matchData.game_type === 'trump' ? 'トランプルール' : 'カード+ルール'}`
                  ) : (
                    '読み込み中...'
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timer */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span className="text-sm">対戦時間</span>
              </div>
              
              <div className="text-4xl font-mono font-bold text-primary">
                {formatTime(elapsedTime)}
              </div>
              
              <div className="text-xs text-muted-foreground">
                開始時刻: {matchData ? new Date(matchData.created_at).toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : '--:--'}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Finish Match Button */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Button 
                variant="fantasy" 
                size="xl" 
                onClick={handleFinishMatch}
                className="w-full max-w-xs mx-auto"
                disabled={isLoading || !matchData}
              >
                <Flag className="h-5 w-5" />
                試合終了・結果報告
              </Button>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>💡 試合が終わったら上のボタンを押して</p>
                <p>　 結果を報告してください</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Tips */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-sm">ゲーム中のポイント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• フェアプレイを心がけましょう</p>
              <p>• ルールに迷った時は管理者にお声がけください</p>
              <p>• 楽しく対戦しましょう！</p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};