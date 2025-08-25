import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Trophy, TrendingUp, Calendar, Camera, Star, Users, Loader2, RefreshCw, History, MapPin, Info } from 'lucide-react';
import { useRankings, useTournaments } from '@/hooks/useApi';
import { useNotifications } from '@/hooks/useNotifications';
import { PlayerRanking } from './PlayerRanking';
import { QRScanner } from './QRScanner';
import { PlayerMenu } from './PlayerMenu';
import { PlayerStats } from './PlayerStats';
import { PlayerHistory } from './PlayerHistory';
import { PlayerProfile } from './PlayerProfile';
import { PlayerAchievements } from './PlayerAchievements';
import { PlayerSettings } from './PlayerSettings';
import { PlayerHelp } from './PlayerHelp';
import { AdminDashboard } from './AdminDashboard';
import { CameraDiag } from './CameraDiag';
import { MatchWaiting } from './MatchWaiting';
import { MatchInProgress } from './MatchInProgress';
import { MatchResultReport } from './MatchResultReport';
import { MatchResultSubmitted } from './MatchResultSubmitted';
import { TournamentEntryComplete } from './TournamentEntryComplete';
import { TournamentWaiting } from './TournamentWaiting';
import { TournamentDetails } from './TournamentDetails';
import { TournamentParticipants } from './TournamentParticipants';
import { MatchMatching } from './MatchMatching';
import { MatchCountdown } from './MatchCountdown';
import { NotificationBanner } from './NotificationBanner';
import { NotificationHistory } from './NotificationHistory';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import { PullToRefresh } from './PullToRefresh';
import { getTournamentForMainDashboard, getCategorizedTournaments } from '@/utils/tournamentData';
import mainCharacter from '@/assets/main-character.png';

interface MainDashboardProps {
  currentUserId: string | null;
  isAdmin: boolean;
  onLogout: () => void;
}

