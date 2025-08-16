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
import { useTournaments, useRankings, useVersionPolling } from '@/hooks/useApi';
import { getCategorizedTournaments } from '@/utils/tournamentData';
import { PlayerRanking } from './PlayerRanking';
import { TournamentMatchesView } from './TournamentMatchesView';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { TournamentEndScreen } from './TournamentEndScreen';

interface TournamentWaitingProps {
  onClose: () => void;
  onViewRanking?: () => void;
}

export const TournamentWaiting = ({ onClose, onViewRanking }: TournamentWaitingProps) => {
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [showEndScreen, setShowEndScreen] = useState(false);
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments(true); // Enable polling
  const playersQuery = useRankings();
  const { data: players, isLoading: playersLoading } = playersQuery;
  
  // Enable version-based polling for real-time updates
  useVersionPolling('current');
  
  // Check if accessed from QR code and not installed as PWA
  useEffect(() => {
    const isFromQR = new URLSearchParams(window.location.search).has('from_qr');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                        (window.navigator as any).standalone ||
                        document.referrer.includes('android-app://');
    
    // Show PWA prompt for QR users who haven't installed the app
    if (isFromQR && !isStandalone) {
      // Delay showing the prompt to avoid overwhelming the user
      const timer = setTimeout(() => {
        setShowPwaPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Additional auto-refresh for participant list every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Force refetch players data for participant updates
      if (!playersLoading && playersQuery.refetch) {
        console.log('Auto-refreshing tournament participants...');
        playersQuery.refetch();
      }
    }, 5000); // Every 5 seconds
    
    return () => clearInterval(interval);
  }, [playersLoading, playersQuery.refetch]);
  
  // Get today's tournament and participants
  const today = new Date().toISOString().split('T')[0];
  const { active, upcoming, past } = getCategorizedTournaments(tournaments || []);
  const todaysTournament = [...active, ...upcoming].find(t => t.date === today);
  
  // Check if tournament has ended
  const isTournamentEnded = todaysTournament?.status === 'ended' || 
                           todaysTournament?.status === '終了' ||
                           past.some(t => t.id === todaysTournament?.id);
  
  // Get tournament participants
  const tournamentParticipants = players?.filter(player => player.tournament_active === true) || [];
  const participantCount = tournamentParticipants.length;
  
  // Check if pairings are decided based on tournament matches
  const isPairingDecided = tournamentMatches.length > 0;

  // Fetch tournament matches
  const fetchTournamentMatches = async () => {
    if (!todaysTournament?.id) return;
    
    setIsLoadingMatches(true);
    try {
      const response = await fetch(`/api/matches?tournamentId=${todaysTournament.id}`);
      if (response.ok) {
        const matches = await response.json();
        setTournamentMatches(matches);
        console.log('Tournament matches loaded:', matches);
      }
    } catch (error) {
      console.error('Failed to fetch tournament matches:', error);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Check for tournament matches on component mount and periodically
  useEffect(() => {
    if (todaysTournament?.id) {
      fetchTournamentMatches();
      
      // Check for updates every 60 seconds (reduced frequency)
      const interval = setInterval(fetchTournamentMatches, 60000);
      return () => clearInterval(interval);
    }
  }, [todaysTournament?.id]);


  const handleCheckPairing = () => {
    if (!isPairingDecided) {
      // まだ組み合わせが決まっていない場合の処理
      console.log("組み合わせがまだ決まっていません");
      fetchTournamentMatches(); // Manual refresh
    } else {
      // 組み合わせが決まっている場合、対戦詳細を表示
      console.log("対戦詳細を表示", tournamentMatches);
      setShowMatches(true);
    }
  };

  // Handle tournament end screen
  if (isTournamentEnded && todaysTournament && !showEndScreen) {
    const currentUserId = localStorage.getItem('userId') || '';
    return (
      <TournamentEndScreen
        tournamentId={todaysTournament.id}
        tournamentName={todaysTournament.name}
        playerId={currentUserId}
        onClose={onClose}
      />
    );
  }

  // Handle ranking view
  if (showRanking) {
    return (
      <PlayerRanking 
        onClose={() => setShowRanking(false)} 
      />
    );
  }

  // Handle matches view
  if (showMatches && todaysTournament?.id) {
    const currentUserId = localStorage.getItem('userId') || '';
    return (
      <TournamentMatchesView 
        onClose={() => setShowMatches(false)}
        currentUserId={currentUserId}
        tournamentId={todaysTournament.id}
      />
    );
  }

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
    <div className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background - Glue (waiting/sticking together) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:bg-[length:60%] bg-[length:85%]"
        style={{
          backgroundImage: `url('/assets/characters/glue.png')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          opacity: 0.08,
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10">
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
        <Card className="border-info shadow-soft animate-fade-in bg-background/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-info">
              <Clock className="h-5 w-5" />
              大会エントリー完了
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">
                {(todaysTournament as any)?.tournament_name || (todaysTournament as any)?.name || '大会情報取得中...'}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                {todaysTournament?.date} {((todaysTournament as any)?.start_time || (todaysTournament as any)?.time) && `${(todaysTournament as any).start_time || (todaysTournament as any).time}〜`}
              </p>
              <Badge variant="outline">
                参加者 {participantCount}名
              </Badge>
            </div>
            
            <div className={`p-4 rounded-lg border ${
              isPairingDecided 
                ? 'bg-success/10 border-success/20' 
                : 'bg-info/10 border-info/20'
            }`}>
              <p className={`text-sm font-medium ${
                isPairingDecided ? 'text-success' : 'text-info'
              }`}>
                {isPairingDecided 
                  ? '🎉 組み合わせが確定しました！' 
                  : '組み合わせ抽選をお待ちください'
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isPairingDecided
                  ? '下記のボタンより対戦組み合わせをご確認ください'
                  : '管理者が全参加者の確認後、対戦組み合わせを決定します'
                }
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
            disabled={isLoadingMatches}
          >
            {isLoadingMatches ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                確認中...
              </>
            ) : (
              <>
                <Table className="h-5 w-5 mr-2" />
                {isPairingDecided ? "対戦組み合わせを確認" : "組み合わせを再確認"}
              </>
            )}
          </Button>

          {!isPairingDecided && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              しばらくお待ちください
            </div>
          )}

          {/* PWA Install Prompt for QR Users */}
          {showPwaPrompt && (
            <PWAInstallPrompt onClose={() => setShowPwaPrompt(false)} />
          )}

          {/* 当日の流れ */}
          <Card className="border-info shadow-soft bg-background/30">
            <CardHeader>
              <CardTitle className="text-info">当日の流れ</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>開始10分前に会場にお越しください</li>
                <li>受付でお名前をお伝えください</li>
                <li>対戦カードが発表されます</li>
                <li>試合開始・ゲームに集中</li>
                <li>全試合終了後、順位発表</li>
              </ol>
            </CardContent>
          </Card>

          {/* ランキング確認ボタン */}
          <Button 
            variant="outline"
            onClick={() => setShowRanking(true)}
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
          <Card className="border-info shadow-soft bg-background/30">
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

        {/* Message */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            組み合わせが決まるまで、ルールを確認して準備しましょう！
          </p>
        </div>
      </main>
      </div>
    </div>
  );
};