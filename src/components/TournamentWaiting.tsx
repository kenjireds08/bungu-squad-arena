import { useState, useEffect } from 'react';
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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useTournaments, useRankings } from '@/hooks/useApi';
import { getCategorizedTournaments } from '@/utils/tournamentData';

interface TournamentWaitingProps {
  onClose: () => void;
  onViewRanking: () => void;
}

export const TournamentWaiting = ({ onClose, onViewRanking }: TournamentWaitingProps) => {
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  const { data: players, isLoading: playersLoading } = useRankings();
  
  // Get today's tournament and participants
  const today = new Date().toISOString().split('T')[0];
  const { active, upcoming } = getCategorizedTournaments(tournaments || []);
  const todaysTournament = [...active, ...upcoming].find(t => t.date === today);
  
  // Debug logging
  console.log('TournamentWaiting Debug:', {
    today,
    tournaments: tournaments?.length || 0,
    active: active?.length || 0,
    upcoming: upcoming?.length || 0,
    todaysTournament,
    tournamentName: todaysTournament?.name || todaysTournament?.tournament_name
  });
  
  // Get tournament participants
  const tournamentParticipants = players?.filter(player => player.tournament_active === true) || [];
  const participantCount = tournamentParticipants.length;
  
  // 組み合わせが決まっているかのフラグ（実際はAPIから取得）
  const isPairingDecided = false;

  const handleCheckPairing = () => {
    if (!isPairingDecided) {
      // まだ組み合わせが決まっていない場合の処理
      console.log("組み合わせがまだ決まっていません");
    } else {
      // 組み合わせが決まっている場合、対戦詳細を表示
      console.log("対戦詳細を表示");
    }
  };

  // Show loading state while data is being fetched
  if (tournamentsLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">大会情報を読み込み中...</p>
        </div>
      </div>
    );
  }

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
              <h3 className="font-bold text-lg mb-2">
                {todaysTournament?.name || todaysTournament?.tournament_name || '大会情報取得中...'}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {todaysTournament?.date} {todaysTournament?.start_time && `${todaysTournament.start_time}〜`}
              </p>
              <Badge variant="outline">
                参加者 {participantCount}名
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

          {/* 当日の流れ */}
          <Card className="border-info shadow-soft">
            <CardHeader>
              <CardTitle className="text-info">当日の流れ</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>開始10分前に会場にお越しください</li>
                <li>受付でお名前をお伝えください</li>
                <li>対戦カードが発表されます</li>
                <li>試合開始・アプリで結果を報告</li>
                <li>全試合終了後、順位発表</li>
              </ol>
            </CardContent>
          </Card>

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

        {/* Participants List */}
        {tournamentParticipants.length > 0 && (
          <Card className="border-info shadow-soft">
            <CardHeader>
              <CardTitle className="text-info">参加者一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {tournamentParticipants.map((participant, index) => (
                  <div key={participant.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium truncate">{participant.nickname}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Character */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <Users className="w-20 h-20 text-primary animate-bounce-gentle" />
          </div>
          <p className="text-sm text-muted-foreground">
            テープ忍者：「組み合わせが決まるまで、ルールを確認して準備しましょう！」
          </p>
        </div>
      </main>
    </div>
  );
};