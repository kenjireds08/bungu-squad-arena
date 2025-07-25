import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Play, 
  Pause, 
  AlertCircle, 
  CheckCircle, 
  Bell, 
  Edit2,
  Filter,
  Timer
} from 'lucide-react';

interface Match {
  id: number;
  player1: string;
  player2: string;
  table: string;
  rule: 'トランプルール' | 'カードプラスルール';
  startTime?: string;
  status: 'waiting' | 'in-progress' | 'result-pending' | 'completed';
  elapsedMinutes?: number;
  reportedBy?: string;
  reportedAt?: string;
}

interface MatchProgressManagerProps {
  onBack: () => void;
}

// Mock data for demonstration
const mockMatches: Match[] = [
  {
    id: 1,
    player1: "鈴木さん",
    player2: "佐藤さん",
    table: "卓1",
    rule: "トランプルール",
    status: "in-progress",
    startTime: "20:15",
    elapsedMinutes: 25
  },
  {
    id: 2,
    player1: "田中さん",
    player2: "山田さん",
    table: "卓2",
    rule: "カードプラスルール",
    status: "in-progress",
    startTime: "20:10",
    elapsedMinutes: 30
  },
  {
    id: 3,
    player1: "高橋さん",
    player2: "中村さん",
    table: "卓3",
    rule: "トランプルール",
    status: "result-pending",
    startTime: "19:45",
    elapsedMinutes: 60,
    reportedBy: "高橋さん",
    reportedAt: "20:40"
  },
  {
    id: 4,
    player1: "小林さん",
    player2: "伊藤さん",
    table: "卓4",
    rule: "カードプラスルール",
    status: "completed",
    startTime: "19:30",
    elapsedMinutes: 45
  }
];

export const MatchProgressManager = ({ onBack }: MatchProgressManagerProps) => {
  const [matches, setMatches] = useState<Match[]>(mockMatches);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showOnlyToday, setShowOnlyToday] = useState(true);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const getElapsedTime = (startTime: string): number => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const matchStart = new Date();
    matchStart.setHours(hours, minutes, 0, 0);
    
    const elapsed = Math.floor((currentTime.getTime() - matchStart.getTime()) / (1000 * 60));
    return Math.max(0, elapsed);
  };

  const getStatusColor = (status: string, elapsedMinutes?: number): string => {
    switch (status) {
      case 'in-progress':
        return 'bg-info text-info-foreground';
      case 'result-pending':
        return elapsedMinutes && elapsedMinutes > 15 ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground';
      case 'completed':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'waiting':
        return '待機中';
      case 'in-progress':
        return '対戦中';
      case 'result-pending':
        return '報告待ち';
      case 'completed':
        return '完了';
      default:
        return '不明';
    }
  };

  const handleSendReminder = (matchId: number) => {
    console.log('Sending reminder for match:', matchId);
    // TODO: Implement reminder notification
  };

  const handleDirectInput = (matchId: number) => {
    console.log('Opening direct input for match:', matchId);
    // TODO: Open direct input modal
  };

  const inProgressMatches = matches.filter(m => m.status === 'in-progress');
  const pendingMatches = matches.filter(m => m.status === 'result-pending');
  const completedMatches = showOnlyToday 
    ? matches.filter(m => m.status === 'completed')
    : matches.filter(m => m.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <Clock className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Timer className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">試合進行管理</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={showOnlyToday ? "default" : "outline"}
                size="sm"
                onClick={() => setShowOnlyToday(!showOnlyToday)}
              >
                <Filter className="h-4 w-4 mr-1" />
                {showOnlyToday ? '本日のみ' : '全表示'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Real-time Clock */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">
              {currentTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-muted-foreground">
              {currentTime.toLocaleDateString('ja-JP')}
            </div>
          </CardContent>
        </Card>

        {/* In Progress Matches */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-info" />
              現在対戦中 ({inProgressMatches.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {inProgressMatches.length > 0 ? (
              inProgressMatches.map((match, index) => (
                <div
                  key={match.id}
                  className="p-4 bg-info/10 border border-info/20 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {match.player1} vs {match.player2}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {match.table} • {match.rule}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={getStatusColor(match.status)}>
                        {getStatusText(match.status)}
                      </Badge>
                      <div className="text-sm font-mono text-info">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {match.elapsedMinutes}分経過
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>開始時刻: {match.startTime}</div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Pause className="h-3 w-3 mr-1" />
                        一時停止
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Play className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>現在対戦中の試合はありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result Pending Matches */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              報告待ち ({pendingMatches.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingMatches.map((match, index) => {
              const isOvertime = match.elapsedMinutes && match.elapsedMinutes > 15;
              return (
                <div
                  key={match.id}
                  className={`p-4 rounded-lg border ${
                    isOvertime 
                      ? 'bg-destructive/10 border-destructive/20' 
                      : 'bg-warning/10 border-warning/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {match.player1} vs {match.player2}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {match.table} • {match.rule}
                      </div>
                      {match.reportedBy && (
                        <div className="text-xs text-muted-foreground">
                          申告者: {match.reportedBy} • {match.reportedAt}
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <Badge className={isOvertime ? 'bg-destructive text-destructive-foreground' : 'bg-warning text-warning-foreground'}>
                        {isOvertime ? '長時間経過' : '報告待ち'}
                      </Badge>
                      <div className={`text-sm font-mono ${isOvertime ? 'text-destructive' : 'text-warning'}`}>
                        <Clock className="h-3 w-3 inline mr-1" />
                        {match.elapsedMinutes}分経過
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendReminder(match.id)}
                    >
                      <Bell className="h-3 w-3 mr-1" />
                      催促通知
                    </Button>
                    <Button 
                      variant="tournament" 
                      size="sm"
                      onClick={() => handleDirectInput(match.id)}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      代理入力
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Completed Matches */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              {showOnlyToday ? '本日完了済み' : '完了済み'} ({completedMatches.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedMatches.slice(0, 5).map((match, index) => (
              <div
                key={match.id}
                className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {match.player1} vs {match.player2}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {match.table} • {match.rule} • {match.elapsedMinutes}分
                  </div>
                </div>
                <Badge className="bg-success text-success-foreground">
                  完了
                </Badge>
              </div>
            ))}
            {completedMatches.length > 5 && (
              <div className="text-center text-sm text-muted-foreground">
                他 {completedMatches.length - 5} 件...
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};