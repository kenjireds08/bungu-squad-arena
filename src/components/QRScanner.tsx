import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle, Edit3, Send, Info, ExternalLink } from 'lucide-react';
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
  const [showImageUpload, setShowImageUpload] = useState(false);
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
    console.log('BUNGU SQUAD: カメラ起動開始 - 新実装');
    setIsInitializing(true);
    setCameraError(null);
    setInitializationTimeout(false);

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
    }, 10000); // Increased to 10 seconds
    
    try {
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('このブラウザはカメラをサポートしていません');
      }

      console.log('BUNGU SQUAD: 段階的カメラアクセス開始');
      
      // Progressive enhancement approach - try multiple constraint configurations
      const constraintOptions = [
        // Option 1: Basic video only (most compatible)
        { video: true },
        
        // Option 2: Rear camera preference
        { 
          video: { 
            facingMode: 'environment' 
          } 
        },
        
        // Option 3: Specific dimensions with rear camera
        { 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        }
      ];

      let stream = null;
      let lastError = null;

      // Try each constraint option until one works
      for (let i = 0; i < constraintOptions.length; i++) {
        const constraints = constraintOptions[i];
        console.log(`BUNGU SQUAD: 制約オプション ${i + 1} を試行:`, constraints);
        
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log(`BUNGU SQUAD: 制約オプション ${i + 1} で成功!`);
          break;
        } catch (error: any) {
          console.warn(`BUNGU SQUAD: 制約オプション ${i + 1} 失敗:`, error.message);
          lastError = error;
          
          // Wait a bit before trying next option
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (!stream) {
        throw lastError || new Error('すべての制約オプションが失敗しました');
      }

      console.log('BUNGU SQUAD: カメラストリーム取得成功');
      
      if (!videoRef.current) {
        throw new Error('ビデオ要素が見つかりません');
      }

      const video = videoRef.current;
      streamRef.current = stream;

      // Configure video element with comprehensive settings
      video.srcObject = stream;
      video.playsInline = true;
      video.muted = true;
      video.autoplay = true;
      video.controls = false;
      
      // iOS-specific attributes
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.setAttribute('muted', 'true');

      console.log('BUNGU SQUAD: ビデオ要素設定完了、再生開始');

      // Enhanced video initialization with multiple fallbacks
      return new Promise<void>((resolve, reject) => {
        let resolved = false;
        let attempts = 0;
        const maxAttempts = 3;
        
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
          
          console.error('BUNGU SQUAD: ビデオ再生エラー:', error);
          attempts++;
          
          if (attempts < maxAttempts) {
            console.log(`BUNGU SQUAD: リトライ ${attempts}/${maxAttempts}`);
            setTimeout(() => {
              tryPlay();
            }, 1000);
          } else {
            resolved = true;
            reject(error);
          }
        };

        const tryPlay = async () => {
          try {
            console.log(`BUNGU SQUAD: play() 試行 ${attempts + 1}`);
            await video.play();
            handleSuccess();
          } catch (error) {
            handleError(error);
          }
        };

        // Set up event listeners
        video.addEventListener('loadedmetadata', () => {
          console.log('BUNGU SQUAD: メタデータ読み込み完了');
        });

        video.addEventListener('canplay', () => {
          console.log('BUNGU SQUAD: 再生準備完了');
          if (!resolved) {
            handleSuccess();
          }
        });

        video.addEventListener('error', handleError);

        // Start play attempt
        tryPlay();

        // Safety fallback - if video seems to be working, proceed anyway
        setTimeout(() => {
          if (!resolved && video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('BUNGU SQUAD: ビデオが動作しているため強制成功');
            handleSuccess();
          }
        }, 5000);
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
        errorMessage = 'カメラの使用が許可されていません。ブラウザの設定でカメラへのアクセスを許可してください。';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'カメラが見つかりません。デバイスにカメラが接続されているか確認してください。';
      } else if (error.name === 'NotSupportedError' || error.name === 'NotReadableError') {
        errorMessage = 'カメラにアクセスできません。他のアプリでカメラが使用中の可能性があります。';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = 'カメラの設定に問題があります。デバイスがサポートしていない可能性があります。';
      }
      
      setCameraError(errorMessage);
      
      // Run diagnostics after error
      await checkCameraPermissions();
      
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

  const handleStartScan = async () => {
    console.log('BUNGU SQUAD: ユーザーアクション - カメラ起動要求');
    
    // First try to get permission immediately after user interaction
    try {
      // Pre-request permission to show browser prompt immediately
      const permissionStatus = await navigator.permissions?.query({ name: 'camera' as PermissionName });
      console.log('BUNGU SQUAD: 現在の権限状態:', permissionStatus?.state);
      
      if (permissionStatus?.state === 'prompt') {
        console.log('BUNGU SQUAD: 権限がプロンプト状態、直接getUserMediaで権限要求');
        // Trigger permission request immediately
        try {
          const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
          console.log('BUNGU SQUAD: 権限取得成功、テストストリームを停止');
          testStream.getTracks().forEach(track => track.stop());
        } catch (permError) {
          console.log('BUNGU SQUAD: 権限要求中のエラー:', permError);
        }
      }
    } catch (permissionError) {
      console.log('BUNGU SQUAD: 権限チェック不可:', permissionError);
    }
    
    // Now start the camera normally
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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('BUNGU SQUAD: QR画像アップロード開始');
    
    try {
      // Create image element
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Canvas context not available');
      }

      // Load and process image
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          // Set canvas size to image size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Get image data for QR detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Detect QR code using jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          
          if (code && code.data) {
            console.log('BUNGU SQUAD: QRコード検出成功（画像）:', code.data);
            handleQRDetected(code.data);
            resolve();
          } else {
            reject(new Error('QRコードが見つかりませんでした'));
          }
        };
        
        img.onerror = () => {
          reject(new Error('画像の読み込みに失敗しました'));
        };
        
        // Load image
        const reader = new FileReader();
        reader.onload = (e) => {
          img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      });

      toast({
        title: "成功",
        description: "QRコードを画像から読み取りました",
      });

    } catch (error: any) {
      console.error('BUNGU SQUAD: 画像QR読み取りエラー:', error);
      toast({
        title: "エラー",
        description: error.message || "画像からQRコードを読み取れませんでした",
        variant: "destructive"
      });
    }

    // Reset input
    event.target.value = '';
  };

  // Remove the failed Safari workaround - focus on PWA-native solution

  const isPWASafari = () => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches;
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    return isPWA && isSafari;
  };

  // Check for QR scan shortcut action from PWA
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    
    if (action === 'qr-scan') {
      console.log('BUNGU SQUAD: PWAショートカットからQRスキャン開始');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      
      // Auto-start camera after component mount
      setTimeout(() => {
        handleStartScan();
      }, 500);
    }
  }, []);

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

              {/* QR Image Upload Section */}
              {showImageUpload && (
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">QR画像をアップロード</span>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
                    <p>QRコードの画像ファイルを選択してください。カメラロールやスクリーンショットからも読み取れます。</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-primary file:text-primary-foreground
                      hover:file:bg-primary/90"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowImageUpload(false)}
                    className="w-full"
                  >
                    キャンセル
                  </Button>
                </div>
              )}

              {/* Enhanced Camera Issue Help */}
              {cameraError && (
                <div className="space-y-3 p-4 bg-info/10 rounded-lg border border-info/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-info" />
                    <span className="text-sm font-medium text-info">カメラアクセスのヒント</span>
                  </div>
                  <div className="text-sm space-y-2 text-muted-foreground">
                    <p>カメラが起動しない場合の対処法：</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li><strong>PWAを一度終了</strong>してブラウザで再度アクセス</li>
                      <li><strong>設定でカメラ権限を確認</strong>（Safari設定 → プライバシーとセキュリティ → カメラ）</li>
                      <li><strong>他のアプリでカメラが使用中</strong>でないか確認</li>
                      <li><strong>デバイスを再起動</strong>してから再試行</li>
                    </ol>
                    <p className="text-xs pt-2 border-t">
                      <strong>それでも解決しない場合：</strong> 手動URL入力またはシミュレート機能をご利用ください
                    </p>
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
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleManualInput}
                        className="w-full"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        手動URL入力
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowImageUpload(!showImageUpload)}
                        className="w-full"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR画像読取
                      </Button>
                    </div>
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
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="secondary" 
                        onClick={toggleManualInput}
                        className="w-full"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        手動URL入力
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => setShowImageUpload(!showImageUpload)}
                        className="w-full"
                      >
                        <QrCode className="h-4 w-4 mr-1" />
                        QR画像読取
                      </Button>
                    </div>
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