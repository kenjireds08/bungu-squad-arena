import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TournamentWaitingPage from "./pages/TournamentWaitingPage";
import { TournamentEntry } from "./components/TournamentEntry";

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
  
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/tournament-entry/:tournamentId" element={<TournamentEntry />} />
              <Route path="/tour" element={<TournamentEntry />} />
              {/* More specific routes should come first */}
              <Route path="/tournament/:date/:timeOrName" element={<TournamentEntry />} />
              <Route path="/tournament/:date" element={<TournamentEntry />} />
              <Route path="/tournament-waiting" element={<TournamentWaitingPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
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
