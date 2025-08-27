import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trophy, Calendar, MapPin, Users, Loader2, CheckCircle, XCircle, Mail, AlertCircle, QrCode } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
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
  const { tournamentId, date, tournamentName, time, timeOrName } = useParams<{ 
    tournamentId?: string; 
    date?: string; 
    tournamentName?: string; 
    time?: string;
    timeOrName?: string;
  }>();
  
  // Handle tournament ID from different route patterns
  // If tournamentId doesn't start with 'tournament_', add the prefix
  const actualTournamentId = tournamentId?.startsWith('tournament_') 
    ? tournamentId 
    : tournamentId 
    ? `tournament_${tournamentId}` 
    : null;
  
  console.log('TournamentEntry route params:', { tournamentId, actualTournamentId, date, timeOrName });
  const searchParams = new URLSearchParams(window.location.search);
  const isFromQR = searchParams.has('qr') || searchParams.has('from_qr'); // Check if accessed via QR code
  
  // Decode tournament name from URL if present
  const decodedTournamentName = tournamentName ? decodeURIComponent(tournamentName) : null;
  
  // Determine if timeOrName is a time (XX-XX format) or tournament name
  const isTimeFormat = timeOrName && /^\d{1,2}-\d{2}$/.test(timeOrName);
  const actualTime = isTimeFormat ? timeOrName : time;
  const actualTournamentName = !isTimeFormat ? timeOrName : tournamentName;
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEntering, setIsEntering] = useState(false);
  const [isEntered, setIsEntered] = useState(false);
  const [userTournamentActive, setUserTournamentActive] = useState(false);
  
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
        const urlUserId = searchParams.get('user_id');
        
        // URLパラメータにuser_idがある場合は、それをローカルストレージに保存
        if (urlUserId && !localUserId) {
          console.log('TournamentEntry: Setting user ID from URL parameter:', urlUserId);
          localStorage.setItem('userId', urlUserId);
          // ユーザー情報も復元する必要がある場合は、APIから取得
          try {
            const playersResponse = await fetch('/api/players');
            if (playersResponse.ok) {
              const players = await playersResponse.json();
              const user = players.find((p: any) => p.id === urlUserId);
              if (user) {
                localStorage.setItem('userNickname', user.nickname || '');
                localStorage.setItem('userEmail', user.email || '');
                console.log('TournamentEntry: Restored user info from API:', user.nickname);
              }
            }
          } catch (error) {
            console.error('Failed to restore user info:', error);
          }
        }
        
        const userId = urlUserId || localUserId;
        let userIsActive = false;
        
        // Log current login state for debugging
        console.log('TournamentEntry: Current userId from localStorage:', localUserId);
        console.log('TournamentEntry: userId from URL:', urlUserId);
        console.log('TournamentEntry: Final userId:', userId);
        console.log('TournamentEntry: isFromQR:', isFromQR);
        console.log('TournamentEntry: date:', date);
        console.log('TournamentEntry: tournamentName:', decodedTournamentName);
        // Convert time format from URL (15-30) back to standard format (15:30)
        let formattedTime = actualTime ? actualTime.replace('-', ':') : null;
        
        // Normalize time format to handle zero-padding variations (e.g., 6:00 -> 06:00)
        if (formattedTime) {
          const [hour, minute] = formattedTime.split(':');
          formattedTime = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
        }
        console.log('TournamentEntry: timeOrName:', timeOrName);
        console.log('TournamentEntry: isTimeFormat:', isTimeFormat);
        console.log('TournamentEntry: actualTime (URL):', actualTime);
        console.log('TournamentEntry: actualTime (formatted):', formattedTime);
        console.log('TournamentEntry: Current URL:', window.location.href);
        console.log('TournamentEntry: User-Agent:', navigator.userAgent);
        console.log('TournamentEntry: Device type:', /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop');
        console.log('TournamentEntry: Window location details:', {
          hostname: window.location.hostname,
          pathname: window.location.pathname,
          search: window.location.search,
          origin: window.location.origin
        });
        
        // Get active tournament data from API
        let activeTournament = null;
        let participantCount = 0;
        
        try {
          // Fetch current active tournaments
          const tournamentsResponse = await fetch('/api/tournaments');
          if (tournamentsResponse.ok) {
            const tournaments = await tournamentsResponse.json();
            console.log('All tournaments:', tournaments);
            
            // Priority 1: Find tournament by ID if provided (most reliable)
            if (actualTournamentId) {
              console.log('Searching for tournament by ID:', actualTournamentId);
              activeTournament = tournaments.find((t: any) => t.id === actualTournamentId);
              console.log('Found tournament by ID:', activeTournament);
            }
            
            // Priority 2: Find tournament by date and time/name (legacy support)
            if (!activeTournament) {
              const targetDate = date || new Date().toISOString().split('T')[0];
              
              if (formattedTime) {
                  // Find tournament by date and time (new preferred method)
                  console.log('Searching for tournament with date:', targetDate, 'and time:', formattedTime);
                  console.log('Available tournaments:', tournaments.map((t: any) => ({
                    date: t.date,
                    start_time: t.start_time,
                    name: t.tournament_name,
                    status: t.status
                  })));
                  
                  activeTournament = tournaments.find((t: any) => {
                    console.log(`Checking tournament: ${t.tournament_name}, date: ${t.date}, time: ${t.start_time}, status: ${t.status}`);
                    console.log(`Tournament full object:`, JSON.stringify(t, null, 2));
                    
                    if (t.date !== targetDate) {
                      console.log(`Date mismatch: ${t.date} !== ${targetDate}`);
                      return false;
                    }
                    
                    if (t.status !== 'active' && t.status !== 'upcoming') {
                      console.log(`Status mismatch: ${t.status} not active/upcoming`);
                      return false;
                    }
                    
                    // Extract time from start_time and compare with flexibility
                    if (t.start_time) {
                      console.log(`Raw start_time: "${t.start_time}", type: ${typeof t.start_time}`);
                      // Directly compare with start_time since it's already in HH:MM format
                      const tournamentTime = t.start_time.trim();
                      const urlTime = formattedTime.trim();
                      console.log(`Comparing tournament time: '${tournamentTime}' with URL time: '${urlTime}' (from "${actualTime}" -> "${formattedTime}")`);
                      
                      // Normalize both times by removing leading zeros for comparison
                      const normalizedTournamentTime = tournamentTime.replace(/^0/, '');
                      const normalizedUrlTime = urlTime.replace(/^0/, '');
                      
                      // Exact match with normalization
                      if (tournamentTime === urlTime || normalizedTournamentTime === normalizedUrlTime) {
                        console.log('✓ Exact time match found!');
                        return true;
                      }
                      
                      // Flexible matching: ±30 minutes
                      try {
                        const [tHour, tMin] = tournamentTime.split(':').map(Number);
                        const [uHour, uMin] = urlTime.split(':').map(Number);
                        
                        const tMinutes = tHour * 60 + tMin;
                        const uMinutes = uHour * 60 + uMin;
                        const timeDiff = Math.abs(tMinutes - uMinutes);
                        
                        console.log(`Time difference: ${timeDiff} minutes (${tHour}:${tMin} vs ${uHour}:${uMin})`);
                        if (timeDiff <= 30) {
                          console.log('✓ Flexible time match found (within 30 minutes)!');
                          return true;
                        } else {
                          console.log('✗ Time difference too large');
                        }
                      } catch (error) {
                        console.error('Error parsing time for flexible matching:', error);
                      }
                    } else {
                      console.log('✗ No start_time found');
                    }
                    return false;
                  });
                  console.log('Found tournament by date and time:', activeTournament);
                  
                  // Fallback: if no match found with time, try to find same-day active tournament
                  if (!activeTournament) {
                    console.log('No time match found, trying fallback to same-day active tournament');
                    activeTournament = tournaments.find((t: any) => 
                      t.date === targetDate && 
                      (t.status === 'active' || t.status === 'upcoming')
                    );
                    console.log('Fallback tournament found:', activeTournament);
                  }
                  
                  // Second fallback: try to find any tournament on the same date regardless of time
                  if (!activeTournament && formattedTime) {
                    console.log('No exact match found, trying any tournament on same date');
                    activeTournament = tournaments.find((t: any) => t.date === targetDate);
                    console.log('Date-only fallback tournament found:', activeTournament);
                  }
                } else if (decodedTournamentName) {
                  // Find tournament by date and name (legacy support)
                  activeTournament = tournaments.find((t: any) => 
                    t.date === targetDate && 
                    t.name === decodedTournamentName &&
                    (t.status === 'active' || t.status === 'upcoming')
                  );
                  console.log('Found tournament by date and name:', activeTournament);
                } else {
                  // Fallback: find tournament by date only
                  activeTournament = tournaments.find((t: any) => 
                    t.date === targetDate && (t.status === 'active' || t.status === 'upcoming')
                  );
                  console.log('Found tournament by date only:', activeTournament);
                }
              }
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
            name: activeTournament.tournament_name,
            date: activeTournament.date,
            time: activeTournament.start_time,
            location: activeTournament.location,
            participants: participantCount,
            status: activeTournament.status === 'active' ? '開催中' : 
                    activeTournament.status === 'upcoming' ? '開催予定' : '終了'
          };
        } else {
          console.error('No tournament found for date:', date, 'time:', time);
          const searchDate = date || new Date().toISOString().split('T')[0];
          console.error('Search parameters:', {
            targetDate: searchDate,
            formattedTime,
            decodedTournamentName,
            availableTournaments: 'No tournaments available'
          });
          // Show error state instead of fallback data
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "大会が見つかりません",
            description: `指定された日付・時間の大会が見つかりませんでした。日付: ${searchDate}, 時間: ${formattedTime || 'なし'}`
          });
          return;
        }
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setTournament(tournamentData);
        
        // If user is logged in and tournament active, redirect to waiting room
        if (userId && userIsActive) {
          // Navigate directly to tournament-waiting route
          navigate('/tournament-waiting');
          return;
        }
        
        // 既存ユーザーがQRコードからアクセスして、まだエントリーしていない場合
        // useEffectで自動エントリーを処理するため、ここでは何もしない
        if (isFromQR && userId && !userIsActive && tournamentData) {
          console.log('TournamentEntry: Existing user from QR detected, will auto-entry');
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
  }, [tournamentId, toast, isFromQR]);
  
  // 既存ユーザーの自動エントリー処理
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    
    // 既存ユーザーがQRコードからアクセスした場合、自動エントリー
    if (isFromQR && userId && tournament && !isEntered && !isEntering && !userTournamentActive && !isLoading) {
      console.log('TournamentEntry: Auto-entry for existing user from QR', {
        isFromQR,
        userId,
        tournament: tournament?.id,
        isEntered,
        isEntering,
        userTournamentActive,
        isLoading
      });
      
      // 少し遅延を入れて安定性を確保してからボタンをクリック
      const timer = setTimeout(() => {
        const entryButton = document.querySelector('[data-auto-entry-button]');
        console.log('Looking for entry button:', entryButton);
        if (entryButton instanceof HTMLButtonElement && !entryButton.disabled) {
          console.log('Clicking entry button for auto-entry');
          entryButton.click();
        } else {
          console.log('Entry button not found or disabled, checking if already active');
          // ボタンが見つからない場合は、すでにエントリー済みの可能性がある
          if (userTournamentActive) {
            console.log('User is already tournament active, redirecting to waiting room');
            navigate('/tournament-waiting?from_qr=true');
          }
        }
      }, 1000); // より長めの遅延で確実に実行
      
      return () => clearTimeout(timer);
    }
  }, [isFromQR, tournament, isEntered, isEntering, userTournamentActive, isLoading, navigate]);

  const handleEntry = useCallback(async () => {
    if (!tournament || !isFromQR) {
      toast({
        title: "エラー",
        description: "QRコード経由でのみエントリーできます",
        variant: "destructive"
      });
      return;
    }

    // 既存のログインユーザーの場合は、入力をスキップ
    const existingUserId = localStorage.getItem('userId');
    const existingNickname = localStorage.getItem('userNickname');
    const existingEmail = localStorage.getItem('userEmail');
    
    // 既存ユーザーでない場合のみ、入力を検証
    if (!existingUserId && isFromQR && (!nickname || !email)) {
      toast({
        title: "入力エラー",
        description: "ニックネームとメールアドレスを入力してください",
        variant: "destructive"
      });
      return;
    }

    // Simple email validation for QR entries
    if (isFromQR && email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        toast({
          title: "メールアドレスエラー",
          description: "正しいメールアドレスを入力してください",
          variant: "destructive"
        });
        return;
      }
    }
    
    try {
      setIsEntering(true);
      
      // 既存のログインユーザーを優先的に使用
      let userId = localStorage.getItem('userId');
      let userNickname = localStorage.getItem('userNickname') || existingNickname;
      let userEmail = localStorage.getItem('userEmail') || existingEmail;
      
      // 既存ユーザーがいない場合のみ、新規ユーザーを作成
      if (!userId) {
        // TEMPORARY: Create anonymous user ID to bypass email verification
        const tempUserId = `temp_user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('userId', tempUserId);
        // Use user-provided nickname and email for QR entries
        localStorage.setItem('userNickname', nickname || `参加者${Date.now().toString().slice(-4)}`);
        localStorage.setItem('userEmail', email || `${tempUserId}@temp.local`);
        console.log('TEMP: Created fresh temporary user ID for QR entry:', tempUserId, 'with nickname:', nickname);
        userId = tempUserId;
        userNickname = nickname;
        userEmail = email;
      } else {
        console.log('Using existing user for tournament entry:', userId, 'nickname:', userNickname);
      }

      // Specific tournament entry API call with tournament ID
      console.log('Entering tournament:', tournament.id, 'for user:', userId);
      
      // Call tournament-specific entry API
      console.log('Making tournament entry API call with data:', {
        userId: userId,
        tournamentId: tournament.id,
        tempNickname: userNickname,
        tempEmail: userEmail
      });
      
      const requestUrl = '/api/admin?action=tournament-entry';
      const requestBody = { 
        userId: userId,
        tournamentId: tournament.id,
        // Include nickname and email for temp user creation
        tempNickname: userNickname,
        tempEmail: userEmail
      };
      
      console.log('DETAILED REQUEST INFO:', {
        method: 'POST',
        url: requestUrl,
        fullUrl: window.location.origin + requestUrl,
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
        bodyString: JSON.stringify(requestBody),
        userAgent: navigator.userAgent
      });
      
      const entryResponse = await fetch(requestUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      console.log('Tournament entry API response status:', entryResponse.status);
      console.log('Tournament entry API response headers:', [...entryResponse.headers.entries()]);
      
      if (!entryResponse.ok) {
        let errorData;
        let responseText;
        try {
          responseText = await entryResponse.text();
          console.error('Raw error response:', responseText);
          errorData = JSON.parse(responseText);
        } catch (jsonError) {
          console.error('Failed to parse error response:', jsonError);
          console.error('Response text was:', responseText);
          errorData = { error: `HTTP ${entryResponse.status}: ${entryResponse.statusText}` };
        }
        console.error('Tournament entry API error:', entryResponse.status, errorData);
        throw new Error(errorData.error || `Tournament entry failed (${entryResponse.status})`);
      }
      
      // Update tournament active status via API with real-time updates
      console.log('Sending API request for user:', userId);
      
      // エントリーが成功したことを確認
      const entryData = await entryResponse.json();
      console.log('Tournament entry API response data:', entryData);
      
      // 念のため、tournament_activeステータスを再度更新
      if (updateTournamentActive && updateTournamentActive.mutate) {
        try {
          console.log('Updating tournament active status for user:', userId);
          await updateTournamentActive.mutateAsync({ 
            id: userId, 
            active: true 
          });
          console.log('Tournament active status updated successfully');
        } catch (updateError) {
          console.error('Failed to update tournament active status:', updateError);
          // エラーがあっても続行（エントリー自体は成功しているため）
        }
      }
      
      console.log('Tournament entry successful for user:', userId);
      setIsEntered(true);
      toast({
        title: "エントリー完了",
        description: `${tournament.name}にエントリーしました！`,
      });
      
      // Auto-redirect to waiting room after entry success
      console.log('Setting timeout for tournament waiting page transition...');
      setTimeout(() => {
        console.log('Timeout executed, navigating to tournament waiting page');
        try {
          // Navigate directly to tournament-waiting route
          const queryParams = isFromQR ? '?from_qr=true' : '';
          const targetUrl = `/tournament-waiting${queryParams}`;
          console.log('Navigating to:', targetUrl);
          
          // Use navigate function for SPA navigation
          navigate(targetUrl);
        } catch (navError) {
          console.error('Navigation error:', navError);
          // Fallback: use window.location for hard navigation
          window.location.href = `/tournament-waiting${isFromQR ? '?from_qr=true' : ''}`;
        }
      }, 1500); // Reduced delay for better UX
      
    } catch (error) {
      console.error('Failed to enter tournament:', error);
      const localUserId = localStorage.getItem('userId');
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        tournament: tournament,
        userId: localUserId,
        nickname: nickname,
        email: email
      });
      toast({
        title: "エラー",
        description: `エントリーに失敗しました: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsEntering(false);
    }
  }, [tournament, isFromQR, nickname, email, navigate, toast, updateTournamentActive]);

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
      
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'send-verification',
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
              2秒後に待機画面に移動します...
            </p>
            <div className="animate-pulse">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to waiting room if user is already tournament active
  if (userTournamentActive && tournament) {
    navigate('/tournament-waiting');
    return null;
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
                      入力されたメールアドレスに認証リンクを送信します。<br />
                      メール内のリンクをクリックして大会エントリーを完了してください。
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

              {/* QR Code Direct Entry - Skip email verification */}
              {isFromQR && !showEmailForm && !emailSent && (
                <div className="space-y-4">
                  {/* 既存ユーザーの場合 */}
                  {localStorage.getItem('userId') ? (
                    <>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          QRコードからのエントリーです。
                        </p>
                        <div className="p-3 bg-success/10 rounded-lg border border-success/20 mb-3">
                          <p className="text-sm font-medium text-success-foreground">
                            ログイン済み: {localStorage.getItem('userNickname') || 'ユーザー'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {localStorage.getItem('userEmail') || ''}
                          </p>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleEntry}
                        disabled={isEntering}
                        className="w-full"
                        data-auto-entry-button
                      >
                        {isEntering ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            エントリー中...
                          </>
                        ) : (
                          <>
                            <Trophy className="h-4 w-4 mr-2" />
                            大会にエントリー
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    /* 新規ユーザーの場合 */
                    <>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-3">
                          QRコードからのエントリーです。<br />
                          初めての方は、ニックネームとメールアドレスで登録してください。
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="nickname">ニックネーム *</Label>
                          <Input
                            id="nickname"
                            type="text"
                            placeholder="表示名を入力"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="email">メールアドレス *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your-email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleEntry}
                        disabled={isEntering || !nickname || !email}
                        className="w-full"
                      >
                        {isEntering ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            エントリー中...
                          </>
                        ) : (
                          <>
                            <Trophy className="h-4 w-4 mr-2" />
                            登録して大会にエントリー
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* Login/Signup buttons for non-QR entries */}
              {!isFromQR && !showEmailForm && !emailSent && (
                <div className="space-y-2">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                      既存プレイヤーはログイン、初回参加の方はメール認証による新規登録でエントリーできます
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