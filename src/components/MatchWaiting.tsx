import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Clock, MapPin, Play } from 'lucide-react';

interface MatchWaitingProps {
  onClose: () => void;
  onStartMatch: () => void;
}

// Mock match data
const mockMatch = {
  tournament: "第8回BUNGU SQUAD大会",
  opponent: {
    name: "田中さん",
    rating: 1620,
    badges: ["♠️", "➕"]
  },
  table: "卓2",
  rule: "カードプラスルール",
  scheduledTime: "19:30",
  estimatedDuration: "約20分"
};

export const MatchWaiting = ({ onClose, onStartMatch }: MatchWaitingProps) => {
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
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">対戦待機</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-primary">{mockMatch.tournament}</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>開始予定：{mockMatch.scheduledTime}〜</span>
            </div>
            <div className="text-xs text-muted-foreground">{mockMatch.estimatedDuration}</div>
          </CardContent>
        </Card>

        {/* Match Details */}
        <Card className="border-fantasy-frame shadow-golden animate-slide-up">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              {/* VS Display */}
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">対戦相手</div>
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <div className="font-semibold">あなた</div>
                    <div className="text-sm text-muted-foreground">1650pt</div>
                  </div>
                  
                  <div className="text-2xl font-bold text-muted-foreground">VS</div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-accent/50 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Users className="h-8 w-8 text-accent-foreground" />
                    </div>
                    <div className="font-semibold">{mockMatch.opponent.name}</div>
                    <div className="text-sm text-muted-foreground">{mockMatch.opponent.rating}pt</div>
                  </div>
                </div>
                
                {/* Opponent Badges */}
                <div className="flex items-center justify-center gap-2">
                  {mockMatch.opponent.badges.map((badge, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Game Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="font-semibold">{mockMatch.table}</div>
                    <div className="text-xs text-muted-foreground">卓番号</div>
                  </div>
                  
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Play className="h-5 w-5 mx-auto mb-1 text-primary" />
                    <div className="font-semibold text-sm">{mockMatch.rule}</div>
                    <div className="text-xs text-muted-foreground">適用ルール</div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <Button 
                variant="heroic" 
                size="xl" 
                onClick={onStartMatch}
                className="w-full max-w-xs mx-auto animate-bounce-gentle"
              >
                <Play className="h-5 w-5" />
                対戦開始
              </Button>

              {/* Instructions */}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>💡 指定された卓で対戦相手をお待ちください</p>
                <p>🎮 準備ができたら「対戦開始」ボタンを押してください</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};