import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Calendar, MapPin, Users, Loader2, CheckCircle, XCircle, Mail, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TournamentWaiting } from './TournamentWaiting';
import { useUpdatePlayerTournamentActive } from '@/hooks/useApi';

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
  const searchParams = new URLSearchParams(window.location.search);
  const isFromQR = searchParams.has('qr') || searchParams.has('from_qr'); // Check if accessed via QR code
  const refUserId = searchParams.get('ref_user'); // User ID from QR code reference
  const isAdminRef = searchParams.has('admin'); // Admin flag from QR code
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [userTournamentActive, setUserTournamentActive] = useState(false);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  
  // Email verification states
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [verificationLink, setVerificationLink] = useState(''); // For development only
  
  const updateTournamentActive = useUpdatePlayerTournamentActive();
  
  // Add component mount log
  console.log('TournamentEntry component mounted', { tournamentId, date });
  
  useEffect(() => {
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        
        // Check if user is logged in and tournament active
        // Use URL parameter if localStorage is not available (cross-browser/incognito issues)
        const localUserId = localStorage.getItem('userId');
        const userId = localUserId || refUserId;
        let userIsActive = false;
        
        // Log current login state for debugging
        console.log('TournamentEntry: Current userId from localStorage:', localUserId);
        console.log('TournamentEntry: refUserId from URL:', refUserId);
        console.log('TournamentEntry: Final userId:', userId);
        console.log('TournamentEntry: isFromQR:', isFromQR);
        console.log('TournamentEntry: Current URL:', window.location.href);
        
        // If we have a user ID from QR reference but not in localStorage, set it
        if (refUserId && !localUserId) {
          localStorage.setItem('userId', refUserId);
          if (isAdminRef) {
            localStorage.setItem('isAdmin', 'true');
          }
          console.log('TournamentEntry: Set userId from QR reference:', refUserId);
        }
        
        // Get active tournament data from API
        let activeTournament = null;
        let participantCount = 0;
        
        try {
          // Fetch current active tournaments
          const tournamentsResponse = await fetch('/api/tournaments');
          if (tournamentsResponse.ok) {
            const tournaments = await tournamentsResponse.json();
            console.log('All tournaments:', tournaments);
            
            // Find today's active tournament
            const today = new Date().toISOString().split('T')[0];
            activeTournament = tournaments.find((t: any) => 
              t.date === today && (t.status === 'active' || t.status === 'upcoming')
            );
            console.log('Today\'s active tournament:', activeTournament);
          }
        } catch (error) {
          console.error('Failed to fetch tournaments:', error);
        }
        
        // Get real participant count and check user status
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
        
        // Use real tournament data if available, otherwise fallback to mock
        let tournamentData: Tournament;
        if (activeTournament) {
          tournamentData = {
            id: activeTournament.id,
            name: activeTournament.name,
            date: activeTournament.date,
            time: activeTournament.start_time || activeTournament.time,
            location: activeTournament.location,
            participants: participantCount,
            status: activeTournament.status === 'active' ? '開催中' : 
                    activeTournament.status === 'upcoming' ? '開催予定' : '終了'
          };
        } else {
          // Fallback to mock data if no active tournament found
          const today = new Date().toISOString().split('T')[0];
          tournamentData = {
            id: tournamentId || 'tournament_fallback',
            name: 'BUNGU SQUAD大会',
            date: today,
            time: '19:00',
            location: 'コミュニティセンター',
            participants: participantCount,
            status: '開催中'
          };
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setTournament(tournamentData);
        
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
    if (!tournament || !isFromQR) {
      toast({
        title: "エラー",
        description: "QRコード経由でのみエントリーできます",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsEntering(true);
      
      // Check if user is logged in
      const userId = localStorage.getItem('userId');
      if (!userId) {
        // New user - show email verification form
        setShowEmailForm(true);
        return;
      }

      // TODO: Implement actual entry API call
      console.log('Entering tournament:', tournament.id, 'for user:', userId);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update tournament active status via API with real-time updates
      console.log('Sending API request for user:', userId);
      
      await updateTournamentActive.mutateAsync({ id: userId, active: true });
      
      console.log('Tournament entry successful for user:', userId);
      setIsEntered(true);
      toast({
        title: "エントリー完了",
        description: `${tournament.name}にエントリーしました！`,
      });
      
      // Auto-redirect to waiting room
      console.log('Setting timeout for waiting room transition...');
      setTimeout(() => {
        console.log('Timeout executed, setting showWaitingRoom to true');
        setShowWaitingRoom(true);
      }, 3000);
      
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

  // Send email verification
  const handleEmailVerification = async () => {
    if (!email || !nickname || !tournament) {
      toast({
        title: "入力エラー",
        description: "メールアドレスとニックネームを入力してください",
        variant: "destructive"
      });
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "メールアドレスエラー",
        description: "正しいメールアドレスを入力してください",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsEmailSending(true);
      
      const response = await fetch('/api/email-verification/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          nickname,
          tournamentId: tournament.id
        })
      });

      const result = await response.json();

      if (response.ok) {
        setEmailSent(true);
        setVerificationLink(result.verificationLink || ''); // For development
        toast({
          title: "認証メール送信完了",
          description: "メールを確認してエントリーを完了してください",
        });
      } else {
        throw new Error(result.error || 'Failed to send verification email');
      }
      
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast({
        title: "メール送信エラー",
        description: "認証メールの送信に失敗しました。再試行してください。",
        variant: "destructive"
      });
    } finally {
      setIsEmailSending(false);
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
        onClose={() => {
          // QR code entry should stay in waiting room, not return to dashboard
          if (isFromQR) {
            console.log('TournamentWaiting: Ignoring close action for QR entry');
            return;
          }
          navigate('/');
        }}
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

              {/* Email Verification Form */}
              {showEmailForm && !emailSent && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-blue-900">メール認証によるエントリー</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      不正防止のため、メール認証を行います
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="email">メールアドレス</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your-email@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="nickname">ニックネーム</Label>
                      <Input
                        id="nickname"
                        type="text"
                        placeholder="表示名を入力"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowEmailForm(false)}
                      className="flex-1"
                    >
                      戻る
                    </Button>
                    <Button
                      onClick={handleEmailVerification}
                      disabled={isEmailSending || !email || !nickname}
                      className="flex-1"
                    >
                      {isEmailSending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          送信中...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          認証メール送信
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Email Verification Sent */}
              {emailSent && (
                <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-center">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold text-green-900">認証メール送信完了</h3>
                    <p className="text-sm text-green-700 mt-1">
                      <strong>{email}</strong> に認証メールを送信しました
                    </p>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <p className="text-sm text-green-700">
                      メール内のリンクをクリックしてエントリーを完了してください
                    </p>
                    <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                      <AlertCircle className="h-3 w-3" />
                      認証リンクは15分間有効です
                    </div>
                  </div>

                  {/* Development only: Show verification link */}
                  {verificationLink && process.env.NODE_ENV === 'development' && (
                    <div className="p-3 bg-yellow-100 rounded border border-yellow-300">
                      <p className="text-xs text-yellow-800 mb-2">開発用：</p>
                      <a 
                        href={verificationLink} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline break-all"
                      >
                        {verificationLink}
                      </a>
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmailSent(false);
                      setShowEmailForm(false);
                      setEmail('');
                      setNickname('');
                    }}
                    className="w-full"
                  >
                    別のメールアドレスで再送信
                  </Button>
                </div>
              )}


              {/* QR Code Notice - Show if not accessed via QR code */}
              {!isFromQR && !showEmailForm && !emailSent && (
                <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                  <QrCode className="h-8 w-8 text-info mx-auto mb-2" />
                  <h3 className="font-semibold text-info-foreground mb-1">QRコード経由でのエントリー</h3>
                  <p className="text-sm text-muted-foreground">
                    このページはQRコードを読み取った方のエントリー専用です。<br />
                    ダッシュボードからQRスキャナーをご利用ください。
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate('/')}
                    className="mt-3"
                  >
                    ダッシュボードに戻る
                  </Button>
                </div>
              )}

              {/* Login/Signup buttons */}
              {!showEmailForm && !emailSent && (
                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                      既存プレイヤーはログイン、初回参加の方は新規登録でエントリーできます
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};