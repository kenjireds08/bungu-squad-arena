import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle, Edit3, Send, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import jsQR from 'jsqr';

interface QRScannerProps {
  onClose: () => void;
  onEntryComplete?: () => void;
  currentUserId?: string;
}

export const QRScanner = ({ onClose, onEntryComplete, currentUserId }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initializationTimeout, setInitializationTimeout] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Detect browser and device capabilities
  const detectEnvironment = () => {
    const info: string[] = [];
    info.push(`User Agent: ${navigator.userAgent}`);
    info.push(`Is PWA: ${window.matchMedia('(display-mode: standalone)').matches}`);
    info.push(`Is iOS: ${/iPad|iPhone|iPod/.test(navigator.userAgent)}`);
    info.push(`Is Safari: ${/^((?!chrome|android).)*safari/i.test(navigator.userAgent)}`);
    info.push(`MediaDevices support: ${!!navigator.mediaDevices}`);
    info.push(`getUserMedia support: ${!!navigator.mediaDevices?.getUserMedia}`);
    info.push(`HTTPS: ${location.protocol === 'https:'}`);
    info.push(`Screen: ${screen.width}x${screen.height}`);
    return info;
  };

  // Check camera permissions and availability
  const checkCameraPermissions = async () => {
    const info = detectEnvironment();
    setDiagnosticInfo(info);
    console.log('BUNGU SQUAD: 環境診断', info);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not supported');
      }

      // Check for existing permissions
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          info.push(`Camera permission: ${permission.state}`);
          console.log('BUNGU SQUAD: カメラ権限状態:', permission.state);
        } catch (e) {
          info.push('Camera permission: check failed');
        }
      }

      // Check available media devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      info.push(`Video inputs: ${videoInputs.length}`);
      console.log('BUNGU SQUAD: ビデオ入力デバイス:', videoInputs);

      setDiagnosticInfo([...info]);
      return true;
    } catch (error) {
      console.error('BUNGU SQUAD: 権限チェックエラー:', error);
      info.push(`Permission check error: ${error}`);
      setDiagnosticInfo([...info]);
      return false;
    }
  };

  const startCamera = async () => {
    console.log('BUNGU SQUAD: カメラ起動開始');
    setIsInitializing(true);
    setCameraError(null);
    setInitializationTimeout(false);

    // First, run diagnostics
    const canProceed = await checkCameraPermissions();
    
    // Clear any previous timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    
    // Set timeout to prevent infinite loading
    initTimeoutRef.current = setTimeout(() => {
      console.log('BUNGU SQUAD: カメラ初期化タイムアウト');
      setInitializationTimeout(true);
      setIsInitializing(false);
      setCameraError('カメラの起動に時間がかかっています。もう一度お試しください。');
    }, 8000); // 8 seconds timeout
    
    try {
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('このブラウザはカメラをサポートしていません');
      }

      console.log('BUNGU SQUAD: カメラストリーム要求中...');
      
      // Special handling for Safari PWA
      const isPWA = window.matchMedia('(display-mode: standalone)').matches;
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      let constraints;
      
      if (isPWA && isSafari) {
        // Very minimal constraints for Safari PWA
        console.log('BUNGU SQUAD: Safari PWA 検出、最小制約で試行');
        constraints = {
          video: true // Most basic constraints
        };
      } else {
        // Standard constraints for other browsers
        constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        };
      }

      console.log('BUNGU SQUAD: 使用制約:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('BUNGU SQUAD: カメラストリーム取得成功');
      
      if (!videoRef.current) {
        throw new Error('ビデオ要素が見つかりません');
      }

      const video = videoRef.current;
      streamRef.current = stream;

      // Configure video element for iOS
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.controls = false;
      
      // Set iOS-specific attributes
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');

      console.log('BUNGU SQUAD: ビデオ要素設定完了、再生待機中...');

      // Wait for video to be ready and play
      return new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const handleSuccess = () => {
          if (resolved) return;
          resolved = true;
          
          console.log('BUNGU SQUAD: ビデオ再生成功');
          
          // Clear timeout
          if (initTimeoutRef.current) {
            clearTimeout(initTimeoutRef.current);
            initTimeoutRef.current = null;
          }
          
          setIsInitializing(false);
          setIsScanning(true);
          
          // Start QR detection after a short delay
          setTimeout(() => {
            startQRDetection();
          }, 1000);
          
          resolve();
        };

        const handleError = (error: any) => {
          if (resolved) return;
          resolved = true;
          
          console.error('BUNGU SQUAD: ビデオ再生エラー:', error);
          reject(error);
        };

        // Set up event listeners
        video.addEventListener('loadedmetadata', () => {
          console.log('BUNGU SQUAD: メタデータ読み込み完了');
        });

        video.addEventListener('canplay', () => {
          console.log('BUNGU SQUAD: 再生準備完了');
          handleSuccess();
        });

        video.addEventListener('error', handleError);

        // Force play attempt
        video.play()
          .then(() => {
            console.log('BUNGU SQUAD: play() 成功');
            if (!resolved) {
              setTimeout(handleSuccess, 500); // Give it some time
            }
          })
          .catch((error) => {
            console.log('BUNGU SQUAD: play() 失敗、但し継続:', error);
            // Don't reject here, just continue - iOS sometimes fails play() but video works
            if (!resolved) {
              setTimeout(handleSuccess, 1000);
            }
          });

        // Safety timeout
        setTimeout(() => {
          if (!resolved) {
            console.log('BUNGU SQUAD: ビデオ初期化完了（タイムアウト）');
            handleSuccess();
          }
        }, 3000);
      });
      
    } catch (error: any) {
      console.error('BUNGU SQUAD: カメラアクセスエラー:', error);
      
      // Clear timeout
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
        initTimeoutRef.current = null;
      }
      
      setIsInitializing(false);
      setHasCamera(false);
      
      let errorMessage = 'カメラの起動に失敗しました';
      
      if (error.name === 'NotAllowedError') {
        errorMessage = 'カメラの使用が許可されていません。設定で許可してください。';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'カメラが見つかりません。';
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
    console.log('BUNGU SQUAD: カメラを停止中...');
    
    // Clear timeout
    if (initTimeoutRef.current) {
      clearTimeout(initTimeoutRef.current);
      initTimeoutRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setIsInitializing(false);
    setInitializationTimeout(false);
  };

  const startQRDetection = () => {
    console.log('BUNGU SQUAD: QR検出開始');
    
    const detectQR = () => {
      if (!videoRef.current || !canvasRef.current || !isScanning) {
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      // Check if video is ready
      if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
        if (isScanning) {
          requestAnimationFrame(detectQR);
        }
        return;
      }
      
      try {
        // Set canvas size to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw current video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data for QR detection
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // Detect QR code using jsQR
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (code && code.data) {
          console.log('BUNGU SQUAD: QRコード検出!', code.data);
          // QRコードが見つかった場合、処理を実行
          handleQRDetected(code.data);
          return; // 検出ループを停止
        }
        
      } catch (error) {
        console.error('BUNGU SQUAD: QR検出エラー:', error);
      }
      
      // Continue detection loop with a small delay to reduce CPU usage
      if (isScanning) {
        setTimeout(() => {
          requestAnimationFrame(detectQR);
        }, 100); // 100ms delay between scans
      }
    };
    
    // Start detection with a small delay
    setTimeout(() => {
      detectQR();
    }, 100);
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
    setCameraError(null);
    setHasCamera(true);
    setInitializationTimeout(false);
    startCamera();
  };

  const handleManualSubmit = () => {
    if (!manualUrl.trim()) {
      toast({
        title: "エラー",
        description: "URLを入力してください。",
        variant: "destructive"
      });
      return;
    }

    // Validate URL
    if (!manualUrl.includes('/tournament/')) {
      toast({
        title: "エラー",
        description: "有効な大会URLを入力してください。",
        variant: "destructive"
      });
      return;
    }

    handleQRDetected(manualUrl);
  };

  const toggleManualInput = () => {
    setShowManualInput(!showManualInput);
    if (!showManualInput) {
      // 手動入力を開く時は、デフォルトURLを設定
      setManualUrl('https://bungu-squad-arena.vercel.app/tournament/2025-07-28');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
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
              {isInitializing ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">カメラを起動中...</p>
                    <p className="text-sm text-muted-foreground">
                      カメラへのアクセスを許可してください
                    </p>
                    {initializationTimeout && (
                      <p className="text-xs text-destructive">
                        時間がかかっています。しばらくお待ちください...
                      </p>
                    )}
                  </div>
                </div>
              ) : isScanning ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    webkit-playsinline="true"
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
              ) : cameraError ? (
                <div className="text-center space-y-4">
                  <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-destructive">カメラエラー</p>
                    <p className="text-sm text-muted-foreground">
                      {cameraError}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                  <div className="space-y-2">
                    <p className="text-lg font-semibold">QRコードをスキャン</p>
                    <p className="text-sm text-muted-foreground">
                      カメラを起動してQRコードを読み取ります
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
                    <h3 className="font-semibold text-info">エントリー方法</h3>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• <strong>カメラ使用:</strong> QRコードをカメラに向けてスキャン</li>
                      <li>• <strong>手動入力:</strong> カメラが使えない場合はURL入力</li>
                      <li>• <strong>テスト用:</strong> 開発・テスト時のシミュレート機能</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Manual Input Section */}
              {showManualInput && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Edit3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">手動でURL入力</span>
                  </div>
                  <Input
                    type="url"
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="https://bungu-squad-arena.vercel.app/tournament/..."
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleManualSubmit}
                      className="flex-1"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      エントリー
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowManualInput(false)}
                    >
                      キャンセル
                    </Button>
                  </div>
                </div>
              )}

              {/* Diagnostics Section */}
              {showDiagnostics && diagnosticInfo.length > 0 && (
                <div className="space-y-3 p-4 bg-info/10 rounded-lg border border-info/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium text-info">システム情報</span>
                  </div>
                  <div className="text-xs space-y-1 font-mono">
                    {diagnosticInfo.map((info, index) => (
                      <div key={index} className="text-muted-foreground">
                        {info}
                      </div>
                    ))}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowDiagnostics(false)}
                    className="w-full"
                  >
                    閉じる
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                {!isInitializing && !isScanning && !scanResult && !cameraError && (
                  <>
                    <Button 
                      variant="heroic" 
                      size="lg" 
                      onClick={handleStartScan}
                      className="w-full"
                    >
                      <Camera className="h-5 w-5" />
                      カメラを起動
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleManualInput}
                      className="w-full"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      手動でURL入力
                    </Button>
                  </>
                )}

                {isInitializing && (
                  <Button 
                    variant="outline" 
                    size="lg" 
                    disabled
                    className="w-full"
                  >
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                    カメラを起動中...
                  </Button>
                )}

                {isScanning && (
                  <>
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => handleQRDetected('https://bungu-squad-arena.vercel.app/tournament/2025-07-28')}
                      className="w-full"
                    >
                      QRコード検出をシミュレート（テスト用）
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      onClick={stopCamera}
                      className="w-full"
                    >
                      カメラを停止
                    </Button>
                  </>
                )}

                {(cameraError || initializationTimeout) && (
                  <div className="space-y-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setCameraError(null);
                        setInitializationTimeout(false);
                        setHasCamera(true);
                        handleStartScan();
                      }} 
                      className="w-full"
                    >
                      もう一度カメラを起動
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={toggleManualInput}
                      className="w-full"
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      手動でURL入力
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      className="w-full"
                    >
                      <Info className="h-4 w-4 mr-1" />
                      システム情報を表示
                    </Button>
                  </div>
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