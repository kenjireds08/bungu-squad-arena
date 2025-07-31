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

// Mock match data
const mockMatch = {
  opponent: "田中さん",
  table: "卓2",
  rule: "カードプラスルール",
  startTime: new Date(Date.now() - 15 * 60 * 1000) // 15 minutes ago
};

export const MatchInProgress = ({ onClose, onFinishMatch, currentUserId, matchId }: MatchInProgressProps) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showResultScreen, setShowResultScreen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - mockMatch.startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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
                <p className="text-lg">あなた vs {mockMatch.opponent}</p>
                <div className="text-sm text-muted-foreground">
                  {mockMatch.table} • {mockMatch.rule}
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
                開始時刻: {mockMatch.startTime.toLocaleTimeString('ja-JP', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
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