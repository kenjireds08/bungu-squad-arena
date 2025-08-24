import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QrScanner from 'qr-scanner';
import workerUrl from 'qr-scanner/qr-scanner-worker.min?url';
import { TournamentEntryComplete } from './TournamentEntryComplete';

// QR ScannerワーカーパスをVite方式で設定
QrScanner.WORKER_PATH = workerUrl;

interface QRScannerProps {
  onClose: () => void;
  onEntryComplete?: () => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

// タイムアウト付きgetUserMedia
async function getUserMediaWithTimeout(constraints: MediaStreamConstraints, ms = 10000): Promise<MediaStream> {
  return Promise.race([
    navigator.mediaDevices.getUserMedia(constraints),
    new Promise<MediaStream>((_, reject) => 
      setTimeout(() => reject(new Error('Camera timeout')), ms)
    )
  ]);
}

export const QRScanner = ({ onClose, onEntryComplete, currentUserId, isAdmin }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isIOSPWA, setIsIOSPWA] = useState(false);
  const [showFileInput, setShowFileInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Initialize and check iOS PWA
  useEffect(() => {
    // Check if iOS PWA
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isStandalone;
    setIsIOSPWA(isIOS && isPWA);
    
    console.log('BUNGU SQUAD: 環境情報', {
      isIOS,
      isStandalone,
      isPWA,
      isIOSPWA: isIOS && isPWA,
      userAgent: navigator.userAgent
    });
    
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  // ページ非表示時のクリーンアップ
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCamera();
      }
    };
    
    const handlePageHide = () => {
      stopCamera();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  const startCamera = async () => {
    if (!videoRef.current) {
      console.error('BUNGU SQUAD: ビデオ要素が見つかりません');
      setCameraError('ビデオ要素の初期化に失敗しました');
      return;
    }

    console.log('BUNGU SQUAD: カメラ起動開始');
    // state更新はOK（awaitしない）
    setIsInitializing(true);
    setCameraError(null);

    try {
      // iOS PWAかどうかをチェック
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                   (window.navigator as any).standalone;

      if (isIOS && isPWA) {
        console.log('BUNGU SQUAD: iOS PWA検出 - 特別処理を実行');
        
        const video = videoRef.current;
        
        try {
          // 最初のawaitがgetUserMediaになるように（重要）
          const stream = await getUserMediaWithTimeout({
            video: { facingMode: 'environment' },
            audio: false
          }, 10000);
          
          // ストリーム取得後にビデオプロパティを設定
          video.muted = true;
          (video as any).playsInline = true;
          video.autoplay = true;
          
          console.log('BUNGU SQUAD: ストリーム取得成功');
          streamRef.current = stream;
          
          video.srcObject = stream;
          
          // play()のエラーハンドリング（ChatGPT推奨）
          await video.play().catch(async (e) => {
            console.log('BUNGU SQUAD: 初回play失敗、リトライ', e);
            return video.play();
          });
          
          console.log('BUNGU SQUAD: ビデオ再生開始');
          setIsScanning(true);
          setIsInitializing(false);
          
          // QRコードスキャンを開始
          startQRScanning();
          
          toast({
            title: "カメラ起動成功",
            description: "QRコードをカメラに向けてください。",
          });
          
        } catch (error: any) {
          console.error('BUNGU SQUAD: iOS PWAカメラエラー:', error);
          handleCameraError(error);
          // フォールバック：ファイル入力を表示
          setShowFileInput(true);
        }
        
      } else {
        // 非iOS PWAの場合は通常のQR Scanner処理
        console.log('BUNGU SQUAD: 通常のQR Scanner処理');
        
        // QR Scannerを初期化
        if (!qrScannerRef.current) {
          const qrScanner = new QrScanner(
            videoRef.current,
            (result) => {
              handleQRDetected(result.data);
            },
            {
              returnDetailedScanResult: true,
              highlightScanRegion: true,
              highlightCodeOutline: true,
              preferredCamera: 'environment',
              maxScansPerSecond: 5
            }
          );
          qrScannerRef.current = qrScanner;
        }
        
        // QR Scannerを起動
        await qrScannerRef.current.start();
        console.log('BUNGU SQUAD: QR Scanner起動成功');
        setIsScanning(true);
        setIsInitializing(false);
        
        toast({
          title: "QRスキャナー起動",
          description: "QRコードをカメラに向けてください。",
        });
      }
      
    } catch (error: any) {
      console.error('BUNGU SQUAD: カメラ起動エラー:', error);
      handleCameraError(error);
    }
  };

  const handleCameraError = (error: any) => {
    setIsInitializing(false);
    
    let errorMessage = 'カメラの起動に失敗しました';
    
    if (error.message === 'Camera timeout') {
      errorMessage = 'カメラの起動がタイムアウトしました。';
    } else if (error.name === 'NotAllowedError') {
      errorMessage = 'カメラへのアクセスが拒否されました。設定アプリでSafariのカメラ権限を確認してください。';
    } else if (error.name === 'NotFoundError') {
      errorMessage = 'カメラが見つかりません。';
    } else if (error.name === 'NotReadableError') {
      errorMessage = 'カメラが使用中です。他のアプリを終了してください。';
    }
    
    setCameraError(errorMessage);
    toast({
      title: "カメラエラー",
      description: errorMessage,
      variant: "destructive"
    });
    
    // iOS PWAの場合は自動的にファイル入力を表示
    if (isIOSPWA) {
      setShowFileInput(true);
    }
  };

  const startQRScanning = () => {
    let scanAttempts = 0;
    
    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current) return;
      
      scanAttempts++;
      
      if (scanAttempts % 10 === 0) {
        console.log(`BUNGU SQUAD: QRコードスキャン中... (${scanAttempts}回目)`);
      }
      
      try {
        // readyStateの確認
        if (videoRef.current.readyState !== 4) {
          if (scanAttempts % 10 === 0) {
            console.log('BUNGU SQUAD: ビデオがまだ準備できていません', videoRef.current.readyState);
          }
          return;
        }
          // readyState確認後にスキャン
          if (videoRef.current.readyState !== 4) {
            return; // まだ準備ができていない
          }
          
          const result = await QrScanner.scanImage(videoRef.current, {
            returnDetailedScanResult: true,
            alsoTryWithoutScanRegion: true
          });
          
          if (result) {
            console.log('BUNGU SQUAD: QRコード検出成功！', result);
            if (scanIntervalRef.current) {
              clearInterval(scanIntervalRef.current);
              scanIntervalRef.current = null;
            }
            stopCamera();
            handleQRDetected(result);
          }
        } catch (e) {
          // QRコードが見つからない場合は無視
        }
      }
    }, 250);
    
    // 60秒後に自動停止
    setTimeout(() => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
        console.log('BUNGU SQUAD: QRスキャンタイムアウト');
      }
    }, 60000);
  };

  const stopCamera = () => {
    console.log('BUNGU SQUAD: カメラ停止中...');
    
    // スキャンインターバルを停止
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // ビデオストリームを停止
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // QR Scannerを停止
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    
    setIsScanning(false);
    setIsInitializing(false);
  };

  const cleanup = () => {
    stopCamera();
    
    // QR Scannerを破棄
    if (qrScannerRef.current) {
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }
  };

  const handleQRDetected = async (data: string | any) => {
    // dataがオブジェクトの場合はdata.dataを使用
    const qrData = typeof data === 'string' ? data : data.data;
    console.log('BUNGU SQUAD: QRコード検出!', qrData);
    console.log('BUNGU SQUAD: QRコードの内容:', JSON.stringify(qrData));
    
    // Stop scanning immediately to prevent multiple detections
    stopCamera();
    
    // Check if a specific tournament was selected
    const selectedTournament = sessionStorage.getItem('selectedTournament');
    let tournamentInfo = null;
    if (selectedTournament) {
      try {
        tournamentInfo = JSON.parse(selectedTournament);
        console.log('BUNGU SQUAD: 選択された大会:', tournamentInfo);
      } catch (e) {
        console.warn('BUNGU SQUAD: 大会情報の解析に失敗:', e);
      }
    }
    
    // More flexible URL validation
    const isTournamentUrl = qrData.includes('tournament-entry') || 
                           qrData.includes('tournaments') || 
                           qrData.match(/\/tournament/i);
    
    console.log('BUNGU SQUAD: トーナメントURL判定:', isTournamentUrl);
    
    if (isTournamentUrl) {
      setScanResult('success');
      
      const tournamentName = tournamentInfo ? tournamentInfo.name : '大会';
      toast({
        title: "QRコード読み取り成功！",
        description: `${tournamentName}のエントリーが完了しました`,
      });
      
      // Navigate to tournament entry page
      setTimeout(() => {
        let targetUrl = qrData;
        if (qrData.includes('tournament-entry')) {
          const separator = qrData.includes('?') ? '&' : '?';
          targetUrl = `${qrData}${separator}from_qr=true`;
          
          if (tournamentInfo) {
            targetUrl += `&tournament_id=${tournamentInfo.id}&tournament_name=${encodeURIComponent(tournamentInfo.name)}`;
          }
        }
        
        console.log('BUNGU SQUAD: QRコード読み取り後の遷移先:', targetUrl);
        window.location.href = targetUrl;
        
        sessionStorage.removeItem('selectedTournament');
      }, 2000);
      
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

  const handleFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      console.log('BUNGU SQUAD: 画像ファイルからQRコードをスキャン');
      const result = await QrScanner.scanImage(file, { 
        returnDetailedScanResult: true 
      });
      console.log('BUNGU SQUAD: 画像からQRコード検出:', result);
      handleQRDetected(result);
    } catch (error) {
      console.error('BUNGU SQUAD: 画像からQRコードを読み取れませんでした:', error);
      toast({
        title: "エラー",
        description: "QRコードを読み取れませんでした。別の画像をお試しください。",
        variant: "destructive"
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetry = () => {
    setScanResult(null);
    setCameraError(null);
    setShowFileInput(false);
    startCamera();
  };

  // Show success state
  if (scanResult === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 animate-bounce-gentle" />
            <CardTitle className="text-green-700">QRコード読み取り完了！</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              大会エントリーが完了しました
            </p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-xs text-muted-foreground">
              待機画面に移動しています...
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
        <div className="w-16" />
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Camera View */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative aspect-square bg-black overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  // display:noneを使わず、visibilityとopacityで制御
                  visibility: isInitializing || (!isScanning && !isInitializing) ? 'hidden' : 'visible',
                  opacity: isScanning ? 1 : 0,
                  transition: 'opacity 0.25s ease'
                }}
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
            <>
              <Button 
                onClick={startCamera}
                className="w-full flex items-center gap-2"
                size="lg"
              >
                <Camera className="h-5 w-5" />
                QRスキャンを開始
              </Button>
              
              {/* ファイル入力オプション（エラー時またはiOS PWA） */}
              {(showFileInput || isIOSPWA) && (
                <>
                  <div className="relative">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileInput}
                      className="hidden"
                      id="qr-file-input"
                    />
                    <Button
                      variant="outline"
                      className="w-full flex items-center gap-2"
                      size="lg"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5" />
                      写真からQRコードを読み取る
                    </Button>
                  </div>
                  
                  {isIOSPWA && (
                    <p className="text-xs text-muted-foreground text-center">
                      カメラが起動しない場合は、上のボタンで写真を撮影するか、
                      保存済みのQRコード画像を選択してください
                    </p>
                  )}
                </>
              )}
            </>
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
              {isIOSPWA && (
                <li>• カメラが起動しない場合は「写真から読み取る」をご利用ください</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};