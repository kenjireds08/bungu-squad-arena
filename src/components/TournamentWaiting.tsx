import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Users, 
  Trophy, 
  ExternalLink, 
  Calculator,
  Clock,
  Table,
  AlertCircle
} from 'lucide-react';
import tapeNinja from '@/assets/tape-ninja.png';

interface TournamentWaitingProps {
  onClose: () => void;
  onViewRanking: () => void;
}

const mockTournament = {
  name: "第8回BUNGU SQUAD大会",
  date: "2025年8月15日（木）",
  time: "19:00〜21:30",
  location: "○○コミュニティセンター 2F会議室",
  participants: 12,
  maxParticipants: 16,
};

// 組み合わせが決まっているかのフラグ（実際はAPIから取得）
const isPairingDecided = false;

export const TournamentWaiting = ({ onClose, onViewRanking }: TournamentWaitingProps) => {
  const [showRatingDialog, setShowRatingDialog] = useState(false);

  const handleCheckPairing = () => {
    if (!isPairingDecided) {
      // まだ組み合わせが決まっていない場合の処理
      console.log("組み合わせがまだ決まっていません");
    } else {
      // 組み合わせが決まっている場合、対戦詳細を表示
      console.log("対戦詳細を表示");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <h1 className="text-lg font-bold text-foreground">大会待機中</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Status */}
        <Card className="border-info shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Clock className="h-5 w-5" />
              大会エントリー完了
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">{mockTournament.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {mockTournament.date} {mockTournament.time}
              </p>
              <Badge variant="outline">
                参加者 {mockTournament.participants}/{mockTournament.maxParticipants}名
              </Badge>
            </div>
            
            <div className="bg-info/10 p-4 rounded-lg border border-info/20">
              <p className="text-sm text-info font-medium">
                組み合わせ抽選をお待ちください
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                管理者が全参加者の確認後、対戦組み合わせを決定します
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* 組み合わせ確認ボタン */}
          <Button 
            onClick={handleCheckPairing}
            className="w-full"
            size="lg"
            variant={isPairingDecided ? "default" : "outline"}
            disabled={!isPairingDecided}
          >
            <Table className="h-5 w-5 mr-2" />
            {isPairingDecided ? "対戦組み合わせを確認" : "組み合わせはまだ決まっていません"}
          </Button>

          {!isPairingDecided && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              しばらくお待ちください
            </div>
          )}

          {/* ランキング確認ボタン */}
          <Button 
            variant="outline"
            onClick={onViewRanking}
            className="w-full"
            size="lg"
          >
            <Trophy className="h-5 w-5 mr-2" />
            現在のランキングを確認
          </Button>

          {/* ルール説明リンク */}
          <Button 
            variant="outline"
            onClick={() => window.open('https://note.com/bungu_squad/n/n33ebd47af3ba', '_blank')}
            className="w-full"
            size="lg"
          >
            <ExternalLink className="h-5 w-5 mr-2" />
            ゲームルールを確認
          </Button>

          {/* レーティング計算方式の説明 */}
          <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Calculator className="h-5 w-5 mr-2" />
                レーティング計算方式について
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>レーティング計算方式</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">基本システム</h4>
                  <p className="text-sm text-muted-foreground">
                    BUNGU SQUADでは、イロレーティングシステムを採用しています。
                  </p>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">ポイント変動</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 勝利時：対戦相手のレートに応じてポイント獲得</li>
                    <li>• 敗北時：対戦相手のレートに応じてポイント減少</li>
                    <li>• 引き分け時：レート差に応じて微調整</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">計算要素</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 現在のレーティング</li>
                    <li>• 対戦相手のレーティング</li>
                    <li>• 試合結果（勝敗・引き分け）</li>
                    <li>• K値（変動幅調整係数）</li>
                  </ul>
                </div>

                <div className="bg-muted p-3 rounded">
                  <p className="text-xs text-muted-foreground">
                    より強い相手に勝つほど多くのポイントを獲得でき、
                    弱い相手に負けるほど多くのポイントを失います。
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Character */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <img 
              src={tapeNinja} 
              alt="Tape Ninja waiting" 
              className="w-20 h-20 object-contain animate-bounce-gentle"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            テープ忍者：「組み合わせが決まるまで、ルールを確認して準備しましょう！」
          </p>
        </div>
      </main>
    </div>
  );
};