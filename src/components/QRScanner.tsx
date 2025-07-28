import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface QRScannerProps {
  onClose: () => void;
  onEntryComplete?: () => void;
  currentUserId?: string;
}

export const QRScanner = ({ onClose, onEntryComplete, currentUserId }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
      
      setIsScanning(true);
      startQRDetection();
    } catch (error) {
      console.error('Camera access denied:', error);
      setHasCamera(false);
      toast({
        title: "カメラアクセスエラー",
        description: "カメラへのアクセスが拒否されました。ブラウザの設定を確認してください。",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const startQRDetection = () => {
    const detectQR = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context || video.videoWidth === 0) {
        requestAnimationFrame(detectQR);
        return;
      }
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      try {
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        // For now, simulate QR detection after 3 seconds of scanning
        // In a real implementation, you'd use a QR detection library here
        setTimeout(() => {
          if (isScanning) {
            handleQRDetected('https://bungu-squad-arena.vercel.app/tournament/2025-07-28');
          }
        }, 3000);
      } catch (error) {
        console.error('QR detection error:', error);
      }
      
      if (isScanning) {
        requestAnimationFrame(detectQR);
      }
    };
    
    detectQR();
  };

  const handleQRDetected = async (data: string) => {
    console.log('QR Code detected:', data);
    stopCamera();
    
    // Check if it's a tournament entry URL
    if (data.includes('/tournament/')) {
      setScanResult('success');
      
      // Update tournament active status
      if (currentUserId) {
        try {
          await fetch(`/api/players?id=${currentUserId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updateTournamentActive: true })
          });
          console.log('Tournament active status updated for player:', currentUserId);
          
          toast({
            title: "エントリー完了",
            description: "大会にエントリーしました！",
          });
          
          // Navigate to the scanned URL
          setTimeout(() => {
            window.location.href = data;
          }, 2000);
          
        } catch (error) {
          console.error('Failed to update tournament active status:', error);
          setScanResult('error');
        }
      } else {
        // Not logged in, redirect to tournament entry page
        window.location.href = data;
      }
    } else {
      setScanResult('error');
      toast({
        title: "エラー",
        description: "無効なQRコードです。大会のQRコードをスキャンしてください。",
        variant: "destructive"
      });
    }
  };

  const handleStartScan = () => {
    startCamera();
  };

  const handleRetry = () => {
    setScanResult(null);
    startCamera();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Stop camera when scanning stops
  useEffect(() => {
    if (!isScanning && streamRef.current) {
      stopCamera();
    }
  }, [isScanning]);

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
            {/* Camera View */}
            <div className="aspect-square bg-muted rounded-lg border-2 border-dashed border-fantasy-frame flex items-center justify-center relative overflow-hidden">
              {isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover rounded-lg"
                  />
                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                  {/* Scanning Overlay */}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary rounded-lg animate-pulse"></div>
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p className="text-white text-sm bg-black/50 inline-block px-3 py-1 rounded-full">
                      QRコードをスキャン中...
                    </p>
                  </div>
                </>
              ) : scanResult === 'success' ? (
                <div className="text-center space-y-4">
                  <CheckCircle className="h-16 w-16 mx-auto text-success" />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-success">スキャン完了！</p>
                    <p className="text-sm text-muted-foreground">
                      大会にエントリーしています...
                    </p>
                  </div>
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