export const MainDashboard = ({ currentUserId, isAdmin, onLogout }: MainDashboardProps) => {
  // Fallback to default if no user ID provided
  const CURRENT_USER_ID = currentUserId || "player_001";
  
  // Check for URL parameters to determine initial page
  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = urlParams.get('page') || 'dashboard';
  const isFromQR = urlParams.has('from_qr');
  
  const [currentPage, setCurrentPage] = useState<string>(initialPage);
  
  // Check for diagnostic page
  useEffect(() => {
    if (window.location.pathname === '/diag/camera') {
      setCurrentPage('camera-diag');
    }
  }, []);
  const [previousPage, setPreviousPage] = useState<string>('dashboard');
  const [isQREntry, setIsQREntry] = useState<boolean>(isFromQR); // QR経由かどうかを状態で保持
  
  // Clean up URL parameters after processing but preserve QR state
  useEffect(() => {
    if (urlParams.has('page') || urlParams.has('from_qr')) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, []);
  
  // Debug currentPage changes
  useEffect(() => {
    console.log('=== MainDashboard currentPage changed to:', currentPage);
  }, [currentPage]);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showTournamentDetails, setShowTournamentDetails] = useState(false);
  const [selectedTournamentForDetails, setSelectedTournamentForDetails] = useState<any>(null);
  const [acknowledgedTournaments, setAcknowledgedTournaments] = useState<Set<string>>(
    () => new Set(JSON.parse(localStorage.getItem('acknowledgedTournaments') || '[]'))
  );

  const { data: rankings, isLoading: rankingsLoading } = useRankings();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments(true); // Enable polling for admin dashboard
  const { requestPermission } = useNotifications();

  const currentUser = rankings?.find(player => player.id === CURRENT_USER_ID);
  
  // デバッグ用：ユーザー情報をログ出力
  console.log('Current user data:', currentUser);
  console.log('User total_matches:', currentUser?.total_matches);
  console.log('User wins:', currentUser?.wins);
  console.log('User losses:', currentUser?.losses);
  
  // 大会参加経験の判定：
  // 1. total_matches > 0 または
  // 2. wins + losses > 0 （バックアップ）
  const hasMatchHistory = currentUser && (
    (currentUser.total_matches && currentUser.total_matches > 0) ||
    ((currentUser.wins || 0) + (currentUser.losses || 0) > 0)
  );
  
  // 大会参加経験があるプレイヤーのみでフィルタリング
  const activeRankings = rankings?.filter(player => {
    const matches = player.total_matches || 0;
    const totalGames = (player.wins || 0) + (player.losses || 0);
    return matches > 0 || totalGames > 0;
  });
  
  // ランキング内での順位を計算
  let activeUserRank: number | string = 0;
  if (hasMatchHistory) {
    const rankIndex = activeRankings?.findIndex(player => player.id === CURRENT_USER_ID) ?? -1;
    activeUserRank = rankIndex >= 0 ? rankIndex + 1 : 0;
  } else {
    activeUserRank = '-'; // 大会未参加の場合は順位なし
  }
  // Get tournament data from API - prioritize today's tournament
  const today = new Date().toLocaleDateString('sv-SE'); // Use local date YYYY-MM-DD
  const { active, upcoming, completed } = getCategorizedTournaments(tournaments || []);
  
  // Find today's tournament specifically (must match today's date exactly)
  const todaysTournament = [...active, ...upcoming].find(t => t.date === today);
  
  // Check if today has ANY available tournaments (active or upcoming)
  const todaysAvailableTournaments = [...active, ...upcoming].filter(t => t.date === today);
  
  // Only consider "completed" status if no tournaments are available today
  const todaysCompletedTournament = todaysAvailableTournaments.length === 0 ? completed.find(t => t.date === today) : null;
  
  // Get next tournament with proper logic
  let nextTournament = todaysTournament;
  if (!nextTournament) {
    // No tournament today, so get the next upcoming one
    const futureTournaments = upcoming.filter(t => t.date > today);
    if (futureTournaments.length > 0) {
      // Sort by date and get the nearest future tournament
      nextTournament = futureTournaments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    }
  }

  // Initialize notifications - tournament notifications disabled (PWA push notifications will handle this)
  // No need for useEffect as we're just initializing to empty array

  // Check for PWA install prompt
  useEffect(() => {
    const hasShownPrompt = localStorage.getItem('pwa-prompt-shown');
    // Check if running as PWA (standalone mode)
    const isRunningStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                (window.navigator as any).standalone === true;
    
    // Don't show prompt if already shown or if running as PWA
    if (!hasShownPrompt && !isRunningStandalone) {
      setTimeout(() => setShowPWAPrompt(true), 3000);
    }
  }, []);

  // Request notification permission on first load
  useEffect(() => {
    const hasRequestedNotifications = localStorage.getItem('notification-permission-requested');
    if (!hasRequestedNotifications) {
      setTimeout(async () => {
        await requestPermission();
        localStorage.setItem('notification-permission-requested', 'true');
      }, 2000); // 2秒後に要求
    }
  }, [requestPermission]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈"; 
    if (rank === 3) return "🥉";
    return `${rank}位`;
  };

  if (rankingsLoading || tournamentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  const handleNavigate = (page: string) => {
    setPreviousPage(currentPage);
    setCurrentPage(page);
  };

  const handleTournamentEntry = () => {
    setCurrentPage('qrscanner');
  };

  const handleDirectTournamentEntry = (tournament: any) => {
    // Store selected tournament info for QR scanner to use
    sessionStorage.setItem('selectedTournament', JSON.stringify(tournament));
    setCurrentPage('qrscanner');
  };

  const handlePWAPromptClose = () => {
    setShowPWAPrompt(false);
    localStorage.setItem('pwa-prompt-shown', 'true');
  };

  const acknowledgeNotification = (id: string) => {
    const newAcknowledged = new Set(acknowledgedTournaments);
    newAcknowledged.add(id);
    setAcknowledgedTournaments(newAcknowledged);
    localStorage.setItem('acknowledgedTournaments', JSON.stringify([...newAcknowledged]));
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleRefresh = async () => {
    try {
      // Add visual feedback
      const refreshButton = document.querySelector('[data-refresh-button]') as HTMLElement;
      if (refreshButton) {
        refreshButton.style.animation = 'spin 1s linear infinite';
      }

      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('All caches cleared');
      }

      // Force Service Worker update
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
          console.log('Service Worker updated');
        }
      }

      // Add a delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Force hard reload with cache bypass
      window.location.reload();
    } catch (error) {
      console.error('Refresh failed:', error);
      // Fallback to normal reload
      window.location.reload();
    }
  };

  // Handle different pages
  if (currentPage === 'qrscanner') {
    return <QRScanner 
      onClose={() => setCurrentPage('dashboard')} 
      onEntryComplete={() => setCurrentPage('tournament-entry-complete')}
      currentUserId={CURRENT_USER_ID}
      isAdmin={isAdmin}
    />;
  }

  if (currentPage === 'ranking') {
    return <PlayerRanking onClose={() => setCurrentPage(previousPage)} />;
  }

  if (currentPage === 'stats') {
    return <PlayerStats onClose={() => setCurrentPage('dashboard')} currentUserId={CURRENT_USER_ID} />;
  }

  if (currentPage === 'history') {
    console.log('=== MainDashboard rendering PlayerHistory, CURRENT_USER_ID:', CURRENT_USER_ID);
    return <PlayerHistory onClose={() => setCurrentPage('dashboard')} currentUserId={CURRENT_USER_ID} />;
  }

  if (currentPage === 'profile') {
    return <PlayerProfile onClose={() => setCurrentPage('dashboard')} currentUserId={CURRENT_USER_ID} />;
  }

  if (currentPage === 'achievements') {
    return <PlayerAchievements onClose={() => setCurrentPage('dashboard')} currentUserId={CURRENT_USER_ID} />;
  }

  if (currentPage === 'settings') {
    return <PlayerSettings onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'help') {
    return <PlayerHelp onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'admin') {
    return <AdminDashboard onClose={() => setCurrentPage('dashboard')} />;
  }
  
  if (currentPage === 'camera-diag') {
    return <CameraDiag onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'match-waiting') {
    return <MatchWaiting onClose={() => setCurrentPage('dashboard')} onStartMatch={() => setCurrentPage('match-in-progress')} />;
  }

  if (currentPage === 'match-in-progress') {
    return <MatchInProgress onClose={() => setCurrentPage('dashboard')} onFinishMatch={() => setCurrentPage('match-result-report')} />;
  }

  if (currentPage === 'match-result-report') {
    return <MatchResultReport onClose={() => setCurrentPage('dashboard')} onSubmitResult={(result) => setCurrentPage('match-result-submitted')} />;
  }

  if (currentPage === 'match-result-submitted') {
    return <MatchResultSubmitted onClose={() => setCurrentPage('dashboard')} result="win" />;
  }

  if (currentPage === 'tournament-entry-complete') {
    return <TournamentEntryComplete 
      onClose={() => {
        // QR経由の場合は戻るボタンを無効化
        if (isQREntry) {
          console.log('MainDashboard: QR経由のため戻るボタンを無効化');
          return;
        }
        setCurrentPage('dashboard');
      }}
      onViewTournament={() => {
        console.log('MainDashboard: onViewTournament called from TournamentEntryComplete');
        console.log('MainDashboard: Current page before transition:', currentPage);
        setCurrentPage('tournament-waiting');
        setIsQREntry(false); // 遷移後はQR状態をリセット
        console.log('MainDashboard: Page set to tournament-waiting');
        
        // Force a small delay to ensure state update
        setTimeout(() => {
          console.log('MainDashboard: Confirmed page transition to tournament-waiting');
        }, 100);
      }}
      disableAutoTransition={false} // QR経由でも自動遷移を有効化
      hideBackButton={isQREntry} // QR経由の場合は戻るボタンを非表示
    />;
  }

  if (currentPage === 'tournament-waiting') {
    return <TournamentWaiting onClose={() => setCurrentPage('dashboard')} onViewRanking={() => { setPreviousPage('tournament-waiting'); setCurrentPage('ranking'); }} />;
  }

  if (currentPage === 'tournament-details') {
    return <TournamentDetails onClose={() => setCurrentPage('dashboard')} onViewParticipants={() => setCurrentPage('tournament-participants')} />;
  }

  if (currentPage === 'tournament-participants') {
    return <TournamentParticipants onClose={() => setCurrentPage('tournament-details')} />;
  }

  if (currentPage === 'match-matching') {
    return <MatchMatching onClose={() => setCurrentPage('dashboard')} onStartCountdown={() => setCurrentPage('match-countdown')} />;
  }

  if (currentPage === 'match-countdown') {
    return <MatchCountdown onClose={() => setCurrentPage('match-matching')} onStartMatch={() => setCurrentPage('match-in-progress')} />;
  }

  if (currentPage === 'notification-history') {
    return <NotificationHistory onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'logout') {
    // Clear localStorage and trigger logout
    localStorage.removeItem('userId');
    localStorage.removeItem('isAdmin');
    onLogout();
    return null;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:bg-[length:60%] bg-[length:85%]"
        style={{
          backgroundImage: `url('/assets/characters/pencil.png')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          opacity: 0.08,
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10">
      {/* PWA Install Prompt */}
      {showPWAPrompt && (
        <PWAInstallPrompt onClose={handlePWAPromptClose} />
      )}

      {/* Notification Banner */}
      {notifications.length > 0 && (
        <NotificationBanner 
          notifications={notifications}
          onDismiss={dismissNotification}
          onAcknowledge={acknowledgeNotification}
          onViewAll={() => setCurrentPage('notification-history')}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img 
                src="/assets/logos/ロゴ1列mono.png" 
                alt="BUNGU SQUAD" 
                className="h-8 w-auto"
                style={{ maxHeight: '32px' }}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                data-refresh-button
                className="text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">更新</span>
              </Button>
              <PlayerMenu onNavigate={handleNavigate} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Player Status Card */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in bg-background/30">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Current Rank Display */}
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">{new Date().getFullYear()}年度ランキング</p>
                  <p className="text-lg font-medium text-foreground mb-2">{currentUser?.nickname || 'プレイヤー'}</p>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {activeUserRank === '-' ? '大会未参加' : `現在 ${activeUserRank}位`}
                </h2>
                <div className="flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">
                    {currentUser?.current_rating.toLocaleString() || 0}pt
                  </span>
                </div>
              </div>

              {/* Progress to Next Rank */}
              {currentUser && activeUserRank > 1 && (() => {
                const nextRankPlayer = activeRankings && activeUserRank > 1 ? activeRankings[activeUserRank - 2] : null;
                const pointDifference = nextRankPlayer ? nextRankPlayer.current_rating - currentUser.current_rating : 0;
                // 次の順位のプレイヤーとの差が小さいほど100%に近づく
                const previousRankPlayer = activeRankings && activeUserRank < activeRankings.length ? activeRankings[activeUserRank] : null;
                const totalRange = nextRankPlayer && previousRankPlayer 
                  ? nextRankPlayer.current_rating - previousRankPlayer.current_rating 
                  : (nextRankPlayer ? pointDifference + 50 : 100); // デフォルト範囲
                const progressFromPrevious = previousRankPlayer 
                  ? currentUser.current_rating - previousRankPlayer.current_rating 
                  : 0;
                const progressPercentage = totalRange > 0 
                  ? Math.min(100, Math.max(0, (progressFromPrevious / totalRange) * 100))
                  : 50;
                
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm text-muted-foreground">
                        {activeUserRank - 1}位まであと{pointDifference}ポイント！
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-gradient-gold h-2 rounded-full transition-all duration-500"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

            </div>
          </CardContent>
        </Card>

        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-info" />
              {todaysTournament ? "本日の大会予定" : "次の大会予定"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextTournament ? (
              <>
                <div 
                  className="space-y-2 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition-colors"
                  onClick={() => {
                    setSelectedTournamentForDetails(nextTournament);
                    setShowTournamentDetails(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{(nextTournament as any).tournament_name || (nextTournament as any).name}</h3>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {nextTournament.date}
                      {nextTournament.time && (
                        <span className="ml-2 font-medium text-primary">
                          {nextTournament.time}〜
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      場所：{nextTournament.location}
                    </p>
                  </div>
                </div>
                {(todaysTournament || todaysCompletedTournament) && (
                  <Button 
                    variant={todaysCompletedTournament ? "outline" : "heroic"}
                    size="lg" 
                    onClick={todaysCompletedTournament ? 
                      undefined :
                      currentUser?.tournament_active ? 
                        () => setCurrentPage('tournament-waiting')
                        : handleTournamentEntry}
                    disabled={!!todaysCompletedTournament}
                    className={`w-full ${todaysCompletedTournament ? 'cursor-default' : 'animate-bounce-gentle'}`}
                  >
                    {todaysCompletedTournament ? (
                      <>
                        <Trophy className="h-5 w-5 text-muted-foreground" />
                        本日の大会は終了しました。
                      </>
                    ) : currentUser?.tournament_active ? (
                      <>
                        <Trophy className="h-5 w-5" />
                        エントリー済み - 大会待機中画面へ
                      </>
                    ) : (
                      <>
                        <Camera className="h-5 w-5" />
                        大会にエントリー
                      </>
                    )}
                  </Button>
                )}

                {/* Show additional available tournaments for today */}
                {todaysAvailableTournaments.length > 1 && (
                  <div className="mt-4 space-y-2">
                    <h3 className="font-semibold text-sm text-muted-foreground">その他の本日の大会</h3>
                    {todaysAvailableTournaments.slice(1).map((tournament) => (
                      <Button
                        key={tournament.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleDirectTournamentEntry(tournament)}
                        className="w-full justify-start"
                      >
                        <Trophy className="h-4 w-4 mr-2" />
                        {tournament.name} ({tournament.time}〜)
                      </Button>
                    ))}
                  </div>
                )}

                {/* Additional tournaments display */}
                {(() => {
                  const { upcoming } = getCategorizedTournaments(tournaments || []);
                  const otherUpcoming = upcoming.filter(t => t.id !== nextTournament.id).slice(0, 2);
                  
                  if (otherUpcoming.length > 0) {
                    return (
                      <div className="pt-4 border-t border-muted">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">次回大会予定</h4>
                        <div className="space-y-2">
                          {otherUpcoming.map((tournament) => (
                            <div 
                              key={tournament.id} 
                              className="p-2 bg-background/80 rounded-md cursor-pointer hover:bg-background/90 transition-colors border border-muted/30"
                              onClick={() => {
                                setSelectedTournamentForDetails(tournament);
                                setShowTournamentDetails(true);
                              }}
                            >
                              <p className="text-sm font-medium">{tournament.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {tournament.date} {tournament.time && `${tournament.time}〜`}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">次回大会の情報はありません</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => { setPreviousPage('dashboard'); setCurrentPage('ranking'); }}
            className="h-16 flex-col border-primary/40 bg-background/90 hover:bg-background/95 text-primary hover:text-primary shadow-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <Trophy className="h-5 w-5 mb-1" />
            ランキング
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={() => { 
              console.log('=== History button clicked');
              setPreviousPage('dashboard'); 
              setCurrentPage('history'); 
            }}
            className="h-16 flex-col border-accent/40 bg-background/90 hover:bg-background/95 text-accent hover:text-accent shadow-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <History className="h-5 w-5 mb-1" />
            大会参加履歴
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground font-medium mb-2">
            つなげるんだ。キミの武ん具で。
          </p>
          <p className="text-xs text-muted-foreground/70">
            BUNGU SQUAD ランキングシステム v1.0
          </p>
        </div>
      </main>

      {/* Tournament Details Dialog */}
      <Dialog open={showTournamentDetails} onOpenChange={setShowTournamentDetails}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedTournamentForDetails?.tournament_name || selectedTournamentForDetails?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="font-medium">開催日時</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {selectedTournamentForDetails?.date}
                {selectedTournamentForDetails?.start_time && (
                  <span className="ml-2">{selectedTournamentForDetails.start_time}〜</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">開催場所</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                {selectedTournamentForDetails?.location || '未定'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium">説明</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
                {selectedTournamentForDetails?.description || '説明がありません'}
              </p>
              {/* デバッグ情報 */}
              {process.env.NODE_ENV === 'development' && (
                <pre className="text-xs bg-gray-100 p-2 rounded">
                  {JSON.stringify(selectedTournamentForDetails, null, 2)}
                </pre>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-medium">参加状況</span>
              </div>
              <p className="text-sm text-muted-foreground pl-6">
                現在の参加者: {selectedTournamentForDetails?.current_participants || 0}名
                {selectedTournamentForDetails?.max_participants && (
                  <span> / 最大{selectedTournamentForDetails.max_participants}名</span>
                )}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </PullToRefresh>
  );
};