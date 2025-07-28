import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainDashboard } from '@/components/MainDashboard';
import { Login } from '@/components/Login';

const Index = () => {
  console.log('BUNGU SQUAD: Index component rendering');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    console.log('BUNGU SQUAD: Index useEffect running');
    try {
      // Check if user is already logged in (from localStorage)
      const savedUserId = localStorage.getItem('userId');
      const savedIsAdmin = localStorage.getItem('isAdmin') === 'true';
      
      console.log('BUNGU SQUAD: Checking saved credentials', { savedUserId, savedIsAdmin });
      
      if (savedUserId) {
        console.log('BUNGU SQUAD: Found saved user, setting authenticated');
        setIsAuthenticated(true);
        setCurrentUserId(savedUserId);
        setIsAdmin(savedIsAdmin);
      } else {
        console.log('BUNGU SQUAD: No saved user found');
      }
      
      // Check if we should show install prompt
      const showInstall = searchParams.get('showInstall');
      if (showInstall === 'true' && savedUserId) {
        console.log('BUNGU SQUAD: Showing PWA install prompt');
        // Trigger PWA install prompt after a short delay
        setTimeout(() => {
          const event = window.deferredPrompt;
          if (event) {
            event.prompt();
          }
        }, 500);
      }
    } catch (error) {
      console.error('BUNGU SQUAD: Error in Index useEffect:', error);
      setInitError(error as Error);
    }
  }, [searchParams]);

  const handleLoginSuccess = (userId: string, admin: boolean) => {
    console.log('BUNGU SQUAD: Login success', { userId, admin });
    try {
      setIsAuthenticated(true);
      setCurrentUserId(userId);
      setIsAdmin(admin);
      
      // Save to localStorage
      localStorage.setItem('userId', userId);
      localStorage.setItem('isAdmin', admin.toString());
      
      // Handle return URL after login
      const returnTo = searchParams.get('returnTo');
      if (returnTo) {
        console.log('BUNGU SQUAD: Navigating to return URL:', returnTo);
        navigate(returnTo);
      }
    } catch (error) {
      console.error('BUNGU SQUAD: Error in handleLoginSuccess:', error);
      setInitError(error as Error);
    }
  };

  const handleLogout = () => {
    console.log('BUNGU SQUAD: Logout');
    try {
      setIsAuthenticated(false);
      setCurrentUserId(null);
      setIsAdmin(false);
      
      // Clear localStorage
      localStorage.removeItem('userId');
      localStorage.removeItem('isAdmin');
    } catch (error) {
      console.error('BUNGU SQUAD: Error in handleLogout:', error);
    }
  };

  // Show error if initialization failed
  if (initError) {
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
        <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>初期化エラー</h1>
        <p style={{ marginBottom: '16px' }}>ページの初期化中にエラーが発生しました。</p>
        <pre style={{ 
          backgroundColor: '#f0f0f0', 
          padding: '12px', 
          borderRadius: '4px',
          fontSize: '12px',
          maxWidth: '600px',
          overflow: 'auto',
          marginBottom: '16px'
        }}>
          {initError.stack || initError.message}
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

  console.log('BUNGU SQUAD: Rendering based on authentication state', { isAuthenticated, currentUserId, isAdmin });

  if (!isAuthenticated) {
    console.log('BUNGU SQUAD: User not authenticated, showing login');
    const isNewPlayer = searchParams.get('newPlayer') === 'true';
    try {
      return <Login onLoginSuccess={handleLoginSuccess} isNewPlayer={isNewPlayer} />;
    } catch (error) {
      console.error('BUNGU SQUAD: Error rendering Login:', error);
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui',
          backgroundColor: '#f5f5f5',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column'
        }}>
          <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>ログインエラー</h1>
          <p>ログインページの読み込みに失敗しました。</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 16px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>再読み込み</button>
        </div>
      );
    }
  }

  console.log('BUNGU SQUAD: User authenticated, showing dashboard');
  try {
    return <MainDashboard currentUserId={currentUserId} isAdmin={isAdmin} onLogout={handleLogout} />;
  } catch (error) {
    console.error('BUNGU SQUAD: Error rendering MainDashboard:', error);
    return (
      <div style={{
        padding: '20px',
        fontFamily: 'system-ui',
        backgroundColor: '#f5f5f5',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>ダッシュボードエラー</h1>
        <p>メインダッシュボードの読み込みに失敗しました。</p>
        <button onClick={() => window.location.reload()} style={{ marginTop: '16px', padding: '8px 16px', background: '#1976d2', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>再読み込み</button>
      </div>
    );
  }
};

export default Index;
