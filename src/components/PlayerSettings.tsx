import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Settings, Bell, Moon, Volume2, Smartphone, Globe } from 'lucide-react';

interface PlayerSettingsProps {
  onClose: () => void;
}

export const PlayerSettings = ({ onClose }: PlayerSettingsProps) => {
  const [settings, setSettings] = useState({
    notifications: {
      newTournament: true,
      gameResults: true,
      rankingChanges: true,
      achievements: true
    },
    display: {
      darkMode: false,
      animations: true,
      soundEffects: false
    },
    app: {
      autoLogin: true,
      dataSync: true
    }
  });

  const toggleSetting = (category: keyof typeof settings, key: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key as keyof typeof prev[typeof category]]
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background - Pencil (writing settings) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:bg-[length:60%] bg-[length:85%]"
        style={{
          backgroundImage: `url('/assets/characters/pencil.png')`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center center',
          opacity: 0.08,
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Settings className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">設定</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Notification Settings */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              通知設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">新しい大会の通知</Label>
                <div className="text-xs text-muted-foreground">新しい大会が作成された時に通知します</div>
              </div>
              <Switch
                checked={settings.notifications.newTournament}
                onCheckedChange={() => toggleSetting('notifications', 'newTournament')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">試合結果の通知</Label>
                <div className="text-xs text-muted-foreground">対戦結果が承認された時に通知します</div>
              </div>
              <Switch
                checked={settings.notifications.gameResults}
                onCheckedChange={() => toggleSetting('notifications', 'gameResults')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">ランキング変動の通知</Label>
                <div className="text-xs text-muted-foreground">順位に変動があった時に通知します</div>
              </div>
              <Switch
                checked={settings.notifications.rankingChanges}
                onCheckedChange={() => toggleSetting('notifications', 'rankingChanges')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">実績獲得の通知</Label>
                <div className="text-xs text-muted-foreground">新しい実績を獲得した時に通知します</div>
              </div>
              <Switch
                checked={settings.notifications.achievements}
                onCheckedChange={() => toggleSetting('notifications', 'achievements')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Display Settings */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              表示設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">ダークモード</Label>
                <div className="text-xs text-muted-foreground">画面を暗いテーマに切り替えます</div>
              </div>
              <Switch
                checked={settings.display.darkMode}
                onCheckedChange={() => toggleSetting('display', 'darkMode')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">アニメーション</Label>
                <div className="text-xs text-muted-foreground">画面の動きや効果を有効にします</div>
              </div>
              <Switch
                checked={settings.display.animations}
                onCheckedChange={() => toggleSetting('display', 'animations')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">効果音</Label>
                <div className="text-xs text-muted-foreground">ボタンタップ時などに音を再生します</div>
              </div>
              <Switch
                checked={settings.display.soundEffects}
                onCheckedChange={() => toggleSetting('display', 'soundEffects')}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              アプリ設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">自動ログイン</Label>
                <div className="text-xs text-muted-foreground">アプリ起動時に自動でログインします</div>
              </div>
              <Switch
                checked={settings.app.autoLogin}
                onCheckedChange={() => toggleSetting('app', 'autoLogin')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">データ同期</Label>
                <div className="text-xs text-muted-foreground">データを自動的に同期します</div>
              </div>
              <Switch
                checked={settings.app.dataSync}
                onCheckedChange={() => toggleSetting('app', 'dataSync')}
              />
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30" style={{ animationDelay: '300ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              アプリ情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">バージョン</span>
              <span className="font-mono">v1.0.0</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">最終更新</span>
              <span className="font-mono">2024-07-24</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">開発者</span>
              <span>ちーけん</span>
            </div>
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
  );
};