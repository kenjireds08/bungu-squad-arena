import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, MapPin, Users, ArrowLeft, Trophy } from 'lucide-react';
import { useTournaments } from '@/hooks/useApi';
import { getTournamentForMainDashboard } from '@/utils/tournamentData';
import tapeNinja from '@/assets/tape-ninja.png';

interface TournamentEntryCompleteProps {
  onClose: () => void;
  onViewTournament: () => void;
  disableAutoTransition?: boolean;
  hideBackButton?: boolean; // QR経由の場合は戻るボタンを非表示
}

export const TournamentEntryComplete = ({ onClose, onViewTournament, disableAutoTransition = false, hideBackButton = false }: TournamentEntryCompleteProps) => {
  const [countdown, setCountdown] = useState(5);
  const { data: tournamentsData } = useTournaments();
  
  // Get the current tournament (either active or next upcoming)
  const currentTournament = getTournamentForMainDashboard(tournamentsData || []);

  useEffect(() => {
    console.log('TournamentEntryComplete: useEffect called, disableAutoTransition=', disableAutoTransition);
    
    if (disableAutoTransition) {
      console.log('TournamentEntryComplete: Auto transition disabled');
      return;
    }
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        console.log('TournamentEntryComplete: Countdown tick, current value:', prev);
        if (prev <= 1) {
          console.log('TournamentEntryComplete: Countdown reached 0, calling onViewTournament');
          clearInterval(timer);
          onViewTournament(); // 自動的に待機画面へ遷移
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('TournamentEntryComplete: Cleanup timer');
      clearInterval(timer);
    };
  }, [onViewTournament, disableAutoTransition]);

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {!hideBackButton && (
              <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                戻る
              </Button>
            )}
            {hideBackButton && <div />} {/* Spacer for layout */}
            <h1 className="text-lg font-bold text-foreground">エントリー完了</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Success Message */}
        <Card className="border-success shadow-golden animate-fade-in text-center">
          <CardContent className="pt-8 pb-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-success animate-bounce-gentle" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-success mb-2">エントリー完了！</h2>
                <p className="text-muted-foreground mb-3">
                  大会への参加登録が完了しました
                </p>
                <div className="bg-info/10 px-4 py-2 rounded-lg border border-info/20">
                  <p className="text-sm text-info">
                    {countdown}秒後に待機画面に移動します
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Details */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-primary" />
              大会詳細
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentTournament ? (
              <>
                <div>
                  <h3 className="font-bold text-lg mb-2">{currentTournament.name}</h3>
                  <Badge variant="outline" className="mb-3">
                    トランプルール・カードプラスルール両対応
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-info mt-0.5" />
                    <div>
                      <p className="font-medium">{currentTournament.date}</p>
                      <p className="text-sm text-muted-foreground">{currentTournament.time}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium">開催場所</p>
                      <p className="text-sm text-muted-foreground">{currentTournament.location}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium">参加者状況</p>
                      <p className="text-sm text-muted-foreground">
                        現在の参加者: {currentTournament.participants}名
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">大会情報を読み込み中...</p>
              </div>
            )}
          </CardContent>
        </Card>


        {/* Auto-transition info */}
        <Card className="border-primary/20 bg-primary/5 shadow-soft animate-slide-up">
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                このまま待機画面で組み合わせの発表をお待ちください
              </p>
              <div className="w-full bg-muted rounded-full h-2 mb-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                待機画面でランキング・ルール・計算方式が確認できます
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Manual navigation button */}
        <Card className="border-primary/20 bg-primary/5 shadow-soft animate-slide-up">
          <CardContent className="pt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                自動で画面が切り替わらない場合は、下のボタンをタップしてください
              </p>
              <Button 
                onClick={onViewTournament}
                variant="outline"
                size="lg"
                className="w-full"
              >
                待機画面に移動
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};