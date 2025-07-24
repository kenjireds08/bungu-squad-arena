import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Star, TrendingUp } from 'lucide-react';

// Mock ranking data
const mockRankings = [
  { rank: 1, name: "鈴木さん", rating: 1850, badges: ["★", "★", "☆", "♠️", "➕"], trend: "+45" },
  { rank: 2, name: "佐藤さん", rating: 1685, badges: ["★", "♠️"], trend: "+12" },
  { rank: 3, name: "あなた", rating: 1650, badges: ["➕"], trend: "+8", isCurrentUser: true },
  { rank: 4, name: "田中さん", rating: 1620, badges: ["♠️", "➕"], trend: "-15" },
  { rank: 5, name: "山田さん", rating: 1580, badges: ["⭐", "➕"], trend: "+23" },
  { rank: 6, name: "高橋さん", rating: 1555, badges: ["♠️"], trend: "-8" },
  { rank: 7, name: "中村さん", rating: 1520, badges: ["➕"], trend: "+35" },
  { rank: 8, name: "小林さん", rating: 1495, badges: ["♠️"], trend: "-22" },
];

interface PlayerRankingProps {
  onClose: () => void;
}

export const PlayerRanking = ({ onClose }: PlayerRankingProps) => {
  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈"; 
    if (rank === 3) return "🥉";
    return rank;
  };

  const getTrendColor = (trend: string) => {
    if (trend.startsWith('+')) return 'text-success';
    if (trend.startsWith('-')) return 'text-destructive';
    return 'text-muted-foreground';
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
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">プレイヤーランキング</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Rankings List */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-3">
          {mockRankings.map((player, index) => (
            <Card 
              key={player.rank} 
              className={`
                border-fantasy-frame shadow-soft animate-slide-up transition-all hover:shadow-golden
                ${player.isCurrentUser ? 'ring-2 ring-primary bg-accent/50' : ''}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Rank and Player Info */}
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold w-12 text-center">
                      {getRankIcon(player.rank)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${player.isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                          {player.name}
                        </span>
                        <div className="flex gap-1">
                          {player.badges.map((badge, badgeIndex) => (
                            <Badge 
                              key={badgeIndex} 
                              variant={badge.match(/[★☆⭐]/) ? "default" : "outline"}
                              className={`text-xs ${badge.match(/[★☆⭐]/) ? 'bg-gradient-gold' : ''}`}
                            >
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm">{player.rating.toLocaleString()}pt</span>
                        <div className={`flex items-center gap-1 ${getTrendColor(player.trend)}`}>
                          <TrendingUp className="h-3 w-3" />
                          <span className="text-xs font-mono">{player.trend}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info for Current User */}
                  {player.isCurrentUser && (
                    <div className="text-right">
                      <Badge variant="secondary" className="bg-gradient-gold">
                        あなた
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center space-y-2">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>バッジの意味:</strong></p>
            <p>★☆⭐: 年間チャンピオンバッジ（金・銀・銅）</p>
            <p>♠️: トランプルール習得済み　➕: カードプラスルール習得済み</p>
          </div>
        </div>
      </main>
    </div>
  );
};