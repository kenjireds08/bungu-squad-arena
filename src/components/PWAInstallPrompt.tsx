import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';

interface PWAInstallPromptProps {
  onClose: () => void;
}

export const PWAInstallPrompt = ({ onClose }: PWAInstallPromptProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const IOSInstructions = () => (
    <div className="space-y-3 text-sm">
      <p className="font-medium">iPhoneでホーム画面に追加する方法：</p>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
        <li>画面下部の共有ボタン <span className="inline-block w-4 h-4 bg-blue-500 rounded text-white text-xs text-center">↑</span> をタップ</li>
        <li>「ホーム画面に追加」を選択</li>
        <li>「追加」をタップして完了</li>
      </ol>
    </div>
  );

  const AndroidInstructions = () => (
    <div className="space-y-3 text-sm">
      <p className="font-medium">Androidでアプリとしてインストールする方法：</p>
      {deferredPrompt ? (
        <div className="space-y-2">
          <Button onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 mr-2" />
            アプリをインストール
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            このボタンを押すと、アプリとして正しくインストールされます
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 font-medium text-xs mb-2">⚠️ 重要</p>
            <p className="text-amber-700 text-xs">
              Chromeのメニューから「ホーム画面に追加」すると、ショートカットになってしまいます。
              正しいアプリとしてインストールするには以下をお試しください：
            </p>
          </div>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>ページを再読み込みしてください</li>
            <li>「アプリをインストール」ボタンが表示されるまで待つ</li>
            <li>ボタンが表示されない場合は、Chromeのメニュー（⋮）から「アプリをインストール」を探す</li>
            <li>「ホーム画面に追加」ではなく「アプリをインストール」を選択</li>
          </ol>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border-primary shadow-golden animate-scale-in">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-primary">
              <Smartphone className="h-5 w-5" />
              アプリとして使う
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="text-2xl">📱</div>
            <p className="font-medium">より便利にご利用いただけます</p>
            <p className="text-sm text-muted-foreground">
              ホーム画面に追加すると、アプリのように快適に使えます
            </p>
          </div>

          <div className="bg-muted rounded-lg p-3 text-sm">
            <h4 className="font-medium mb-2">✨ メリット</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• ワンタップで素早く起動</li>
              <li>• オフラインでも基本機能が使える</li>
              <li>• URLバーが非表示でスッキリ</li>
              <li>• プッシュ通知を受け取れる</li>
            </ul>
          </div>

          {isIOS ? <IOSInstructions /> : <AndroidInstructions />}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              今はしない
            </Button>
            {!isIOS && !deferredPrompt && (
              <Button onClick={onClose} className="flex-1">
                理解しました
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};