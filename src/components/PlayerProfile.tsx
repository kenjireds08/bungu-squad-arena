import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User, Camera, Save, Star, Calendar, Trophy, Loader2 } from 'lucide-react';
import { usePlayer } from '@/hooks/useApi';

interface PlayerProfileProps {
  onClose: () => void;
  currentUserId: string;
}

// Mock profile data
const mockProfile = {
  nickname: "プレイヤー1",
  email: "player1@example.com",
  joinDate: "2024-04-15",
  profileImage: null,
  currentRating: 1650,
  highestRating: 1720,
  totalGames: 45,
  championBadges: ["🥉"], // 昨年3位
  ruleBadges: ["➕"], // カードプラスルール習得済み
  achievements: [
    { title: "初勝利", description: "初めての勝利を達成", date: "2024-04-20" },
    { title: "10戦達成", description: "累計10戦に到達", date: "2024-05-15" },
    { title: "勝率50%達成", description: "勝率50%を突破", date: "2024-06-01" },
    { title: "レート1600突破", description: "レーティング1600を達成", date: "2024-06-20" }
  ]
};

export const PlayerProfile = ({ onClose, currentUserId }: PlayerProfileProps) => {
  const { data: player, isLoading, error } = usePlayer(currentUserId);
  const [nickname, setNickname] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Update nickname when player data loads
  if (player && nickname !== player.nickname) {
    setNickname(player.nickname || '');
  }

  const handleSave = () => {
    // TODO: Save profile changes
    setIsEditing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">プロフィールを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">プロフィールの読み込みに失敗しました</p>
          <Button onClick={onClose}>戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">プロフィール</h1>
              </div>
            </div>
            {isEditing ? (
              <Button variant="fantasy" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4" />
                保存
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                編集
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Info */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Profile Image */}
              <div className="relative">
                <div className="w-24 h-24 mx-auto bg-muted rounded-full flex items-center justify-center border-2 border-fantasy-frame">
                  {player.profile_image_url ? (
                    <img src={player.profile_image_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                {isEditing && (
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Nickname */}
              <div className="space-y-2">
                {isEditing ? (
                  <div className="max-w-xs mx-auto">
                    <Label htmlFor="nickname" className="text-sm">ニックネーム</Label>
                    <Input
                      id="nickname"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="text-center"
                    />
                  </div>
                ) : (
                  <h2 className="text-2xl font-bold text-foreground">{nickname}</h2>
                )}
                
                {/* Badges */}
                <div className="flex items-center justify-center gap-2">
                  {player.champion_badges?.split(',').filter(Boolean).map((badge, index) => (
                    <Badge key={index} variant="secondary" className="bg-gradient-gold">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-primary">{player.current_rating}</div>
                  <div className="text-sm text-muted-foreground">現在レート</div>
                  <div className="text-xs text-muted-foreground">最高: {player.current_rating}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">{(player.total_wins + player.total_losses)}</div>
                  <div className="text-sm text-muted-foreground">総対戦数</div>
                  <div className="text-xs text-muted-foreground">参加日: {formatDate(player.registration_date)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              アカウント情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">メールアドレス</Label>
              <div className="p-2 bg-muted/30 rounded border text-sm">{player.email}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">参加日</Label>
              <div className="p-2 bg-muted/30 rounded border text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                {formatDate(player.registration_date)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              実績バッジ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockProfile.achievements.map((achievement, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-muted/20 rounded-lg border border-fantasy-frame/10"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Star className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{achievement.title}</div>
                  <div className="text-sm text-muted-foreground">{achievement.description}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(achievement.date)}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};