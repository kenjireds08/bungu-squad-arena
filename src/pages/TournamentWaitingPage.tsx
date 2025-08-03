import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TournamentWaiting } from '@/components/TournamentWaiting';

const TournamentWaitingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

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
    <TournamentWaiting 
      onClose={handleClose}
      onViewRanking={handleViewRanking}
    />
  );
};

export default TournamentWaitingPage;