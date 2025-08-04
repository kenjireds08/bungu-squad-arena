import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trophy, Star, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { useRankings } from '@/hooks/useApi';
import { PullToRefresh } from './PullToRefresh';

interface PlayerRankingProps {
  onClose: () => void;
}

export const PlayerRanking = ({ onClose }: PlayerRankingProps) => {
  const { data: rankings, isLoading, error } = useRankings();
  
  const handleRefresh = async () => {
    try {
      // Add visual feedback
      const refreshButton = document.querySelector('[data-refresh-button]') as HTMLElement;
      if (refreshButton) {
        refreshButton.style.animation = 'spin 1s linear infinite';
      }

      // Clear all caches first
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('All caches cleared');
      }

      // Force Service Worker update
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
          console.log('Service Worker updated');
        }
      }

      await new Promise(resolve => setTimeout(resolve, 800));
      window.location.reload();
    } catch (error) {
      console.error('Refresh failed:', error);
      window.location.reload();
    }
  };
  
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">ランキングを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive">ランキングの読み込みに失敗しました</p>
          <Button onClick={onClose}>戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">プレイヤーランキング</h1>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              data-refresh-button
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="ml-1 hidden sm:inline">更新</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Rankings List */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-3">
          {rankings?.map((player, index) => (
            <Card 
              key={player.id} 
              className={`
                border-fantasy-frame shadow-soft animate-slide-up transition-all hover:shadow-golden
                ${player.nickname === 'あなた' ? 'ring-2 ring-primary bg-accent/50' : ''}
              `}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  {/* Rank and Player Info */}
                  <div className="flex items-center gap-3">
                    <div className="text-xl font-bold w-12 text-center">
                      {getRankIcon(player.rank || index + 1)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${player.nickname === 'あなた' ? 'text-primary' : 'text-foreground'}`}>
                          {player.nickname}
                        </span>
                        <div className="flex gap-1 items-center">
                           {/* Badges display */}
                          {player.champion_badges?.split(',').filter(Boolean).map((badge, badgeIndex) => (
                            <span 
                              key={badgeIndex} 
                              className="text-base leading-none"
                              title={badge.trim().match(/[🥇🥈🥉]/) ? "チャンピオンバッジ" : "ルール習得バッジ"}
                            >
                              {badge.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 text-primary" />
                        <span className="font-mono text-sm">{player.current_rating.toLocaleString()}pt</span>
                        <div className="text-xs text-muted-foreground">
                          {(player.total_wins + player.total_losses)}試合
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info for Current User */}
                  {player.nickname === 'あなた' && (
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
            <p>🥇🥈🥉: 年間チャンピオンバッジ（金・銀・銅）</p>
            <p>♠️: トランプルール習得済み　➕: カードプラスルール習得済み</p>
          </div>
        </div>
      </main>
    </PullToRefresh>
  );
};