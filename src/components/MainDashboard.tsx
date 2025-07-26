import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Trophy, TrendingUp, Calendar, Camera, Star, Users, Loader2 } from 'lucide-react';
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
import { TournamentDetails } from './TournamentDetails';
import { TournamentParticipants } from './TournamentParticipants';
import { MatchMatching } from './MatchMatching';
import { MatchCountdown } from './MatchCountdown';
import { NotificationBanner } from './NotificationBanner';
import { NotificationHistory } from './NotificationHistory';
import { PWAInstallPrompt } from './PWAInstallPrompt';
import mainCharacter from '@/assets/main-character.png';
import pencilWarrior from '@/assets/pencil-warrior.png';
import tapeNinja from '@/assets/tape-ninja.png';

const CURRENT_USER_ID = "player_1";

export const MainDashboard = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: '1',
      type: 'tournament' as const,
      title: '新しい大会が作成されました',
      message: '第9回BUNGU SQUAD大会が8/22(木)に開催されます',
      timestamp: new Date(),
      priority: 'high' as const
    }
  ]);

  const { data: rankings, isLoading: rankingsLoading } = useRankings();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();

  const currentUser = rankings?.find(player => player.id === CURRENT_USER_ID);
  const nextTournament = tournaments?.[0];

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

  // Handle different pages
  if (currentPage === 'qrscanner') {
    return <QRScanner onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'ranking') {
    return <PlayerRanking onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'stats') {
    return <PlayerStats onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'history') {
    return <PlayerHistory onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'profile') {
    return <PlayerProfile onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'achievements') {
    return <PlayerAchievements onClose={() => setCurrentPage('dashboard')} />;
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
    return <TournamentEntryComplete onClose={() => setCurrentPage('dashboard')} onViewTournament={() => setCurrentPage('tournament-details')} />;
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
    // TODO: Implement logout logic
    setCurrentPage('dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
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
            <PlayerMenu onNavigate={handleNavigate} />
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
                <h2 className="text-2xl font-bold text-foreground">
                  {getRankIcon(currentUser?.rank || 0)} 現在 {currentUser?.rank || '-'}位
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="text-xl font-semibold text-primary">
                    {currentUser?.current_rating.toLocaleString() || 0}pt
                  </span>
                  {currentUser?.champion_badges?.split(',').filter(Boolean).map((badge, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Progress to Next Rank */}
              {currentUser && currentUser.rank > 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm text-muted-foreground">
                      {currentUser.rank - 1}位まで後少し！
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-gold h-2 rounded-full transition-all duration-500"
                      style={{ width: '75%' }}
                    />
                  </div>
                </div>
              )}

              {/* Tournament Entry Button */}
              <Button 
                variant="heroic" 
                size="xl" 
                onClick={handleTournamentEntry}
                className="w-full max-w-xs mx-auto animate-bounce-gentle"
              >
                <Camera className="h-5 w-5" />
                大会にエントリー
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-info" />
              次回大会予定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nextTournament ? (
              <>
                <h3 className="font-semibold text-lg">{nextTournament.name}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>{nextTournament.date}</p>
                  <p>場所：{nextTournament.location}</p>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">次回大会の情報はありません</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="tournament" 
            size="lg" 
            onClick={() => setCurrentPage('ranking')}
            className="h-20 flex-col"
          >
            <Trophy className="h-6 w-6 mb-1" />
            ランキング
          </Button>
          <Button variant="outline" size="lg" className="h-20 flex-col" onClick={() => setCurrentPage('match-matching')}>
            <Users className="h-6 w-6 mb-1" />
            対戦
          </Button>
        </div>

        {/* Decorative Characters */}
        <div className="relative text-center py-8">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="flex gap-8">
              <img 
                src={pencilWarrior} 
                alt="Pencil Warrior" 
                className="w-16 h-16 object-contain animate-bounce-gentle"
                style={{ animationDelay: '0s' }}
              />
              <img 
                src={tapeNinja} 
                alt="Tape Ninja" 
                className="w-16 h-16 object-contain animate-bounce-gentle"
                style={{ animationDelay: '1s' }}
              />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm text-muted-foreground font-medium mb-2">
              つなげるんだ。キミの武ん具で。
            </p>
            <p className="text-xs text-muted-foreground/70">
              BUNGU SQUAD ランキングシステム v1.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};