import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, QrCode, CheckCircle, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onClose: () => void;
}

export const QRScanner = ({ onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);

  const handleStartScan = () => {
    setIsScanning(true);
    // Simulate scanning process
    setTimeout(() => {
      setIsScanning(false);
      setScanResult('success');
    }, 2000);
  };

  const handleRetry = () => {
    setScanResult(null);
  };

  if (scanResult === 'success') {
    return (
      <div className="min-h-screen bg-gradient-parchment">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">大会エントリー</h1>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <Card className="border-fantasy-frame shadow-golden animate-fade-in">
            <CardContent className="pt-6">
              <div className="text-center space-y-6">
                <div className="w-20 h-20 mx-auto bg-success rounded-full flex items-center justify-center animate-bounce-gentle">
                  <CheckCircle className="h-10 w-10 text-success-foreground" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-success">エントリー完了！</h2>
                  <p className="text-muted-foreground">
                    第8回BUNGU SQUAD大会にエントリーしました
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold">大会情報</h3>
                  <div className="text-sm space-y-1">
                    <p>日時: 8/15(木) 19:00〜</p>
                    <p>場所: ○○コミュニティセンター</p>
                    <p>参加人数: 12名（あなたを含む）</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button variant="fantasy" size="lg" className="w-full">
                    対戦相手を確認
                  </Button>
                  <Button variant="outline" onClick={onClose} className="w-full">
                    メイン画面に戻る
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  テープ忍者があなたの参加を歓迎しています！
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

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
              <QrCode className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">QRコード読み取り</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Scanner Content */}
      <main className="container mx-auto px-4 py-6">
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader>
            <CardTitle className="text-center">大会QRコードをスキャン</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Camera View Placeholder */}
            <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-fantasy-frame flex items-center justify-center relative overflow-hidden">
              {isScanning ? (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-muted-foreground">スキャン中...</p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      QRコードをフレーム内に合わせてください
                    </p>
                    <p className="text-xs text-muted-foreground">
                      会場で配布されたQRコードを読み取ります
                    </p>
                  </div>
                </div>
              )}
              
              {/* Scanning Frame Overlay */}
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-primary rounded-lg"></div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-info">スキャン方法</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• QRコードをカメラに向けてください</li>
                      <li>• コードがフレーム内に入るよう調整</li>
                      <li>• 自動的に読み取りが開始されます</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isScanning && (
                  <Button 
                    variant="heroic" 
                    size="lg" 
                    onClick={handleStartScan}
                    className="w-full"
                  >
                    <Camera className="h-5 w-5" />
                    カメラを起動
                  </Button>
                )}

                {scanResult === 'error' && (
                  <div className="space-y-3">
                    <div className="text-center text-destructive text-sm">
                      QRコードを読み取れませんでした
                    </div>
                    <Button variant="outline" onClick={handleRetry} className="w-full">
                      もう一度試す
                    </Button>
                  </div>
                )}

                <Button variant="ghost" onClick={onClose} className="w-full">
                  キャンセル
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};