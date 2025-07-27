import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock, Trophy, ArrowLeft, Share2, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useRankings, useTournaments } from '@/hooks/useApi';

interface TournamentDetailsProps {
  onClose: () => void;
  onViewParticipants: () => void;
}

const mockTournament = {
  name: "第8回BUNGU SQUAD大会",
  date: "2025年8月15日（木）",
  time: "19:00〜21:30",
  location: "○○コミュニティセンター 2F会議室",
  description: "夏の特別大会！新規参加者歓迎",
  participants: 12,
  maxParticipants: 16,
  entryDeadline: "8月13日（火）23:59",
  rules: [
    "トランプルール・カードプラスルール両対応",
    "スイスドロー方式（参加者数により変更あり）",
    "制限時間：1試合30分"
  ],
  prizes: [
    "1位：ゴールドバッジ🥇 + 記念品",
    "2位：シルバーバッジ🥈 + 記念品", 
    "3位：ブロンズバッジ🥉 + 記念品"
  ],
  recentParticipants: []
};

export const TournamentDetails = ({ onClose, onViewParticipants }: TournamentDetailsProps) => {
  const { data: rankings, isLoading: rankingsLoading } = useRankings();
  const { data: tournaments, isLoading: tournamentsLoading } = useTournaments();
  
  const currentTournament = tournaments?.[0] || mockTournament;
  const topPlayers = rankings?.slice(0, 4) || [];

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: mockTournament.name,
          text: `${mockTournament.name}に参加しませんか？`,
          url: window.location.href
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
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
            <h1 className="text-lg font-bold text-foreground">大会詳細</h1>
            <Button variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in">
          <CardHeader>
            <div className="space-y-2">
              <CardTitle className="text-xl text-foreground">{mockTournament.name}</CardTitle>
              <p className="text-muted-foreground">{mockTournament.description}</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-info" />
                <div>
                  <p className="font-medium">{mockTournament.date}</p>
                  <p className="text-sm text-muted-foreground">{mockTournament.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">開催場所</p>
                  <p className="text-sm text-muted-foreground">{mockTournament.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">参加者状況</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {mockTournament.participants}/{mockTournament.maxParticipants}名
                    </span>
                    <Badge variant={mockTournament.participants < mockTournament.maxParticipants ? "default" : "secondary"}>
                      {mockTournament.participants < mockTournament.maxParticipants ? "募集中" : "満員"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">エントリー締切</p>
                  <p className="text-sm text-muted-foreground">{mockTournament.entryDeadline}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rules */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              大会ルール
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {mockTournament.rules.map((rule, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Prizes */}
        <Card className="border-gold shadow-golden animate-slide-up">
          <CardHeader>
            <CardTitle className="text-primary">賞品・表彰</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {mockTournament.prizes.map((prize, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">🏆</span>
                  <span>{prize}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Recent Participants Preview */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>参加予定者</CardTitle>
              <Button variant="outline" size="sm" onClick={onViewParticipants}>
                全員を見る
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {rankingsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
              </div>
            ) : (
              <div className="space-y-3">
                {topPlayers.map((player, index) => (
                  <div key={player.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-muted">
                          {player.nickname.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{player.nickname}</p>
                        <div className="flex items-center gap-1">
                          {player.champion_badges?.split(',').filter(Boolean).map((badge, badgeIndex) => {
                            // Convert champion symbols to emoji badges (Lovable's improvement)
                            const convertToEmoji = (symbol: string) => {
                              const trimmed = symbol.trim();
                              if (trimmed === '★') return '🥇';
                              if (trimmed === '☆') return '🥈';
                              if (trimmed === '⭐') return '🥉';
                              return trimmed; // Keep game rule badges as is (♠️, ➕)
                            };
                            
                            return (
                              <Badge key={badgeIndex} variant="outline" className="text-xs px-1 py-0">
                                {convertToEmoji(badge)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium text-primary">
                      {player.current_rating}pt
                    </div>
                  </div>
                ))}
                {topPlayers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    参加予定者はまだいません
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="pb-6">
          <Button 
            onClick={onClose}
            className="w-full"
            size="lg"
          >
            戻る
          </Button>
        </div>
      </main>
    </div>
  );
};