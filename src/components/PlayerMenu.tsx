import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { BarChart3, History, Settings, HelpCircle, Trophy, User, LogOut, Shield } from 'lucide-react';

interface PlayerMenuProps {
  onNavigate: (page: string) => void;
}

export const PlayerMenu = ({ onNavigate }: PlayerMenuProps) => {
  const menuItems = [
    {
      icon: BarChart3,
      title: "統計",
      description: "累積データ・レート変動グラフ",
      page: "stats"
    },
    {
      icon: Trophy,
      title: "実績",
      description: "獲得バッジ・年間成績",
      page: "achievements"
    },
    {
      icon: History,
      title: "履歴",
      description: "対戦記録・大会参加履歴",
      page: "history"
    },
    {
      icon: User,
      title: "プロフィール",
      description: "ニックネーム・画像設定",
      page: "profile"
    },
    {
      icon: Settings,
      title: "設定",
      description: "通知・表示設定",
      page: "settings"
    },
    {
      icon: HelpCircle,
      title: "ヘルプ",
      description: "使い方・ルール説明",
      page: "help"
    },
    {
      icon: Shield,
      title: "管理者モード",
      description: "大会管理・承認機能",
      page: "admin"
    }
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 bg-gradient-parchment border-fantasy-frame">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Trophy className="h-5 w-5 text-primary" />
            メニュー
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-2">
          {menuItems.map((item, index) => (
            <Button
              key={item.page}
              variant="ghost"
              className="w-full h-auto p-4 justify-start hover:bg-accent/50 animate-slide-in-right"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onNavigate(item.page)}
            >
              <div className="flex items-center gap-3 w-full">
                <item.icon className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.description}</div>
                </div>
              </div>
            </Button>
          ))}
          
          <div className="pt-4 border-t border-fantasy-frame/20">
            <Button
              variant="ghost"
              className="w-full h-auto p-4 justify-start hover:bg-destructive/10 text-destructive"
              onClick={() => onNavigate("logout")}
            >
              <div className="flex items-center gap-3">
                <LogOut className="h-5 w-5" />
                <span className="font-medium">ログアウト</span>
              </div>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};