import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Search, Users, Trophy, Star } from 'lucide-react';

interface TournamentParticipantsProps {
  onClose: () => void;
}

const mockParticipants = [
  { 
    id: 1, 
    name: "鈴木さん", 
    rating: 1850, 
    rank: 1,
    badges: ["🥇", "🥇", "🥈", "♠️", "➕"],
    joinDate: "2024/01/15",
    totalMatches: 48,
    winRate: 78
  },
  { 
    id: 2, 
    name: "佐藤さん", 
    rating: 1685, 
    rank: 2,
    badges: ["🥇", "♠️"],
    joinDate: "2024/02/03",
    totalMatches: 35,
    winRate: 71
  },
  { 
    id: 3, 
    name: "田中さん", 
    rating: 1620, 
    rank: 4,
    badges: ["♠️", "➕"],
    joinDate: "2024/03/20",
    totalMatches: 28,
    winRate: 64
  },
  { 
    id: 4, 
    name: "山田さん", 
    rating: 1580, 
    rank: 5,
    badges: ["🥉", "➕"],
    joinDate: "2024/01/08",
    totalMatches: 42,
    winRate: 60
  },
  { 
    id: 5, 
    name: "高橋さん", 
    rating: 1540, 
    rank: 7,
    badges: ["♠️"],
    joinDate: "2024/04/12",
    totalMatches: 22,
    winRate: 55
  },
  { 
    id: 6, 
    name: "中村さん", 
    rating: 1510, 
    rank: 9,
    badges: ["➕"],
    joinDate: "2024/05/18",
    totalMatches: 18,
    winRate: 50
  },
  { 
    id: 7, 
    name: "小林さん", 
    rating: 1480, 
    rank: 12,
    badges: [],
    joinDate: "2024/06/22",
    totalMatches: 12,
    winRate: 42
  },
  { 
    id: 8, 
    name: "加藤さん", 
    rating: 1450, 
    rank: 15,
    badges: ["♠️"],
    joinDate: "2024/07/01",
    totalMatches: 8,
    winRate: 38
  }
];

export const TournamentParticipants = ({ onClose }: TournamentParticipantsProps) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredParticipants = mockParticipants.filter(participant =>
    participant.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈"; 
    if (rank === 3) return "🥉";
    return `${rank}位`;
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 1800) return "text-primary";
    if (rating >= 1600) return "text-success";
    if (rating >= 1400) return "text-info";
    return "text-muted-foreground";
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
            <h1 className="text-lg font-bold text-foreground">参加者一覧</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">第8回BUNGU SQUAD大会</h2>
                <p className="text-sm text-muted-foreground">8/15(木) 19:00〜</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-success" />
                  <span className="font-bold text-success">{mockParticipants.length}名参加</span>
                </div>
                <p className="text-xs text-muted-foreground">定員16名</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="参加者を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Participants List */}
        <div className="space-y-3">
          {filteredParticipants.map((participant, index) => (
            <Card key={participant.id} className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted font-medium">
                        {participant.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.name}</span>
                        <div className="flex gap-1">
                          {participant.badges.map((badge, badgeIndex) => (
                            <Badge 
                              key={badgeIndex} 
                              variant={badge.includes('🥇') || badge.includes('🥈') || badge.includes('🥉') ? "default" : "outline"}
                              className="text-xs px-1 py-0"
                            >
                              {badge}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>参加日: {participant.joinDate}</span>
                        <span>{participant.totalMatches}戦 勝率{participant.winRate}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <Trophy className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{getRankIcon(participant.rank)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-primary" />
                      <span className={`text-sm font-bold ${getRatingColor(participant.rating)}`}>
                        {participant.rating}pt
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredParticipants.length === 0 && (
          <Card className="border-muted">
            <CardContent className="pt-8 pb-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">該当する参加者が見つかりません</p>
            </CardContent>
          </Card>
        )}

        {/* Summary Stats */}
        <Card className="border-info shadow-soft">
          <CardHeader>
            <CardTitle className="text-info text-sm">参加者統計</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{mockParticipants.length}</p>
                <p className="text-xs text-muted-foreground">総参加者</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">
                  {Math.round(mockParticipants.reduce((sum, p) => sum + p.rating, 0) / mockParticipants.length)}
                </p>
                <p className="text-xs text-muted-foreground">平均レート</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-info">
                  {mockParticipants.filter(p => p.badges.some(b => b.includes('🥇') || b.includes('🥈') || b.includes('🥉'))).length}
                </p>
                <p className="text-xs text-muted-foreground">チャンピオン経験者</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};