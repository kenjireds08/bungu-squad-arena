import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { QrCode, Trophy, TrendingUp, Calendar, Camera, Star, Users } from 'lucide-react';
import { PlayerRanking } from './PlayerRanking';
import { QRScanner } from './QRScanner';
import { PlayerMenu } from './PlayerMenu';
import { PlayerStats } from './PlayerStats';
import { PlayerHistory } from './PlayerHistory';
import { PlayerProfile } from './PlayerProfile';
import { PlayerAchievements } from './PlayerAchievements';
import { PlayerSettings } from './PlayerSettings';
import { PlayerHelp } from './PlayerHelp';
import { AdminDashboard } from './AdminDashboard';
import mainCharacter from '@/assets/main-character.png';
import pencilWarrior from '@/assets/pencil-warrior.png';
import tapeNinja from '@/assets/tape-ninja.png';

// Mock data for development
const mockUser = {
  nickname: "プレイヤー1",
  currentRank: 3,
  rating: 1650,
  nextRankPoints: 35,
  badges: ["♠️", "➕"],
  championBadges: ["⭐"]
};

const mockTournament = {
  name: "第8回BUNGU SQUAD大会",
  date: "8/15(木)",
  time: "19:00〜",
  location: "○○コミュニティセンター"
};

export const MainDashboard = () => {
  const [currentPage, setCurrentPage] = useState<string>('dashboard');

  const getRankIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈"; 
    if (rank === 3) return "🥉";
    return `${rank}位`;
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const handleTournamentEntry = () => {
    setCurrentPage('qrscanner');
  };

  // Handle different pages
  if (currentPage === 'qrscanner') {
    return <QRScanner onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'ranking') {
    return <PlayerRanking onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'stats') {
    return <PlayerStats onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'history') {
    return <PlayerHistory onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'profile') {
    return <PlayerProfile onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'achievements') {
    return <PlayerAchievements onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'settings') {
    return <PlayerSettings onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'help') {
    return <PlayerHelp onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'admin') {
    return <AdminDashboard onClose={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'logout') {
    // TODO: Implement logout logic
    setCurrentPage('dashboard');
  }

  // TODO: Add other pages (achievements, settings, help, logout)

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">BUNGU SQUAD</h1>
            </div>
            <PlayerMenu onNavigate={handleNavigate} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Player Status Card */}
        <Card className="border-fantasy-frame shadow-golden animate-fade-in">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              {/* Current Rank Display */}
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">
                  {getRankIcon(mockUser.currentRank)} 現在 {mockUser.currentRank}位
                </h2>
                <div className="flex items-center justify-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  <span className="text-xl font-semibold text-primary">
                    {mockUser.rating.toLocaleString()}pt
                  </span>
                  {mockUser.badges.map((badge, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {badge}
                    </Badge>
                  ))}
                  {mockUser.championBadges.map((badge, index) => (
                    <Badge key={index} variant="secondary" className="text-sm bg-gradient-gold">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Progress to Next Rank */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">
                    2位まで後{mockUser.nextRankPoints}pt！
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-gradient-gold h-2 rounded-full transition-all duration-500"
                    style={{ width: '75%' }}
                  />
                </div>
              </div>

              {/* Tournament Entry Button */}
              <Button 
                variant="heroic" 
                size="xl" 
                onClick={handleTournamentEntry}
                className="w-full max-w-xs mx-auto animate-bounce-gentle"
              >
                <Camera className="h-5 w-5" />
                大会にエントリー
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Tournament Info */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Calendar className="h-5 w-5 text-info" />
              次回大会予定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <h3 className="font-semibold text-lg">{mockTournament.name}</h3>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{mockTournament.date} {mockTournament.time}</p>
              <p>場所：{mockTournament.location}</p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="tournament" 
            size="lg" 
            onClick={() => setCurrentPage('ranking')}
            className="h-20 flex-col"
          >
            <Trophy className="h-6 w-6 mb-1" />
            ランキング
          </Button>
          <Button variant="outline" size="lg" className="h-20 flex-col">
            <Users className="h-6 w-6 mb-1" />
            統計
          </Button>
        </div>

        {/* Decorative Characters */}
        <div className="relative text-center py-8">
          <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
            <div className="flex gap-8">
              <img 
                src={pencilWarrior} 
                alt="Pencil Warrior" 
                className="w-16 h-16 object-contain animate-bounce-gentle"
                style={{ animationDelay: '0s' }}
              />
              <img 
                src={tapeNinja} 
                alt="Tape Ninja" 
                className="w-16 h-16 object-contain animate-bounce-gentle"
                style={{ animationDelay: '1s' }}
              />
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm text-muted-foreground font-medium mb-2">
              つなげるんだ。キミの武ん具で。
            </p>
            <p className="text-xs text-muted-foreground/70">
              BUNGU SQUAD ランキングシステム v1.0
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};