import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Camera, QrCode, AlertCircle, CheckCircle, Upload, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import QrScanner from 'qr-scanner';
import workerUrl from 'qr-scanner/qr-scanner-worker.min?url';
import { TournamentEntryComplete } from './TournamentEntryComplete';
import CameraOverlay from './CameraOverlay';
import { isPWA } from '@/lib/utils/isPWA';

// QR ScannerワーカーパスをVite方式で設定
QrScanner.WORKER_PATH = workerUrl;

interface QRScannerProps {
  onClose: () => void;
  onEntryComplete?: () => void;
  currentUserId?: string;
  isAdmin?: boolean;
}

// ストリーム停止ヘルパー
function stopTracks(stream?: MediaStream | null) {
  stream?.getTracks().forEach(t => t.stop());
}

export const QRScanner = ({ onClose, onEntryComplete, currentUserId, isAdmin }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isIOSPWA, setIsIOSPWA] = useState(false);
  const [showFileInput, setShowFileInput] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false); // PWAオーバーレイ表示状態
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureInputRef = useRef<HTMLInputElement>(null); // ネイティブカメラ用
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
    const video = videoRef.current;
    if (!video) return;

    let fallbackTimer: number | null = null;

    try {
      // 1) 旧ストリームを完全停止（多重取得を避ける）
      stopTracks(streamRef.current);
      streamRef.current = null;

      // 2) videoの可視 & 属性を「先に」セット（awaitを挟まない）
      //   ※ iOSは playsinline/Muted/Autoplay が先に入っている方が安定
      video.muted = true;
      (video as any).playsInline = true;
      video.autoplay = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');

      // display:noneは絶対に使わない
      Object.assign(video.style, {
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        backgroundColor: 'black',
      });

      setIsInitializing(true);
      setCameraError(null);

      // PWAでのみ、gUMが固まるケースに備えて 1.2s タイムアウトを仕込む
      if (isPWA) {
        console.log('BUNGU SQUAD: PWAモード - フォールバックタイマー設定');
        
        // デバイス一覧を確認（デバッグ用）
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          console.log('BUNGU SQUAD: 利用可能なデバイス:', 
            devices.map(d => ({kind: d.kind, label: d.label || 'no label'}))
          );
        } catch (e) {
          console.error('BUNGU SQUAD: デバイス列挙エラー:', e);
        }
        
        fallbackTimer = window.setTimeout(() => {
          if (!streamRef.current) {
            console.log('BUNGU SQUAD: getUserMediaタイムアウト - ネイティブカメラへフォールバック');
            // gUMが解決しない → ネイティブカメラを自動起動
            captureInputRef.current?.click();
            setIsInitializing(false);
            setIsScanning(false);
            toast({
              title: "カメラを開きます",
              description: "撮影すると自動でQRを読み取ります。",
            });
          }
        }, 1200);
      }

      // 3) 最初のawaitはgetUserMedia（ユーザー操作の同期内）
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }, // 最小制約
        audio: false,
      });
      
      // フォールバックタイマーをクリア
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
        fallbackTimer = null;
      }
      
      streamRef.current = stream;
      video.srcObject = stream;

      // 4) 再生（2段リトライ + ユーザーのタップで再生）
      try {
        await video.play();
        console.log('BUNGU SQUAD: ビデオ再生成功（1回目）');
      } catch {
        console.log('BUNGU SQUAD: 再生失敗、リトライ...');
        await new Promise(r => requestAnimationFrame(r));
        try {
          await video.play();
          console.log('BUNGU SQUAD: ビデオ再生成功（2回目）');
        } catch {
          console.log('BUNGU SQUAD: タップフォールバック起動');
          // ユーザータップで強制再生
          const once = () => {
            video.play().finally(() => {
              console.log('BUNGU SQUAD: タップによる再生成功');
              window.removeEventListener('touchend', once);
            });
          };
          window.addEventListener('touchend', once, { once: true, passive: true });
          toast({
            title: "画面をタップしてください",
            description: "カメラを起動するために画面をタップしてください",
          });
        }
      }

      // 5) 準備完了 → スキャン開始
      setIsScanning(true);
      setIsInitializing(false);
      
      // PWAの場合はオーバーレイ表示
      if (isPWA) {
        setShowOverlay(true);
      }
      
      startQRScanning();
      
      toast({
        title: "カメラ起動成功",
        description: "QRコードをカメラに向けてください。",
      });
    } catch (err: any) {
      console.error('BUNGU SQUAD: カメラエラー:', err);
      
      // フォールバックタイマーをクリア
      if (fallbackTimer) {
        window.clearTimeout(fallbackTimer);
      }
      
      setIsInitializing(false);
      setIsScanning(false);
      setCameraError(err?.name === 'NotAllowedError'
        ? 'カメラの使用が拒否されました。設定アプリ > Safari のカメラ権限をご確認ください。'
        : err?.message || 'カメラの起動に失敗しました');
      // 念のため停止
      stopTracks(streamRef.current);
      streamRef.current = null;
      
      // iOS PWAの場合は自動的にファイル入力を表示
      if (isIOSPWA) {
        setShowFileInput(true);
      }
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
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    let scanAttempts = 0;
    
    scanIntervalRef.current = setInterval(async () => {
      const v = videoRef.current;
      if (!v || v.readyState !== 4) {
        if (scanAttempts % 10 === 0 && v) {
          console.log(`BUNGU SQUAD: ビデオ待機中... readyState=${v.readyState}`);
        }
        return;
      }
      
      scanAttempts++;
      if (scanAttempts % 10 === 0) {
        console.log(`BUNGU SQUAD: QRコードスキャン中... (${scanAttempts}回目)`);
      }
      
      try {
        const res = await QrScanner.scanImage(v, {
          returnDetailedScanResult: true,
          alsoTryWithoutScanRegion: true,
        });
        if (res) {
          console.log('BUNGU SQUAD: QRコード検出成功！', res);
          clearInterval(scanIntervalRef.current!);
          scanIntervalRef.current = null;
          stopCamera();
          handleQRDetected(res);
        }
      } catch {
        // 見つからないだけなら無視
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
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    stopTracks(streamRef.current);
    streamRef.current = null;

    if (videoRef.current) {
      const s = videoRef.current.srcObject as MediaStream | null;
      stopTracks(s);
      videoRef.current.srcObject = null;
    }
    
    // QR Scannerを停止
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    
    setIsScanning(false);
    setIsInitializing(false);
    setShowOverlay(false);
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
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true
      });
      console.log('BUNGU SQUAD: 画像からQRコード検出:', result);
      stopCamera();
      handleQRDetected(result);
    } catch (error) {
      console.error('BUNGU SQUAD: 画像からQRコードを読み取れませんでした:', error);
      toast({
        title: "読み取り失敗",
        description: "もう一度撮影してください。",
        variant: "destructive"
      });
    }

    // Reset file input
    const input = event.target;
    if (input) {
      input.value = '';
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
        {isPWA && showOverlay ? (
          // PWAはビデオを body 直下へ出す
          <CameraOverlay videoRef={videoRef}>
            {/* オーバーレイ上にガイドを描く */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* スキャンガイド */}
              <div
                style={{
                  width: "80%",
                  maxWidth: "300px",
                  aspectRatio: "1",
                  border: "2px solid rgba(255,255,255,0.5)",
                  borderRadius: "12px",
                  position: "relative",
                }}
              >
                {/* コーナーマーカー */}
                <div style={{
                  position: "absolute",
                  top: -2,
                  left: -2,
                  width: 30,
                  height: 30,
                  borderTop: "4px solid white",
                  borderLeft: "4px solid white",
                }} />
                <div style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 30,
                  height: 30,
                  borderTop: "4px solid white",
                  borderRight: "4px solid white",
                }} />
                <div style={{
                  position: "absolute",
                  bottom: -2,
                  left: -2,
                  width: 30,
                  height: 30,
                  borderBottom: "4px solid white",
                  borderLeft: "4px solid white",
                }} />
                <div style={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  width: 30,
                  height: 30,
                  borderBottom: "4px solid white",
                  borderRight: "4px solid white",
                }} />
              </div>
              
              <p style={{
                color: "white",
                marginTop: "20px",
                fontSize: "14px",
                textAlign: "center",
              }}>
                QRコードを枠内に合わせてください
              </p>
              
              {/* 閉じるボタン */}
              <button
                onClick={() => {
                  stopCamera();
                  setShowOverlay(false);
                }}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(0,0,0,0.5)",
                  border: "2px solid white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  pointerEvents: "auto",
                }}
              >
                <X style={{ color: "white", width: "20px", height: "20px" }} />
              </button>
            </div>
          </CameraOverlay>
        ) : (
          // ブラウザは従来通り
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="relative aspect-square bg-black">
                <div className="relative bg-black w-full h-full">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    autoPlay
                  />
                </div>
                
                {/* Camera status indicator */}
                {isScanning && (
                  <div className="absolute top-3 right-3 bg-green-500 rounded-full p-2 z-10">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
                
                {!isScanning && !isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <QrCode className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-sm text-center opacity-75">
                      QRコードをスキャンして<br />大会にエントリー
                    </p>
                  </div>
                )}
                
                {isInitializing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                    <p className="text-sm">カメラを起動中...</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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
        
        {/* 非表示のネイティブカメラ入力（自動フォールバック用） */}
        <input
          ref={captureInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>
    </div>
  );
};