import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Lazy load tournament components to avoid circular dependencies
const TournamentWaitingPage = lazy(() => import("./pages/TournamentWaitingPage"));
const TournamentEntry = lazy(() => import("./components/TournamentEntry").then(module => ({ default: module.TournamentEntry })));

// Lazy load admin components for routing
const AdminDashboard = lazy(() => import("./components/AdminDashboard").then(module => ({ default: module.AdminDashboard })));
const AdminTournaments = lazy(() => import("./components/AdminTournaments").then(module => ({ default: module.AdminTournaments })));
const AdminPlayers = lazy(() => import("./components/AdminPlayers").then(module => ({ default: module.AdminPlayers })));

// Lazy load player components for routing
const PlayerRanking = lazy(() => import("./components/PlayerRanking").then(module => ({ default: module.PlayerRanking })));
const PlayerStats = lazy(() => import("./components/PlayerStats").then(module => ({ default: module.PlayerStats })));
const PlayerHistory = lazy(() => import("./components/PlayerHistory").then(module => ({ default: module.PlayerHistory })));
const PlayerProfile = lazy(() => import("./components/PlayerProfile").then(module => ({ default: module.PlayerProfile })));
const PlayerAchievements = lazy(() => import("./components/PlayerAchievements").then(module => ({ default: module.PlayerAchievements })));
const PlayerSettings = lazy(() => import("./components/PlayerSettings").then(module => ({ default: module.PlayerSettings })));
const PlayerHelp = lazy(() => import("./components/PlayerHelp").then(module => ({ default: module.PlayerHelp })));

// Lazy load other components for routing
const NotificationHistory = lazy(() => import("./components/NotificationHistory").then(module => ({ default: module.NotificationHistory })));

// Wrapper components for admin routes with navigation
const AdminDashboardRoute = () => {
  const navigate = useNavigate();
  return <AdminDashboard onClose={() => navigate('/')} />;
};

const AdminTournamentsRoute = () => {
  const navigate = useNavigate();
  return <AdminTournaments onBack={() => navigate('/admin')} />;
};

const AdminPlayersRoute = () => {
  const navigate = useNavigate();
  return <AdminPlayers onBack={() => navigate('/admin')} />;
};

// Wrapper components for player routes with navigation
const PlayerRankingRoute = () => {
  const navigate = useNavigate();
  return <PlayerRanking onClose={() => navigate('/')} />;
};

const PlayerStatsRoute = () => {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || 'player_001';
  return <PlayerStats onClose={() => navigate('/')} currentUserId={currentUserId} />;
};

const PlayerHistoryRoute = () => {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || 'player_001';
  return <PlayerHistory onClose={() => navigate('/')} currentUserId={currentUserId} />;
};

const PlayerProfileRoute = () => {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || 'player_001';
  return <PlayerProfile onClose={() => navigate('/')} currentUserId={currentUserId} />;
};

const PlayerAchievementsRoute = () => {
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId') || 'player_001';
  return <PlayerAchievements onClose={() => navigate('/')} currentUserId={currentUserId} />;
};

const PlayerSettingsRoute = () => {
  const navigate = useNavigate();
  return <PlayerSettings onClose={() => navigate('/')} />;
};

const PlayerHelpRoute = () => {
  const navigate = useNavigate();
  return <PlayerHelp onClose={() => navigate('/')} />;
};

const NotificationHistoryRoute = () => {
  const navigate = useNavigate();
  return <NotificationHistory onClose={() => navigate('/')} />;
};

// Add query client configuration for better error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        console.log('BUNGU SQUAD: Query retry', { failureCount, error });
        return failureCount < 3 && error !== null;
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

const App = () => {
  console.log('BUNGU SQUAD: App component rendering');
  
  // PWA検出してクラスを付与
  useEffect(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                  (window.navigator as any).standalone;
    if (isPWA) {
      document.documentElement.classList.add('pwa');
      console.log('BUNGU SQUAD: PWAモードで実行中');
    }
  }, []);
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={
              <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground">読み込み中...</p>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/" element={<Index />} />

                {/* Admin routes */}
                <Route path="/admin" element={<AdminDashboardRoute />} />
                <Route path="/admin/tournaments" element={<AdminTournamentsRoute />} />
                <Route path="/admin/players" element={<AdminPlayersRoute />} />

                {/* Player routes */}
                <Route path="/ranking" element={<PlayerRankingRoute />} />
                <Route path="/stats" element={<PlayerStatsRoute />} />
                <Route path="/history" element={<PlayerHistoryRoute />} />
                <Route path="/profile" element={<PlayerProfileRoute />} />
                <Route path="/achievements" element={<PlayerAchievementsRoute />} />
                <Route path="/settings" element={<PlayerSettingsRoute />} />
                <Route path="/help" element={<PlayerHelpRoute />} />
                <Route path="/notifications" element={<NotificationHistoryRoute />} />

                {/* Tournament routes */}
                <Route path="/tournament-entry/:tournamentId" element={<TournamentEntry />} />
                <Route path="/tour" element={<TournamentEntry />} />
                {/* More specific routes should come first */}
                <Route path="/tournament/tournament_:tournamentId" element={<TournamentEntry />} />
                <Route path="/tournament/:tournamentId" element={<TournamentEntry />} />
                <Route path="/tournament/:date/:timeOrName" element={<TournamentEntry />} />
                <Route path="/tournament/:date" element={<TournamentEntry />} />
                <Route path="/tournament-waiting" element={<TournamentWaitingPage />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    );
  } catch (error) {
    console.error('BUNGU SQUAD: App component error:', error);
    return (
      <div style={{
        padding: '20px',
        fontFamily: 'system-ui',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>App Component Error</h1>
        <p style={{ marginBottom: '16px' }}>アプリケーションコンポーネントでエラーが発生しました。</p>
        <pre style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '12px', 
          borderRadius: '4px',
          fontSize: '12px',
          maxWidth: '600px',
          overflow: 'auto'
        }}>
          {error?.toString()}
        </pre>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          再読み込み
        </button>
      </div>
    );
  }
};

export default App;
