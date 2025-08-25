import { useNavigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useToast } from '@/hooks/use-toast';

// 遅延ロードで初期化エラーを回避
const TournamentWaiting = lazy(() => 
  import('@/components/TournamentWaiting').then(module => ({ 
    default: module.TournamentWaiting 
  }))
);

const TournamentWaitingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Debug logging for PWA issues
  useEffect(() => {
    console.log('TournamentWaitingPage mounted');
    console.log('Current URL:', window.location.href);
    console.log('User ID:', localStorage.getItem('userId'));
    console.log('User Nickname:', localStorage.getItem('userNickname'));
  }, []);

  useEffect(() => {
    // URLパラメータから認証成功情報を取得
    const urlParams = new URLSearchParams(window.location.search);
    const verified = urlParams.get('verified');
    const userId = urlParams.get('userId');
    const nickname = urlParams.get('nickname');

    if (verified === 'true' && userId && nickname) {
      // ローカルストレージに保存
      localStorage.setItem('userId', userId);
      localStorage.setItem('userNickname', decodeURIComponent(nickname));
      
      // 成功メッセージを表示
      toast({
        title: "メール認証完了！",
        description: `${decodeURIComponent(nickname)}さん、ようこそ！大会にエントリーしました。`,
        duration: 6000,
      });

      // URLパラメータをクリア（履歴に残さない）
      window.history.replaceState({}, document.title, '/tournament-waiting');
    }
  }, [toast]);

  const handleClose = () => {
    navigate('/');
  };

  const handleViewRanking = () => {
    // TODO: Navigate to ranking page or open ranking modal
    console.log('View ranking clicked');
  };

  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          </div>
        </div>
      }
    >
      <TournamentWaiting 
        onClose={handleClose}
        onViewRanking={handleViewRanking}
      />
    </Suspense>
  );
};

export default TournamentWaitingPage;