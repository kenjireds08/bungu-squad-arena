import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QrScanner from 'qr-scanner';

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
    
    // Create QR Scanner instance with simplified settings for better video display
    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => handleQRDetected(result.data),
      {
        returnDetailedScanResult: true,
        highlightScanRegion: true,
        highlightCodeOutline: true,
        preferredCamera: 'environment',
        maxScansPerSecond: 5, // Reduced for better performance
        // Remove calculateScanRegion to use default behavior
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
            // Extract tournament ID from URL
            const tournamentMatch = data.match(/\/tournament\/([^\/]+)/);
            if (tournamentMatch && tournamentMatch[1]) {
              window.location.href = `/tournament/${tournamentMatch[1]}`;
            } else {
              // Fallback - close scanner
              onEntryComplete?.();
              onClose();
            }
          }, 5000);
          
        } catch (error) {
          console.error('Failed to update tournament active status:', error);
          // Even if API fails, still navigate to tournament
          setTimeout(() => {
            const tournamentMatch = data.match(/\/tournament\/([^\/]+)/);
            if (tournamentMatch && tournamentMatch[1]) {
              window.location.href = `/tournament/${tournamentMatch[1]}`;
            } else {
              onEntryComplete?.();
              onClose();
            }
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-700">QRコード読み取り成功！</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              大会エントリーが完了しました
            </p>
            <p className="text-xs text-muted-foreground">
              5秒後に待機画面に戻ります...
            </p>
          </CardContent>
        </Card>
      </div>
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
            <div className="relative aspect-square bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ display: isScanning ? 'block' : 'none' }}
                playsInline
                muted
                autoPlay
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