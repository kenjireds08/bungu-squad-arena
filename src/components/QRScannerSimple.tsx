import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const QRScannerSimple = ({ onClose }: { onClose: () => void }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = async () => {
    console.log('QRScannerSimple: カメラ起動開始');
    setError(null);
    setIsScanning(true);

    try {
      // 最もシンプルなgetUserMedia実装
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment'
        }
      });
      
      console.log('QRScannerSimple: ストリーム取得成功');
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // autoplayとplayInlineを確実に設定
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('muted', '');
        
        // play()を明示的に呼び出す
        try {
          await videoRef.current.play();
          console.log('QRScannerSimple: ビデオ再生成功');
        } catch (playError) {
          console.error('QRScannerSimple: ビデオ再生エラー:', playError);
        }
      }
      
      // QRコード検出のためのモック（実際の実装はライブラリを使用）
      setTimeout(() => {
        console.log('QRScannerSimple: QRコード検出デモ（実際にはライブラリ使用）');
        // 実際のQRコード検出処理をここに実装
      }, 3000);
      
    } catch (err) {
      console.error('QRScannerSimple: カメラエラー:', err);
      setError('カメラの起動に失敗しました');
      setIsScanning(false);
      
      toast({
        title: 'カメラエラー',
        description: 'カメラへのアクセスを許可してください',
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    console.log('QRScannerSimple: カメラ停止');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // 手動でQRコードテスト（開発用）
  const handleTestQR = () => {
    const testTournamentId = 'tournament_20250124_1';
    const userId = localStorage.getItem('userId');
    let targetUrl = `/tournament-entry/${testTournamentId}?qr=true&from_qr=true`;
    
    if (userId) {
      targetUrl += `&user_id=${userId}`;
    }
    
    stopCamera();
    navigate(targetUrl);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            QRスキャナー（シンプル版）
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {!isScanning ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                QRコードをスキャンして大会にエントリー
              </p>
              <Button
                onClick={startCamera}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                カメラを起動
              </Button>
              
              {/* 開発用：テストボタン */}
              <Button
                variant="outline"
                onClick={handleTestQR}
                className="w-full"
              >
                テスト用：QRコード読み取りをシミュレート
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">エラー</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                      style={{
                        transform: 'scaleX(-1)' // ミラー表示
                      }}
                    />
                    <div className="absolute inset-0 border-2 border-primary/50 m-8 rounded-lg pointer-events-none" />
                  </div>
                  
                  <p className="text-center text-sm text-muted-foreground">
                    QRコードを枠内に合わせてください
                  </p>
                  
                  <Button
                    variant="outline"
                    onClick={stopCamera}
                    className="w-full"
                  >
                    スキャンを中止
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};