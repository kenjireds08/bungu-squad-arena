import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Calendar, MapPin, Users, ArrowLeft, Trophy } from 'lucide-react';
import tapeNinja from '@/assets/tape-ninja.png';

interface TournamentEntryCompleteProps {
  onClose: () => void;
  onViewTournament: () => void;
}

const mockTournament = {
  name: "第8回BUNGU SQUAD大会",
  date: "2025年8月15日（木）",
  time: "19:00〜21:30",
  location: "○○コミュニティセンター 2F会議室",
  participants: 12,
  maxParticipants: 16,
  rule: "トランプルール・カードプラスルール両対応"
};

export const TournamentEntryComplete = ({ onClose, onViewTournament }: TournamentEntryCompleteProps) => {
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
            <h1 className="text-lg font-bold text-foreground">エントリー完了</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Success Message */}
        <Card className="border-success shadow-golden animate-fade-in text-center">
          <CardContent className="pt-8 pb-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-16 w-16 text-success animate-bounce-gentle" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-success mb-2">エントリー完了！</h2>
                <p className="text-muted-foreground">
                  大会への参加登録が完了しました
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Details */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-primary" />
              大会詳細
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-bold text-lg mb-2">{mockTournament.name}</h3>
              <Badge variant="outline" className="mb-3">
                {mockTournament.rule}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-info mt-0.5" />
                <div>
                  <p className="font-medium">{mockTournament.date}</p>
                  <p className="text-sm text-muted-foreground">{mockTournament.time}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium">開催場所</p>
                  <p className="text-sm text-muted-foreground">{mockTournament.location}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium">参加者状況</p>
                  <p className="text-sm text-muted-foreground">
                    {mockTournament.participants}/{mockTournament.maxParticipants}名
                    <span className="ml-2 text-success">（あと{mockTournament.maxParticipants - mockTournament.participants}名参加可能）</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="border-info shadow-soft animate-slide-up">
          <CardHeader>
            <CardTitle className="text-info">当日の流れ</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>開始10分前に会場にお越しください</li>
              <li>受付でお名前をお伝えください</li>
              <li>対戦カードが発表されます</li>
              <li>試合開始・アプリで結果を報告</li>
              <li>全試合終了後、順位発表</li>
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button 
            onClick={onViewTournament}
            className="w-full"
            size="lg"
          >
            <Users className="h-5 w-5 mr-2" />
            参加者一覧を見る
          </Button>

          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
            size="lg"
          >
            メイン画面に戻る
          </Button>
        </div>

        {/* Character */}
        <div className="text-center py-4">
          <div className="flex justify-center mb-4">
            <img 
              src={tapeNinja} 
              alt="Tape Ninja welcoming" 
              className="w-20 h-20 object-contain animate-bounce-gentle"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            テープ忍者：「参加ありがとうございます！当日お待ちしています！」
          </p>
        </div>
      </main>
    </div>
  );
};