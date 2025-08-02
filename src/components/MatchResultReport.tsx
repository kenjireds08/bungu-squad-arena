import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trophy, Frown, Send, AlertCircle, XOctagon } from 'lucide-react';

interface MatchResultReportProps {
  onClose: () => void;
  onSubmitResult: (result: 'win' | 'lose' | 'invalid') => void;
  match?: {
    opponent: string;
    opponentRating: number;
    table?: string;
    rule: string;
    matchId: string;
  };
}

export const MatchResultReport = ({ onClose, onSubmitResult, match }: MatchResultReportProps) => {
  const [selectedResult, setSelectedResult] = useState<'win' | 'lose' | 'invalid' | null>(null);
  
  // Use provided match data or fallback to mock data
  const displayMatch = match || {
    opponent: "田中さん",
    opponentRating: 1620,
    table: "卓2",
    rule: "カードプラスルール",
    matchId: "mock-match"
  };

  const handleSubmit = () => {
    if (selectedResult) {
      onSubmitResult(selectedResult);
    }
  };

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
              <Send className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">試合結果の報告</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Match Summary */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-center">📝 試合結果の報告</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-lg">あなた vs <span className="font-semibold">{displayMatch.opponent}</span></div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>対戦相手レート: {displayMatch.opponentRating}pt</div>
                <div>ルール: {displayMatch.rule}</div>
                {displayMatch.table && <div>卓: {displayMatch.table}</div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Selection */}
        <Card className="border-fantasy-frame shadow-golden animate-slide-up">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-foreground">あなたの結果は？</h2>
                <p className="text-sm text-muted-foreground">正しい結果を選択してください</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={selectedResult === 'win' ? 'fantasy' : 'outline'}
                    size="xl"
                    className="h-24 flex-col space-y-2"
                    onClick={() => setSelectedResult('win')}
                  >
                    <Trophy className="h-8 w-8" />
                    <span className="text-lg font-bold">勝った</span>
                  </Button>

                  <Button
                    variant={selectedResult === 'lose' ? 'destructive' : 'outline'}
                    size="xl"
                    className="h-24 flex-col space-y-2"
                    onClick={() => setSelectedResult('lose')}
                  >
                    <Frown className="h-8 w-8" />
                    <span className="text-lg font-bold">負けた</span>
                  </Button>
                </div>

                <Button
                  variant={selectedResult === 'invalid' ? 'secondary' : 'outline'}
                  size="lg"
                  className="w-full flex items-center gap-2"
                  onClick={() => setSelectedResult('invalid')}
                >
                  <XOctagon className="h-5 w-5" />
                  <span className="font-bold">無効試合として報告</span>
                </Button>
              </div>

              {/* Rating Preview */}
              {selectedResult && (
                <div className="bg-muted/30 rounded-lg p-4 animate-fade-in">
                  {selectedResult === 'invalid' ? (
                    <div>
                      <div className="text-sm font-medium mb-2">無効試合について</div>
                      <div className="text-lg font-bold text-muted-foreground">
                        レート変動なし
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ※無効試合はレーティング計算に含まれません
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-medium mb-2">予想レート変動</div>
                      <div className={`text-lg font-bold ${selectedResult === 'win' ? 'text-success' : 'text-destructive'}`}>
                        {selectedResult === 'win' ? '+' : ''}
                        {selectedResult === 'win' ? '18' : '-12'}pt
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ※管理者承認後に確定します
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          variant="heroic" 
          size="xl" 
          className="w-full animate-slide-up"
          style={{ animationDelay: '200ms' }}
          disabled={!selectedResult}
          onClick={handleSubmit}
        >
          <Send className="h-5 w-5" />
          申告する
        </Button>

        {/* Important Notice */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '300ms' }}>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <div className="font-medium text-info">重要な注意事項</div>
                <ul className="space-y-1 text-muted-foreground text-xs">
                  <li>• 正確な結果を報告してください</li>
                  <li>• 管理者が確認・承認後にレーティングが更新されます</li>
                  <li>• 間違いがあった場合は管理者にお声がけください</li>
                  <li>• 対戦相手も同じ結果を報告する必要があります</li>
                  <li>• 無効試合：体調不良・ルール違反・外的要因等で正常な試合ができなかった場合</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};