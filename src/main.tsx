import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error handling for Safari compatibility
const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [errorInfo, setErrorInfo] = React.useState<string>('');

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Global error caught:', event.error);
      // Ignore ResizeObserver errors which are benign
      if (event.message?.includes('ResizeObserver')) {
        event.preventDefault();
        return;
      }
      // Ignore network errors that are recoverable
      if (event.message?.includes('Failed to fetch') || event.message?.includes('NetworkError')) {
        console.warn('Network error ignored:', event.message);
        event.preventDefault();
        return;
      }
      setHasError(true);
      setError(event.error);
      setErrorInfo(`Location: ${event.filename}:${event.lineno}:${event.colno}`);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      // Ignore network-related rejections
      if (event.reason?.toString().includes('Failed to fetch') || 
          event.reason?.toString().includes('NetworkError')) {
        console.warn('Network rejection ignored:', event.reason);
        event.preventDefault();
        return;
      }
      setHasError(true);
      setError(new Error(event.reason));
      setErrorInfo('Promise rejection');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (hasError) {
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
        <h1 style={{ color: '#d32f2f', marginBottom: '16px' }}>アプリケーションエラー</h1>
        <p style={{ marginBottom: '16px' }}>申し訳ございません。アプリケーションでエラーが発生しました。</p>
        <details style={{ marginBottom: '16px', maxWidth: '600px' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>エラー詳細</summary>
          <pre style={{ 
            backgroundColor: '#f0f0f0', 
            padding: '12px', 
            borderRadius: '4px',
            fontSize: '12px',
            overflow: 'auto'
          }}>
            {error?.stack || error?.message || 'Unknown error'}
            {errorInfo && `\n${errorInfo}`}
          </pre>
        </details>
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

  return <>{children}</>;
};

// Add initialization logging
console.log('BUNGU SQUAD: Starting application initialization');
console.log('BUNGU SQUAD: User agent:', navigator.userAgent);
console.log('BUNGU SQUAD: DOM loaded, creating root element');

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error('BUNGU SQUAD: Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
      <h1 style="color: #d32f2f; margin-bottom: 16px;">初期化エラー</h1>
      <p>アプリケーションの初期化に失敗しました。</p>
      <button onclick="window.location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">再読み込み</button>
    </div>
  `;
} else {
  console.log('BUNGU SQUAD: Root element found, creating React root');
  try {
    const root = createRoot(rootElement);
    console.log('BUNGU SQUAD: React root created, rendering app');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('BUNGU SQUAD: App rendered successfully');
    
    // Hide the initial loading screen
    setTimeout(() => {
      const loadingDiv = document.getElementById('initial-loading');
      if (loadingDiv) {
        loadingDiv.style.display = 'none';
        console.log('BUNGU SQUAD: Initial loading screen hidden');
      }
    }, 500);
  } catch (error) {
    console.error('BUNGU SQUAD: Failed to render app:', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: system-ui; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column;">
        <h1 style="color: #d32f2f; margin-bottom: 16px;">レンダリングエラー</h1>
        <p>アプリケーションのレンダリングに失敗しました。</p>
        <pre style="background: #f0f0f0; padding: 12px; border-radius: 4px; margin: 16px 0; font-size: 12px; max-width: 600px; overflow: auto;">${error}</pre>
        <button onclick="window.location.reload()" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer;">再読み込み</button>
      </div>
    `;
  }
}
