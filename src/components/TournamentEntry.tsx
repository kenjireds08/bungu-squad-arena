import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Calendar, MapPin, Users, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TournamentWaiting } from './TournamentWaiting';

interface Tournament {
  id: string;
  name: string;
  date: string;
  time: string;
  location: string;
  participants: number;
  status: string;
}

export const TournamentEntry = () => {
  const { tournamentId, date } = useParams<{ tournamentId?: string; date?: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [userTournamentActive, setUserTournamentActive] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  
  // Add component mount log
  console.log('TournamentEntry component mounted', { tournamentId, date });
  
  useEffect(() => {
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is logged in and tournament active
        const userId = localStorage.getItem('userId');
        let userIsActive = false;
        
        // TODO: Replace with actual API call
        // Mock tournament data for now
        const today = new Date().toISOString().split('T')[0];
        
        // Get real participant count and check user status
        let participantCount = 0;
        try {
          const playersResponse = await fetch('/api/players');
          if (playersResponse.ok) {
            const players = await playersResponse.json();
            participantCount = players.filter((player: any) => player.tournament_active === true).length;
            console.log('Current tournament participants:', participantCount);
            
            // Check if current user is tournament active
            if (userId) {
              const currentUser = players.find((player: any) => player.id === userId);
              if (currentUser && currentUser.tournament_active === true) {
                userIsActive = true;
                console.log('User is already tournament active');
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch participant count:', error);
        }
        
        setUserTournamentActive(userIsActive);
        
        const mockTournament: Tournament = {
          id: tournamentId || '1',
          name: '第8回BUNGU SQUAD大会',
          date: today,
          time: '19:00',
          location: '○○コミュニティセンター',
          participants: participantCount,
          status: '開催中'
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setTournament(mockTournament);
        
        // If user is logged in and tournament active, show waiting room
        if (userId && userIsActive) {
          setShowWaitingRoom(true);
        }
      } catch (error) {
        console.error('Failed to load tournament:', error);
        toast({
          title: "エラー",
          description: "大会情報の取得に失敗しました",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Load tournament data (works for both /tour and /tournament-entry/:id routes)
    loadTournament();
  }, [tournamentId, toast]);

  const handleEntry = async () => {
    if (!tournament) return;
    
    try {
      setIsEntering(true);
      
      // Check if user is logged in
      const userId = localStorage.getItem('userId');
      if (!userId) {
        toast({
          title: "ログインが必要です",
          description: "大会にエントリーするにはログインしてください",
          variant: "destructive"
        });
        // Redirect to login with return URL  
        const currentUrl = window.location.pathname;
        navigate(`/?returnTo=${currentUrl}`);
        return;
      }

      // TODO: Implement actual entry API call
      console.log('Entering tournament:', tournament.id, 'for user:', userId);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update tournament active status via API
      console.log('Sending API request for user:', userId);
      const response = await fetch(`/api/players?id=${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateTournamentActive: true })
      });

      console.log('API response status:', response.status);
      console.log('API response ok:', response.ok);

      if (response.ok) {
        console.log('Tournament entry successful for user:', userId);
        setIsEntered(true);
        toast({
          title: "エントリー完了",
          description: `${tournament.name}にエントリーしました！`,
        });
        
        // Auto-redirect to waiting room
        setTimeout(() => {
          navigate('/tournament-waiting');
        }, 3000);
      } else {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`Failed to update tournament status: ${response.status} - ${errorText}`);
      }
      
    } catch (error) {
      console.error('Failed to enter tournament:', error);
      toast({
        title: "エラー",
        description: "エントリーに失敗しました。もう一度お試しください。",
        variant: "destructive"
      });
    } finally {
      setIsEntering(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">大会情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <Card className="w-full max-w-md border-fantasy-frame shadow-golden">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <h2 className="text-xl font-bold mb-2">大会が見つかりません</h2>
            <p className="text-muted-foreground mb-4">
              指定された大会は存在しないか、既に終了している可能性があります。
            </p>
            <Button onClick={() => navigate('/')}>
              ホームに戻る
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEntered) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <Card className="w-full max-w-md border-fantasy-frame shadow-golden">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
            <h2 className="text-xl font-bold mb-2">エントリー完了！</h2>
            <p className="text-muted-foreground mb-4">
              {tournament.name}にエントリーしました。<br />
              3秒後に待機画面に移動します...
            </p>
            <div className="animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show waiting room if user is already tournament active
  if (showWaitingRoom && tournament) {
    return (
      <TournamentWaiting 
        onClose={() => navigate('/')}
        onViewRanking={() => navigate('/ranking')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card className="border-fantasy-frame shadow-golden">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Trophy className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-xl">大会エントリー</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Tournament Details */}
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-lg font-semibold mb-2">{tournament.name}</h2>
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-info/20 text-info border border-info/30">
                    {tournament.status}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">{tournament.date}</div>
                      <div className="text-sm text-muted-foreground">{tournament.time}〜</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">開催場所</div>
                      <div className="text-sm text-muted-foreground">{tournament.location}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">現在の参加者</div>
                      <div className="text-sm text-muted-foreground">{tournament.participants}名</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entry Button */}
              <Button
                variant="heroic"
                size="lg"
                className="w-full"
                onClick={handleEntry}
                disabled={isEntering || tournament.status === '開催中' || tournament.status === '完了'}
              >
                {isEntering ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    エントリー中...
                  </>
                ) : (
                  <>
                    <Trophy className="h-5 w-5 mr-2" />
                    大会にエントリー
                  </>
                )}
              </Button>

              {/* Login/Signup buttons */}
              <div className="space-y-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-3">
                    ※ エントリーにはログインが必要です
                  </p>
                </div>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/?returnTo=${window.location.pathname}`)}
                    className="w-full"
                  >
                    ログイン
                    <span className="text-xs ml-2 opacity-70">
                      (既存プレイヤー)
                    </span>
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate(`/?returnTo=${window.location.pathname}&newPlayer=true`)}
                    className="w-full"
                  >
                    初めての方
                    <span className="text-xs ml-2 opacity-70">
                      (新規登録)
                    </span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};