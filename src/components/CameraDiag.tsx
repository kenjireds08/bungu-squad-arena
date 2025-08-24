import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

interface CameraDiagProps {
  onClose?: () => void;
}

export const CameraDiag = ({ onClose }: CameraDiagProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [streamActive, setStreamActive] = useState(false);
  const [videoInfo, setVideoInfo] = useState<string>('');
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError('');
    setStatus('カメラ起動中...');
    
    try {
      const video = videoRef.current!;
      
      setStatus('getUserMedia呼び出し中...');
      
      // 最初のawaitがgetUserMedia（iOS PWAでは重要）
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      // ストリーム取得後にプロパティを設定
      video.muted = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.autoplay = true;
      
      setStatus('ストリーム取得成功');
      streamRef.current = stream;
      
      video.srcObject = stream;
      
      setStatus('play()呼び出し中...');
      await video.play().catch(async (e) => {
        console.log('初回play失敗、リトライ', e);
        setStatus('play()失敗、リトライ中...');
        return video.play();
      });
      
      setStatus('カメラ起動成功！');
      setStreamActive(true);
      
      // ビデオ情報を更新
      setTimeout(() => {
        if (videoRef.current) {
          const v = videoRef.current;
          setVideoInfo(`
            videoWidth: ${v.videoWidth}
            videoHeight: ${v.videoHeight}
            readyState: ${v.readyState}
            paused: ${v.paused}
            srcObject: ${v.srcObject ? 'MediaStream' : 'null'}
            currentTime: ${v.currentTime}
          `);
        }
      }, 1000);
      
    } catch (e: any) {
      const errorMsg = `${e?.name || 'Unknown'}: ${e?.message || String(e)}`;
      setError(errorMsg);
      setStatus('エラー発生');
      console.error('Camera error:', e);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setStreamActive(false);
    setStatus('カメラ停止');
  };

  const checkEnvironment = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone === true;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isStandalone;
    
    return {
      isIOS,
      isStandalone,
      isPWA,
      userAgent: navigator.userAgent,
      hasGetUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
    };
  };

  const env = checkEnvironment();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        {onClose && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            戻る
          </Button>
        )}
        <h1 className="text-lg font-semibold">カメラ診断</h1>
        <div className="w-16" />
      </div>

      <div className="p-4 space-y-4">
        {/* 環境情報 */}
        <Card>
          <CardHeader>
            <CardTitle>環境情報</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-1 font-mono">
              <div>iOS: {env.isIOS ? '✅' : '❌'}</div>
              <div>PWA: {env.isPWA ? '✅' : '❌'}</div>
              <div>Standalone: {env.isStandalone ? '✅' : '❌'}</div>
              <div>getUserMedia: {env.hasGetUserMedia ? '✅' : '❌'}</div>
              <div className="text-xs text-muted-foreground break-all">
                UA: {env.userAgent}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* カメラビュー */}
        <Card>
          <CardHeader>
            <CardTitle>カメラテスト</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-square bg-black rounded overflow-hidden">
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  // iOS PWAでdisplay:noneは使わない
                  display: 'block !important',
                  visibility: 'visible !important',
                  opacity: 1,
                  backgroundColor: streamActive ? 'transparent' : 'black'
                }}
                playsInline={true}
                muted={true}
                autoPlay={true}
                webkit-playsinline="true"
              />
              {!streamActive && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <p className="text-sm opacity-75">カメラ未起動</p>
                  </div>
                </div>
              )}
            </div>

            {/* コントロール */}
            <div className="space-y-2">
              {!streamActive ? (
                <Button 
                  onClick={startCamera}
                  className="w-full"
                  size="lg"
                >
                  カメラを起動（診断）
                </Button>
              ) : (
                <Button 
                  onClick={stopCamera}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  カメラを停止
                </Button>
              )}
            </div>

            {/* ステータス */}
            {status && (
              <div className="p-3 bg-blue-50 rounded text-sm">
                <strong>ステータス:</strong> {status}
              </div>
            )}
            
            {/* ビデオ情報 */}
            {videoInfo && (
              <div className="p-3 bg-gray-50 rounded text-xs font-mono">
                <strong>ビデオ情報:</strong>
                <pre className="mt-1 whitespace-pre-wrap">{videoInfo}</pre>
              </div>
            )}

            {/* エラー */}
            {error && (
              <div className="p-3 bg-red-50 rounded text-sm text-red-700">
                <strong>エラー:</strong>
                <pre className="mt-1 text-xs font-mono whitespace-pre-wrap">{error}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 診断結果 */}
        <Card>
          <CardHeader>
            <CardTitle>診断ガイド</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>このページでカメラが起動する場合:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>QRスキャナーの実装側の問題です</li>
              <li>ワーカーファイルの読み込みを確認してください</li>
            </ul>
            
            <p className="pt-2">このページでもカメラが起動しない場合:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Safari設定でカメラ権限を確認</li>
              <li>PWAを一度削除して再インストール</li>
              <li>設定 → Safari → 詳細 → Webサイトデータをクリア</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};