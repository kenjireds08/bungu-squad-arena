import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ArrowLeft, HelpCircle, Book, Users, Trophy, QrCode, Star, Smartphone, Calendar } from 'lucide-react';

interface PlayerHelpProps {
  onClose: () => void;
}

export const PlayerHelp = ({ onClose }: PlayerHelpProps) => {
  return (
    <div className="min-h-screen bg-gradient-parchment relative overflow-hidden">
      {/* Character Background - Tape (holding information together) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 md:bg-[length:60%] bg-[length:85%]"
        style={{
          backgroundImage: `url('/assets/characters/tape.png')`,
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
              <HelpCircle className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">ヘルプ</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Quick Start Guide */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Book className="h-5 w-5 text-primary" />
              はじめに
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <h3 className="font-semibold text-info mb-2">BUNGU SQUADランキングシステムへようこそ！</h3>
              <p className="text-sm text-muted-foreground">
                このアプリはBUNGU SQUADボードゲームのプレイヤーランキングを管理し、
                年間チャンピオンを決定するためのシステムです。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              よくある質問
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tournament-entry">
                <AccordionTrigger className="flex items-center gap-2 text-left justify-start w-full [&>svg]:ml-auto">
                  <QrCode className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-left">大会への参加方法は？</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pl-6">
                  <p className="text-sm">大会に参加するには以下の手順を行ってください：</p>
                  <ol className="text-sm space-y-1 pl-6 list-decimal text-muted-foreground">
                    <li>メイン画面の「大会にエントリー」ボタンをタップ</li>
                    <li>QRコードリーダーが起動します</li>
                    <li>会場で配布されたQRコードを読み取り</li>
                    <li>自動的に大会にエントリー完了</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rating-system">
                <AccordionTrigger className="flex items-center gap-2 text-left justify-start w-full [&>svg]:ml-auto">
                  <Star className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-left">レーティングシステムについて</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pl-6">
                  <p className="text-sm text-muted-foreground">
                    このシステムではEloレーティング方式を採用しています。
                  </p>
                  <ul className="text-sm space-y-1 pl-6 list-disc text-muted-foreground">
                    <li>対戦相手の強さを考慮してポイント変動を計算</li>
                    <li>強い相手に勝つとより多くのポイントを獲得</li>
                    <li>弱い相手に負けるとより多くのポイントを失う</li>
                    <li>全員1500ポイントからスタート</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="badges">
                <AccordionTrigger className="flex items-center gap-2 text-left justify-start w-full [&>svg]:ml-auto">
                  <Trophy className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-left">バッジの意味は？</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pl-6">
                  <div className="text-sm space-y-2">
                    <div>
                      <p className="font-medium">チャンピオンバッジ:</p>
                      <ul className="pl-6 list-disc text-muted-foreground">
                        <li>🥇: 年間1位（金メダル）</li>
                        <li>🥈: 年間2位（銀メダル）</li>
                        <li>🥉: 年間3位（銅メダル）</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium">ルールバッジ:</p>
                      <ul className="pl-6 list-disc text-muted-foreground">
                        <li>♠️: トランプルール習得済み</li>
                        <li>➕: カードプラスルール習得済み</li>
                      </ul>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="game-flow">
                <AccordionTrigger className="flex items-center gap-2 text-left justify-start w-full [&>svg]:ml-auto">
                  <Users className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-left">試合の流れは？</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pl-6">
                  <ol className="text-sm space-y-1 pl-6 list-decimal text-muted-foreground">
                    <li>大会エントリー後、対戦相手が決定</li>
                    <li>指定された卓で試合開始</li>
                    <li>試合終了後、管理者が勝敗を入力</li>
                    <li>レーティングが自動更新</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="pwa-install">
                <AccordionTrigger className="flex items-center gap-2 text-left justify-start w-full [&>svg]:ml-auto">
                  <Smartphone className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-left">ホーム画面への追加方法</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pl-6">
                  <div className="text-sm space-y-2">
                    <p className="font-medium">iPhone (Safari):</p>
                    <ol className="pl-6 list-decimal text-muted-foreground space-y-1">
                      <li>下部の共有ボタン（□↑）をタップ</li>
                      <li>「ホーム画面に追加」を選択</li>
                      <li>「追加」をタップ</li>
                    </ol>
                    
                    <p className="font-medium mt-3">Android (Chrome):</p>
                    <ol className="pl-6 list-decimal text-muted-foreground space-y-1">
                      <li>右上のメニュー（⋮）をタップ</li>
                      <li>「ホーム画面に追加」を選択</li>
                      <li>「追加」をタップ</li>
                    </ol>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="year-cycle">
                <AccordionTrigger className="flex items-center gap-2 text-left justify-start w-full [&>svg]:ml-auto">
                  <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="flex-1 text-left">年間サイクルについて</span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2 pl-6">
                  <ul className="text-sm space-y-1 pl-6 list-disc text-muted-foreground">
                    <li>毎年1月1日に年間レーティングがリセット</li>
                    <li>12月31日時点の順位で年間チャンピオンを決定</li>
                    <li>累積データは永続保存されます</li>
                    <li>チャンピオンバッジは永久に表示</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up bg-background/30" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              お問い合わせ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              <p className="text-sm">
                ご不明な点やお困りのことがありましたら、
                大会会場でスタッフにお声がけください。
              </p>
              <div className="text-xs text-muted-foreground">
                <p>システム開発者: ちーけん</p>
                <p>大会運営: ワラビサコさん、ヨッスィーオさん</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
      </div>
    </div>
  );
};