import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Shuffle, Play, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRankings } from '@/hooks/useApi';

interface MatchMatchingProps {
  onClose: () => void;
  onStartCountdown: () => void;
}

const mockMatches = [
  {
    id: 1,
    player1: { name: "鈴木さん", rating: 1850, badges: ["★", "★", "♠️", "➕"] },
    player2: { name: "佐藤さん", rating: 1685, badges: ["★", "♠️"] },
    table: "卓1",
    rule: "トランプルール"
  },
  {
    id: 2,
    player1: { name: "田中さん", rating: 1620, badges: ["♠️", "➕"] },
    player2: { name: "山田さん", rating: 1580, badges: ["⭐", "➕"] },
    table: "卓2", 
    rule: "カードプラスルール"
  },
  {
    id: 3,
    player1: { name: "高橋さん", rating: 1540, badges: ["♠️"] },
    player2: { name: "中村さん", rating: 1510, badges: ["➕"] },
    table: "卓3",
    rule: "トランプルール"
  },
  {
    id: 4,
    player1: { name: "小林さん", rating: 1480, badges: [] },
    player2: { name: "加藤さん", rating: 1450, badges: ["♠️"] },
    table: "卓4",
    rule: "トランプルール"
  }
];

export const MatchMatching = ({ onClose, onStartCountdown }: MatchMatchingProps) => {
  const [shuffling, setShuffling] = useState(false);
  const [currentMatches, setCurrentMatches] = useState<any[]>([]);
  const { data: rankings, isLoading } = useRankings();

  // Generate matches from real player data
  useEffect(() => {
    if (rankings && rankings.length >= 2) {
      const generateMatches = () => {
        const players = [...rankings];
        const newMatches = [];
        const rules = ['トランプルール', 'カードプラスルール'];
        
        for (let i = 0; i < Math.min(players.length - 1, 4); i += 2) {
          if (players[i] && players[i + 1]) {
            newMatches.push({
              id: i / 2 + 1,
              player1: {
                name: players[i].nickname,
                rating: players[i].current_rating,
                badges: players[i].champion_badges?.split(',').filter(Boolean) || []
              },
              player2: {
                name: players[i + 1].nickname,
                rating: players[i + 1].current_rating,
                badges: players[i + 1].champion_badges?.split(',').filter(Boolean) || []
              },
              table: `卓${i / 2 + 1}`,
              rule: rules[i / 2 % 2]
            });
          }
        }
        return newMatches;
      };
      
      setCurrentMatches(generateMatches());
    }
  }, [rankings]);

  const handleShuffle = () => {
    if (!rankings || rankings.length < 2) return;
    
    setShuffling(true);
    // Simulate shuffling animation
    setTimeout(() => {
      const shuffledPlayers = [...rankings].sort(() => Math.random() - 0.5);
      const newMatches = [];
      const rules = ['トランプルール', 'カードプラスルール'];
      
      for (let i = 0; i < Math.min(shuffledPlayers.length - 1, 4); i += 2) {
        if (shuffledPlayers[i] && shuffledPlayers[i + 1]) {
          newMatches.push({
            id: i / 2 + 1,
            player1: {
              name: shuffledPlayers[i].nickname,
              rating: shuffledPlayers[i].current_rating,
              badges: shuffledPlayers[i].champion_badges?.split(',').filter(Boolean) || []
            },
            player2: {
              name: shuffledPlayers[i + 1].nickname,
              rating: shuffledPlayers[i + 1].current_rating,
              badges: shuffledPlayers[i + 1].champion_badges?.split(',').filter(Boolean) || []
            },
            table: `卓${i / 2 + 1}`,
            rule: rules[i / 2 % 2]
          });
        }
      }
      setCurrentMatches(newMatches);
      setShuffling(false);
    }, 2000);
  };

  const getRuleColor = (rule: string) => {
    return rule === "トランプルール" ? "border-blue-300 bg-blue-50" : "border-purple-300 bg-purple-50";
  };

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <h1 className="text-lg font-bold text-foreground">対戦組み合わせ</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2 text-muted-foreground">対戦組み合わせを生成中...</span>
          </div>
        ) : (
          <>
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardContent className="pt-4">
            <div className="text-center space-y-2">
              <h2 className="font-bold text-lg">第8回BUNGU SQUAD大会</h2>
              <p className="text-sm text-muted-foreground">第1ラウンド</p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-success" />
                  <span>{currentMatches.length * 2}名参加</span>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">スイスドロー方式</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shuffle Controls */}
        <Card className="border-primary shadow-golden animate-slide-up">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">組み合わせ調整</h3>
                <p className="text-sm text-muted-foreground">レーティング差を考慮した組み合わせ</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleShuffle}
                disabled={shuffling}
                className="flex items-center gap-2"
              >
                <Shuffle className={`h-4 w-4 ${shuffling ? 'animate-spin' : ''}`} />
                {shuffling ? '調整中...' : '再調整'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Match List */}
        <div className="space-y-4">
          {currentMatches.map((match, index) => (
            <Card 
              key={match.id} 
              className={`border-fantasy-frame shadow-soft animate-slide-up ${shuffling ? 'animate-pulse' : ''}`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline">{match.table}</Badge>
                    <span className="text-sm font-normal text-muted-foreground">
                      {match.rule}
                    </span>
                  </CardTitle>
                  <Badge 
                    variant="outline"
                    className={getRuleColor(match.rule)}
                  >
                    {match.rule === "トランプルール" ? "♠️" : "➕"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Player 1 */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm bg-background">
                          {match.player1.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{match.player1.name}</p>
                        <div className="flex gap-1">
                          {match.player1.badges.map((badge, badgeIndex) => (
                            <Badge key={badgeIndex} variant="outline" className="text-xs px-1 py-0">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">{match.player1.rating}pt</span>
                    </div>
                  </div>

                  {/* VS */}
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-8 h-8 bg-gradient-gold rounded-full">
                      <span className="text-sm font-bold text-white">VS</span>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm bg-background">
                          {match.player2.name.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{match.player2.name}</p>
                        <div className="flex gap-1">
                          {match.player2.badges.map((badge, badgeIndex) => (
                            <Badge key={badgeIndex} variant="outline" className="text-xs px-1 py-0">
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-primary">{match.player2.rating}pt</span>
                    </div>
                  </div>

                  {/* Expected Results */}
                  <div className="text-center text-xs text-muted-foreground bg-background/50 rounded-lg p-2">
                    レート差: {Math.abs(match.player1.rating - match.player2.rating)}pt
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Start Button */}
        <div className="pt-4">
          <Button 
            onClick={onStartCountdown}
            className="w-full"
            size="lg"
            disabled={shuffling}
          >
            <Play className="h-5 w-5 mr-2" />
            対戦開始
          </Button>
        </div>
        )}
      </main>
    </div>
  );
};