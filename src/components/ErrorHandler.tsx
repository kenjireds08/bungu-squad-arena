import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Server, 
  Home,
  MessageCircle,
  ArrowLeft
} from 'lucide-react';

interface ErrorHandlerProps {
  error: {
    type: 'network' | 'server' | 'timeout' | 'unknown';
    message: string;
    details?: string;
    statusCode?: number;
  };
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBack?: () => void;
  showContactSupport?: boolean;
}

// Mock image for のり獣人 character
const glueCharacterImage = "/src/assets/glue.png"; // This would be the actual character image

export const ErrorHandler = ({ 
  error, 
  onRetry, 
  onGoHome, 
  onGoBack,
  showContactSupport = true 
}: ErrorHandlerProps) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
        return <WifiOff className="h-12 w-12 text-destructive" />;
      case 'server':
        return <Server className="h-12 w-12 text-destructive" />;
      case 'timeout':
        return <RefreshCw className="h-12 w-12 text-warning" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-destructive" />;
    }
  };

  const getErrorTitle = () => {
    switch (error.type) {
      case 'network':
        return 'インターネット接続エラー';
      case 'server':
        return 'サーバーエラー';
      case 'timeout':
        return '接続タイムアウト';
      default:
        return 'エラーが発生しました';
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case 'network':
        return 'インターネット接続を確認してください。Wi-Fiまたはモバイルデータの接続状況をご確認ください。';
      case 'server':
        return 'サーバーに一時的な問題が発生しています。しばらく待ってから再度お試しください。';
      case 'timeout':
        return '接続がタイムアウトしました。ネットワーク状況が不安定な可能性があります。';
      default:
        return '予期しないエラーが発生しました。お手数ですが、再度お試しください。';
    }
  };

  const getSolutionSteps = () => {
    switch (error.type) {
      case 'network':
        return [
          'Wi-Fi接続を確認する',
          'モバイルデータをON/OFFする',
          '機内モードを一度ONにしてからOFFにする',
          '別のネットワークに接続してみる'
        ];
      case 'server':
        return [
          '数分待ってから再試行する',
          'アプリを一度閉じて再起動する',
          'デバイスを再起動する'
        ];
      case 'timeout':
        return [
          'ネットワーク接続を確認する',
          '混雑していない時間に再試行する',
          'キャッシュをクリアしてみる'
        ];
      default:
        return [
          'ページを再読み込みする',
          'アプリを再起動する',
          'デバイスを再起動する'
        ];
    }
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } catch (err) {
      console.error('Retry failed:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-parchment flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Character and Error Icon */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            {/* のり獣人 Character */}
            <div className="w-32 h-32 mx-auto bg-muted/30 rounded-full flex items-center justify-center mb-4">
              <div className="text-6xl opacity-60">🦌</div> {/* Placeholder for glue character */}
            </div>
            {/* Error overlay icon */}
            <div className="absolute -bottom-2 -right-2">
              {getErrorIcon()}
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              {getErrorTitle()}
            </h1>
            <p className="text-muted-foreground">
              のり獣人からのお知らせです
            </p>
          </div>
        </div>

        {/* Error Details */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              エラーの詳細
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {getErrorDescription()}
              </p>
              {error.message && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <div className="text-sm font-mono text-destructive">
                    {error.message}
                  </div>
                  {error.statusCode && (
                    <Badge variant="outline" className="mt-2 text-destructive border-destructive">
                      エラーコード: {error.statusCode}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {error.details && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  技術的な詳細を表示
                </summary>
                <div className="mt-2 p-3 bg-muted/30 rounded-lg font-mono text-xs">
                  {error.details}
                </div>
              </details>
            )}
          </CardContent>
        </Card>

        {/* Solution Steps */}
        <Card className="border-fantasy-frame shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-info" />
              解決方法
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {getSolutionSteps().map((step, index) => (
                <li key={index} className="flex items-center gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-info/20 text-info flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onRetry && (
            <Button 
              variant="fantasy" 
              size="lg" 
              className="w-full h-12"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  再試行中...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  もう一度試す
                </>
              )}
            </Button>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {onGoBack && (
              <Button variant="outline" size="lg" onClick={onGoBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                前の画面に戻る
              </Button>
            )}
            
            {onGoHome && (
              <Button variant="outline" size="lg" onClick={onGoHome}>
                <Home className="h-4 w-4 mr-2" />
                ホーム画面に戻る
              </Button>
            )}
          </div>

          {showContactSupport && (
            <div className="text-center">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <MessageCircle className="h-4 w-4 mr-2" />
                問題が解決しない場合はサポートに連絡
              </Button>
            </div>
          )}
        </div>

        {/* Network Status Indicator */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          {navigator.onLine ? (
            <>
              <Wifi className="h-4 w-4 text-success" />
              <span>インターネット接続OK</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-destructive" />
              <span>インターネット接続なし</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};