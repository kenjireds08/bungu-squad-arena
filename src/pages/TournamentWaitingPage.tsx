import { useNavigate } from 'react-router-dom';
import { TournamentWaiting } from '@/components/TournamentWaiting';

const TournamentWaitingPage = () => {
  const navigate = useNavigate();

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