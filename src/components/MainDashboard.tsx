import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Trophy, TrendingUp, Calendar, Camera, Star, Users, Loader2, RefreshCw } from 'lucide-react';
import { useRankings, useTournaments } from '@/hooks/useApi';
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
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [previousPage, setPreviousPage] = useState<string>('dashboard');
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const { data: rankings, isLoading: rankingsLoading } = useRankings();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();

  const currentUser = rankings?.find(player => player.id === CURRENT_USER_ID);
  // Use shared tournament data instead of API data
  const nextTournament = getTournamentForMainDashboard();

  // Initialize notifications with tournament data
  useEffect(() => {
    if (nextTournament) {
      setNotifications([
        {
          id: '1',
          type: 'tournament' as const,
          title: '新しい大会が作成されました',
          message: `${nextTournament.name}が${nextTournament.date}に開催されます`,
          timestamp: new Date(),
          priority: 'high' as const
        }
      ]);
    }
  }, [nextTournament]);

  // Check for PWA install prompt
  useEffect(() => {
    const hasShownPrompt = localStorage.getItem('pwa-prompt-shown');
    if (!hasShownPrompt) {
      setTimeout(() => setShowPWAPrompt(true), 3000);
    }
  }, []);

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

  const handlePWAPromptClose = () => {
    setShowPWAPrompt(false);
    localStorage.setItem('pwa-prompt-shown', 'true');
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
    />;
  }

  if (currentPage === 'ranking') {
    return <PlayerRanking onClose={() => setCurrentPage(previousPage)} />;
  }

  if (currentPage === 'stats') {
    return <PlayerStats onClose={() => setCurrentPage('dashboard')} currentUserId={CURRENT_USER_ID} />;
  }

  if (currentPage === 'history') {
    return <PlayerHistory onClose={() => setCurrentPage('dashboard')} />;
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
    return <TournamentEntryComplete onClose={() => setCurrentPage('dashboard')} onViewTournament={() => setCurrentPage('tournament-waiting')} />;
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
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-gradient-parchment">
      {/* PWA Install Prompt */}
      {showPWAPrompt && (
        <PWAInstallPrompt onClose={handlePWAPromptClose} />
      )}

      {/* Notification Banner */}
      {notifications.length > 0 && (
        <NotificationBanner 
          notifications={notifications}
          onDismiss={dismissNotification}
          onViewAll={() => setCurrentPage('notification-history')}
        />
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">BUNGU SQUAD</h1>
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
        <Card className="border-fantasy-frame shadow-golden animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Current Rank Display */}
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">{new Date().getFullYear()}年度ランキング</p>
                  <p className="text-lg font-medium text-foreground mb-2">{currentUser?.nickname || 'プレイヤー'}</p>
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {getRankIcon(currentUser?.rank || 0)} 現在 {currentUser?.rank || '-'}位
                </h2>
                <div className="flex items-center justify-center">
                  <span className="text-xl font-semibold text-primary">
                    {currentUser?.current_rating.toLocaleString() || 0}pt
                  </span>
                </div>
              </div>

              {/* Progress to Next Rank */}
              {currentUser && currentUser.rank > 1 && (() => {
                const nextRankPlayer = rankings?.find(player => player.rank === currentUser.rank - 1);
                const pointDifference = nextRankPlayer ? nextRankPlayer.current_rating - currentUser.current_rating : 0;
                const progressPercentage = Math.min(75, Math.max(25, 100 - (pointDifference / 100) * 25));
                
                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm text-muted-foreground">
                        {currentUser.rank - 1}位まであと{pointDifference}ポイント！
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
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-info" />
              {(() => {
                if (!nextTournament) return "次回大会予定";
                const today = new Date().toISOString().split('T')[0];
                if (nextTournament.date === today) return "本日の大会予定";
                return "次回大会予定";
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextTournament ? (
              <>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">{nextTournament.name}</h3>
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
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      場所：{nextTournament.location}
                    </p>
                  </div>
                </div>
                <Button 
                  variant="heroic" 
                  size="lg" 
                  onClick={handleTournamentEntry}
                  className="w-full animate-bounce-gentle"
                >
                  <Camera className="h-5 w-5" />
                  大会にエントリー
                </Button>

                {/* Additional tournaments display */}
                {(() => {
                  const { upcoming } = getCategorizedTournaments();
                  const otherUpcoming = upcoming.filter(t => t.id !== nextTournament.id).slice(0, 2);
                  
                  if (otherUpcoming.length > 0) {
                    return (
                      <div className="pt-4 border-t border-muted">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">さらに次回の大会予定</h4>
                        <div className="space-y-2">
                          {otherUpcoming.map((tournament) => (
                            <div key={tournament.id} className="p-2 bg-muted/50 rounded-md">
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
        <div className="grid grid-cols-1 gap-4">
          <Button 
            variant="tournament" 
            size="lg" 
            onClick={() => { setPreviousPage('dashboard'); setCurrentPage('ranking'); }}
            className="h-20 flex-col"
          >
            <Trophy className="h-6 w-6 mb-1" />
            ランキング
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
    </PullToRefresh>
  );
};