import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TournamentWaiting } from '@/components/TournamentWaiting';

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

  // Add error boundary for debugging
  try {
    return (
      <TournamentWaiting 
        onClose={handleClose}
        onViewRanking={handleViewRanking}
      />
    );
  } catch (error) {
    console.error('TournamentWaitingPage render error:', error);
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">エラーが発生しました</h1>
          <p className="text-sm text-muted-foreground mb-4">ページの読み込みに失敗しました</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }
};

export default TournamentWaitingPage;