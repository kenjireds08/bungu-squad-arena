import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import pencilWarrior from '@/assets/pencil-warrior.png';

interface MatchCountdownProps {
  onClose: () => void;
  onStartMatch: () => void;
}

export const MatchCountdown = ({ onClose, onStartMatch }: MatchCountdownProps) => {
  const [countdown, setCountdown] = useState(10);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning || countdown <= 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isRunning]);

  useEffect(() => {
    if (countdown === 0) {
      onStartMatch();
    }
  }, [countdown, onStartMatch]);

  const handleToggle = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setCountdown(10);
    setIsRunning(true);
  };

  const getCountdownColor = () => {
    if (countdown <= 3) return 'text-destructive';
    if (countdown <= 6) return 'text-primary';
    return 'text-success';
  };

  const getCountdownScale = () => {
    if (countdown <= 3) return 'scale-110';
    return 'scale-100';
  };

  return (
    <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
      <div className="container mx-auto px-4">
        <Card className="border-fantasy-frame shadow-golden animate-scale-in max-w-md mx-auto">
          <CardContent className="pt-8 pb-8">
            <div className="text-center space-y-8">
              {/* Character */}
              <div className="flex justify-center">
                <img 
                  src={pencilWarrior} 
                  alt="Pencil Warrior ready for battle" 
                  className="w-24 h-24 object-contain animate-bounce-gentle"
                />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">対戦開始</h1>
                <p className="text-muted-foreground">準備はよろしいですか？</p>
              </div>

              {/* Countdown */}
              <div className="space-y-4">
                <div className={`text-8xl font-bold transition-all duration-300 ${getCountdownColor()} ${getCountdownScale()}`}>
                  {countdown > 0 ? countdown : '0'}
                </div>
                
                {countdown > 0 ? (
                  <p className="text-lg text-muted-foreground">
                    {countdown <= 3 ? '準備完了！' : '秒後に開始'}
                  </p>
                ) : (
                  <p className="text-lg font-bold text-success animate-pulse">
                    対戦開始！
                  </p>
                )}
              </div>

              {/* Controls */}
              {countdown > 0 && (
                <div className="flex justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleToggle}
                    className="flex items-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-4 w-4" />
                        一時停止
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        再開
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReset}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    リセット
                  </Button>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
                <h3 className="font-medium">対戦時の注意事項</h3>
                <ul className="text-left text-muted-foreground space-y-1">
                  <li>• 制限時間：30分</li>
                  <li>• 試合終了後は結果を報告してください</li>
                  <li>• 不明な点は管理者にお声がけください</li>
                </ul>
              </div>

              {/* Cancel Button */}
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="w-full"
              >
                キャンセル
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};