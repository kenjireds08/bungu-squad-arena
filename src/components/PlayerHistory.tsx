import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, History, Trophy, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

interface PlayerHistoryProps {
  onClose: () => void;
}

// Mock history data
const mockHistory = {
  tournaments: [
    {
      id: 1,
      name: "第7回BUNGU SQUAD大会",
      date: "2024-07-18",
      place: "3位",
      participants: 12,
      games: 4,
      wins: 3,
      ratingChange: +35
    },
    {
      id: 2,
      name: "第6回BUNGU SQUAD大会",
      date: "2024-07-04",
      place: "5位",
      participants: 10,
      games: 3,
      wins: 1,
      ratingChange: -18
    },
    {
      id: 3,
      name: "第5回BUNGU SQUAD大会",
      date: "2024-06-20",
      place: "2位",
      participants: 8,
      games: 3,
      wins: 2,
      ratingChange: +42
    }
  ],
  recentGames: [
    {
      id: 1,
      opponent: "鈴木さん",
      opponentRating: 1850,
      result: "負け",
      ratingChange: -12,
      rule: "カードプラス",
      date: "2024-07-18 20:30"
    },
    {
      id: 2,
      opponent: "田中さん",
      opponentRating: 1620,
      result: "勝ち",
      ratingChange: +18,
      rule: "トランプ",
      date: "2024-07-18 20:00"
    },
    {
      id: 3,
      opponent: "山田さん",
      opponentRating: 1580,
      result: "勝ち",
      ratingChange: +16,
      rule: "カードプラス",
      date: "2024-07-18 19:30"
    },
    {
      id: 4,
      opponent: "佐藤さん",
      opponentRating: 1685,
      result: "勝ち",
      ratingChange: +23,
      rule: "トランプ",
      date: "2024-07-18 19:00"
    }
  ]
};

export const PlayerHistory = ({ onClose }: PlayerHistoryProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { 
      month: 'short', 
      day: 'numeric',
      weekday: 'short'
    });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">履歴</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament History */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              大会参加履歴
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockHistory.tournaments.map((tournament, index) => (
              <div
                key={tournament.id}
                className="p-4 bg-muted/30 rounded-lg border border-fantasy-frame/20 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(tournament.date)}
                    </div>
                  </div>
                  <Badge 
                    variant={tournament.place === "1位" ? "default" : tournament.place === "2位" || tournament.place === "3位" ? "secondary" : "outline"}
                    className={tournament.place === "1位" ? "bg-gradient-gold" : ""}
                  >
                    {tournament.place}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{tournament.participants}名</div>
                    <div className="text-muted-foreground">参加者</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{tournament.wins}/{tournament.games}</div>
                    <div className="text-muted-foreground">勝敗</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-semibold flex items-center justify-center gap-1 ${
                      tournament.ratingChange > 0 ? 'text-success' : 'text-destructive'
                    }`}>
                      {tournament.ratingChange > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {tournament.ratingChange > 0 ? '+' : ''}{tournament.ratingChange}
                    </div>
                    <div className="text-muted-foreground">レート変動</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Games */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              最近の対戦記録
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockHistory.recentGames.map((game, index) => (
              <div
                key={game.id}
                className="p-3 bg-muted/20 rounded-lg border border-fantasy-frame/10 animate-slide-up"
                style={{ animationDelay: `${(index + 3) * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">vs {game.opponent}</span>
                    <Badge variant="outline" className="text-xs">
                      {game.rule === "トランプ" ? "♠️" : "➕"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(game.date)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={game.result === "勝ち" ? "default" : "destructive"}
                      className={game.result === "勝ち" ? "bg-success" : ""}
                    >
                      {game.result}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      対戦相手レート: {game.opponentRating}
                    </span>
                  </div>
                  <div className={`font-semibold text-sm flex items-center gap-1 ${
                    game.ratingChange > 0 ? 'text-success' : 'text-destructive'
                  }`}>
                    {game.ratingChange > 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {game.ratingChange > 0 ? '+' : ''}{game.ratingChange}
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};