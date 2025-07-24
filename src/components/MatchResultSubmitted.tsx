import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, Clock, Home, BarChart3 } from 'lucide-react';

interface MatchResultSubmittedProps {
  onClose: () => void;
  result: 'win' | 'lose';
}

// Mock submitted result data
const mockSubmission = {
  opponent: "田中さん",
  result: "win", // This would be dynamic based on props
  ratingChange: "+18",
  submittedAt: new Date(),
  estimatedApprovalTime: "5〜10分"
};

export const MatchResultSubmitted = ({ onClose, result }: MatchResultSubmittedProps) => {
  const isWin = result === 'win';

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
              <CheckCircle className="h-6 w-6 text-success" />
              <h1 className="text-xl font-bold text-foreground">報告完了</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Success Message */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Success Icon */}
              <div className="w-20 h-20 mx-auto bg-success/20 rounded-full flex items-center justify-center animate-bounce-gentle">
                <CheckCircle className="h-10 w-10 text-success" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-success">✅ 報告完了！</h2>
                <p className="text-muted-foreground">
                  管理者の承認をお待ちください
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Result Summary */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-center">申告内容</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="text-lg">
                {mockSubmission.opponent} vs あなた
              </div>
              
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted-foreground">結果:</span>
                <Badge 
                  variant={isWin ? "default" : "destructive"}
                  className={`text-lg px-4 py-1 ${isWin ? 'bg-success' : ''}`}
                >
                  あなたの{isWin ? '勝利' : '敗北'}
                </Badge>
              </div>

              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-1">予想レート変動</div>
                <div className={`text-2xl font-bold ${isWin ? 'text-success' : 'text-destructive'}`}>
                  {mockSubmission.ratingChange}pt
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  承認後に確定します
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Information */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center">
                  <Clock className="h-4 w-4 text-warning" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">承認待ち</div>
                  <div className="text-sm text-muted-foreground">
                    申告時刻: {mockSubmission.submittedAt.toLocaleTimeString('ja-JP')}
                  </div>
                </div>
                <Badge variant="outline" className="text-warning border-warning">
                  処理中
                </Badge>
              </div>

              <div className="bg-info/10 border border-info/20 rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium text-info mb-1">📊 承認後にレーティングが更新されます</div>
                  <div className="text-muted-foreground text-xs">
                    通常 {mockSubmission.estimatedApprovalTime} 程度で承認されます
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <Button 
            variant="fantasy" 
            size="lg" 
            className="w-full"
            onClick={onClose}
          >
            <Home className="h-5 w-5" />
            メイン画面に戻る
          </Button>
          
          <Button 
            variant="outline" 
            size="lg" 
            className="w-full"
            onClick={onClose}
          >
            <BarChart3 className="h-5 w-5" />
            ランキングを確認
          </Button>
        </div>

        {/* Celebration Characters */}
        <div className="text-center py-4 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="text-xs text-muted-foreground">
            {isWin ? 
              "🎉 おめでとうございます！鉛筆戦士とはさみ戦士があなたの勝利を祝福しています！" :
              "💪 次回頑張りましょう！消しゴム重装兵があなたを応援しています！"
            }
          </div>
        </div>
      </main>
    </div>
  );
};