import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QrScanner from 'qr-scanner';
import { TournamentEntryComplete } from './TournamentEntryComplete';

interface QRScannerProps {
  onClose: () => void;
  onEntryComplete?: () => void;
  currentUserId?: string;
}

export const QRScanner = ({ onClose, onEntryComplete, currentUserId }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const { toast } = useToast();

  // Initialize QR Scanner when component mounts
  useEffect(() => {
    if (videoRef.current) {
      setupQrScanner();
    }
    
    return () => {
      cleanup();
    };
  }, []);

  const setupQrScanner = () => {
    if (!videoRef.current) return;

    console.log('BUNGU SQUAD: qr-scannerライブラリでQRスキャナー初期化');
    
    // Create QR Scanner instance
    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => {
        handleQRDetected(result);
      }
    );

    qrScannerRef.current = qrScanner;
    console.log('BUNGU SQUAD: QRスキャナー初期化完了');
  };

  const startCamera = async () => {
    if (!qrScannerRef.current || !videoRef.current) {
      console.error('BUNGU SQUAD: QRスキャナーまたはビデオ要素が見つかりません');
      setCameraError('QRスキャナーの初期化に失敗しました');
      return;
    }

    console.log('BUNGU SQUAD: qr-scannerでカメラ起動開始');
    setIsInitializing(true);
    setCameraError(null);

    try {
      // Check if camera is available
      const hasCamera = await QrScanner.hasCamera();
      if (!hasCamera) {
        throw new Error('カメラが利用できません');
      }

      // Start QR Scanner
      await qrScannerRef.current.start();
      
      console.log('BUNGU SQUAD: QRスキャナー起動成功');
      setIsScanning(true);
      setIsInitializing(false);

      // Ensure video is visible after starting
      setTimeout(() => {
        if (videoRef.current) {
          console.log('BUNGU SQUAD: ビデオ表示を強制');
          const video = videoRef.current;
          video.style.opacity = '1';
          video.style.visibility = 'visible';
          video.style.display = 'block';
          video.style.width = '100%';
          video.style.height = '100%';
          video.style.objectFit = 'cover';
          
          // Force video to play if paused
          if (video.paused) {
            video.play().catch(console.error);
          }
          
          console.log('BUNGU SQUAD: ビデオプロパティ:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            srcObject: !!video.srcObject,
            readyState: video.readyState
          });
        }
      }, 200);

      // Additional check after a bit more time
      setTimeout(() => {
        if (videoRef.current) {
          const video = videoRef.current;
          console.log('BUNGU SQUAD: 1秒後のビデオ状態:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            paused: video.paused,
            srcObject: !!video.srcObject,
            currentSrc: video.currentSrc
          });
          
          // Force styles again if needed
          if (video.style.opacity !== '1') {
            console.log('BUNGU SQUAD: スタイルを再適用');
            video.style.opacity = '1';
            video.style.display = 'block';
          }
        }
      }, 1000);

      toast({
        title: "QRスキャナー起動",
        description: "QRコードをカメラに向けてください。",
      });

    } catch (error: any) {
      console.error('BUNGU SQUAD: QRスキャナー起動エラー:', error);
      setIsInitializing(false);
      
      let errorMessage = 'カメラの起動に失敗しました';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'カメラの使用が許可されていません。ブラウザの設定でカメラへのアクセスを許可してください。';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'カメラが見つかりません。デバイスにカメラが接続されているか確認してください。';
      } else if (error.name === 'NotSupportedError' || error.name === 'NotReadableError') {
        errorMessage = 'カメラにアクセスできません。他のアプリでカメラが使用中の可能性があります。';
      }
      
      setCameraError(errorMessage);
      
      toast({
        title: "カメラエラー",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    console.log('BUNGU SQUAD: QRスキャナー停止中...');
    
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  };

  const cleanup = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  const handleQRDetected = async (data: string) => {
    console.log('BUNGU SQUAD: QRコード検出!', data);
    console.log('BUNGU SQUAD: QRコードの内容:', JSON.stringify(data));
    
    // Stop scanning immediately to prevent multiple detections
    stopCamera();
    
    // More flexible URL validation - check for tournament-entry anywhere in the URL
    const isTournamentUrl = data.includes('tournament-entry') || 
                           data.includes('tournaments') || 
                           data.match(/\/tournament/i);
    
    console.log('BUNGU SQUAD: トーナメントURL判定:', isTournamentUrl);
    
    if (isTournamentUrl) {
      setScanResult('success');
      
      toast({
        title: "QRコード読み取り成功！",
        description: "大会エントリーが完了しました",
      });
      
      // Update tournament active status if user is logged in
      if (currentUserId) {
        try {
          await fetch(`/api/players?id=${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updateTournamentActive: true })
          });
          console.log('Tournament active status updated for player:', currentUserId);
          
          // Navigate to the waiting room after 5 seconds
          setTimeout(() => {
            // Navigate to tournament waiting page
            window.location.href = '/tournament-waiting';
          }, 5000);
          
        } catch (error) {
          console.error('Failed to update tournament active status:', error);
          // Even if API fails, still navigate to tournament waiting
          setTimeout(() => {
            window.location.href = '/tournament-waiting';
          }, 5000);
        }
      } else {
        // Not logged in, redirect to entry page after 2 seconds
        setTimeout(() => {
          window.location.href = data;
        }, 2000);
      }
      
    } else {
      setScanResult('error');
      toast({
        title: "無効なQRコード",
        description: "大会のQRコードをスキャンしてください。",
        variant: "destructive"
      });
      
      // Allow retry after error
      setTimeout(() => {
        setScanResult(null);
        startCamera();
      }, 3000);
    }
  };

  const handleRetry = () => {
    setScanResult(null);
    setCameraError(null);
    startCamera();
  };

  // Show success state
  if (scanResult === 'success') {
    return (
      <TournamentEntryComplete 
        onClose={onClose}
        onViewTournament={() => {
          // This will be handled by the automatic navigation in handleQRDetected
          // The TournamentEntryComplete component will just show the countdown
        }}
        disableAutoTransition={true}
      />
    );
  }

  // Show error state
  if (scanResult === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">無効なQRコード</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              大会のQRコードをスキャンしてください。
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              3秒後に自動的に再開されます...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global styles for video element */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .qr-scanner-video {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            background: transparent !important;
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
          }
          .qr-scanner-video::-webkit-media-controls {
            display: none !important;
          }
          .qr-scanner-video::-webkit-media-controls-enclosure {
            display: none !important;
          }
        `
      }} />
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          戻る
        </Button>
        <h1 className="text-lg font-semibold">QRスキャン</h1>
        <div className="w-16" /> {/* Spacer */}
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Camera View */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-black overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover qr-scanner-video"
                style={{
                  display: 'block !important',
                  opacity: isScanning ? '1' : '0',
                  transition: 'opacity 0.3s ease',
                  position: 'relative',
                  zIndex: 1,
                  backgroundColor: 'transparent',
                  minWidth: '100%',
                  minHeight: '100%'
                }}
                playsInline
                muted
                autoPlay
                controls={false}
                webkit-playsinline="true"
              />
              
              {/* Camera status indicator */}
              {isScanning && (
                <div className="absolute top-3 right-3 bg-green-500 rounded-full p-2">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
              
              {!isScanning && !isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <QrCode className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-sm text-center opacity-75">
                    QRコードをスキャンして<br />大会にエントリー
                  </p>
                </div>
              )}
              
              {isInitializing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                  <p className="text-sm">カメラを起動中...</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {cameraError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-700 font-medium">エラー</p>
                  <p className="text-sm text-red-600 mt-1">{cameraError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="space-y-3">
          {!isScanning && !isInitializing && (
            <Button 
              onClick={startCamera}
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <Camera className="h-5 w-5" />
              QRスキャンを開始
            </Button>
          )}
          
          {isScanning && (
            <Button 
              onClick={stopCamera}
              variant="outline"
              className="w-full"
              size="lg"
            >
              スキャンを停止
            </Button>
          )}
          
          {cameraError && (
            <Button 
              onClick={handleRetry}
              variant="outline"
              className="w-full"
              size="lg"
            >
              再試行
            </Button>
          )}
        </div>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-medium text-blue-900 mb-2">使い方</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 大会のQRコードをカメラに向けてください</li>
              <li>• QRコードが枠内に入るよう調整してください</li>
              <li>• 自動的に読み取られ、大会ページに移動します</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};