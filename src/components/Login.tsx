import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, UserPlus, Mail, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface LoginProps {
  onLoginSuccess: (userId: string, isAdmin: boolean) => void;
  isNewPlayer?: boolean;
}

export const Login = ({ onLoginSuccess, isNewPlayer = false }: LoginProps) => {
  const [isSignUp, setIsSignUp] = useState(isNewPlayer);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationStep, setIsVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    nickname: '',
    password: '' // 既存ユーザーログイン用（管理者のみ）
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (isVerificationStep) {
          // 確認コード検証ステップ
          if (!verificationCode || verificationCode.length !== 4) {
            toast({
              title: "エラー",
              description: "4桁の確認コードを入力してください",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          if (!/^\d{4}$/.test(verificationCode)) {
            toast({
              title: "エラー",
              description: "確認コードは4桁の数字で入力してください",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // 確認コード検証
          const verifyResponse = await fetch('/api/verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'verify',
              email: formData.email,
              code: verificationCode
            })
          });

          if (!verifyResponse.ok) {
            const errorData = await verifyResponse.json();
            toast({
              title: "エラー",
              description: errorData.error || "確認コードが正しくありません",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          const verifyResult = await verifyResponse.json();

          // アカウント作成処理
          const createResponse = await fetch('/api/rankings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nickname: verifyResult.userData.nickname,
              email: verifyResult.userData.email,
              current_rating: 1200,
              tournament_active: true
            })
          });

          if (!createResponse.ok) {
            const errorData = await createResponse.json();
            throw new Error(errorData.error || 'Failed to create player account');
          }

          const newPlayer = await createResponse.json();
          
          toast({
            title: "登録完了！",
            description: `${verifyResult.userData.nickname}さん、ようこそ！大会にエントリーしました。`,
          });

          localStorage.setItem('userId', newPlayer.id);
          onLoginSuccess(newPlayer.id, false);

        } else {
          // メール確認コード送信ステップ
          if (!formData.nickname.trim() || !formData.email.trim()) {
            toast({
              title: "エラー",
              description: "ニックネームとメールアドレスは必須です",
              variant: "destructive"
            });
            setIsLoading(false);
            return;
          }

          // 実際のメール送信
          const sendResponse = await fetch('/api/verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'send',
              email: formData.email,
              nickname: formData.nickname
            })
          });

          if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            throw new Error(errorData.error || 'Failed to send verification code');
          }

          const sendResult = await sendResponse.json();
          
          toast({
            title: "確認コード送信",
            description: `${formData.email}に4桁の確認コードを送信しました。メールをご確認ください。`,
          });

          // Development mode: show code in console
          if (sendResult.code) {
            console.log('Development mode - Verification code:', sendResult.code);
          }

          setIsVerificationStep(true);
        }
        
      } else {
        // 既存プレイヤーログイン処理
        const loginResponse = await fetch('/api/rankings');
        if (!loginResponse.ok) {
          throw new Error('Failed to fetch players');
        }

        const players = await loginResponse.json();
        const user = players.find((p: any) => 
          p.email.toLowerCase() === formData.email.toLowerCase()
        );

        if (!user) {
          toast({
            title: "エラー",
            description: "メールアドレスが見つかりません",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // 管理者チェック
        const adminEmails = [
          'kenji.reds08@gmail.com',
          'warabisako@example.com',
          'yosshio@example.com'
        ];
        
        const isAdmin = adminEmails.includes(formData.email) && formData.password === 'bungu-2025';
        
        if (isAdmin || !formData.password) {
          // 最終ログイン日時を更新
          try {
            await fetch(`/api/players?id=${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updateLastLogin: true })
            });
          } catch (error) {
            console.error('Failed to update last login:', error);
          }

          localStorage.setItem('userId', user.id);
          onLoginSuccess(user.id, isAdmin);
          
          toast({
            title: "ログイン成功",
            description: isAdmin ? "管理者としてログインしました" : `${user.nickname}としてログインしました`,
          });
        } else {
          toast({
            title: "ログイン失敗",
            description: "管理者パスワードが正しくありません",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('Login/Signup error:', error);
      toast({
        title: "エラー",
        description: "処理中にエラーが発生しました",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-fantasy p-4">
      <div className="w-full max-w-md">
        <Card className="border-fantasy-frame shadow-soft backdrop-blur-sm bg-background/95">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary">
              {isSignUp ? '初めての方' : '既存プレイヤーの方'}
            </CardTitle>
            <CardDescription>
              {isSignUp 
                ? (isVerificationStep 
                    ? 'メールに送信された4桁のコードを入力してください'
                    : 'ニックネームとメールアドレスで登録し、自動的に大会にエントリーします'
                  )
                : 'メールアドレスでログインしてください'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && isVerificationStep ? (
                // 確認コード入力フォーム
                <>
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {formData.email}に送信しました
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="verification-code">確認コード *</Label>
                    <Input
                      id="verification-code"
                      type="text"
                      placeholder="1234"
                      maxLength={4}
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-lg tracking-widest"
                      autoFocus
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        登録中...
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        登録完了
                      </>
                    )}
                  </Button>

                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setIsVerificationStep(false)}
                    disabled={isLoading}
                  >
                    戻る
                  </Button>
                </>
              ) : (
                // 通常のログイン・登録フォーム
                <>
                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="nickname">ニックネーム *</Label>
                      <Input
                        id="nickname"
                        type="text"
                        placeholder="あなたのニックネーム"
                        value={formData.nickname}
                        onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                        autoFocus
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email">メールアドレス *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      autoFocus={!isSignUp}
                    />
                  </div>

                  {!isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="password">
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          管理者パスワード（管理者のみ）
                        </div>
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="管理者の場合のみ入力"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        ※一般プレイヤーは空欄のままでOKです
                      </p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {isSignUp ? '確認コード送信中...' : 'ログイン中...'}
                      </>
                    ) : (
                      <>
                        {isSignUp ? (
                          <>
                            <Mail className="h-4 w-4 mr-2" />
                            確認コードを送信
                          </>
                        ) : (
                          <>
                            <LogIn className="h-4 w-4 mr-2" />
                            ログイン
                          </>
                        )}
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setIsSignUp(!isSignUp);
                        setIsVerificationStep(false);
                        setVerificationCode('');
                        setFormData({ email: '', nickname: '', password: '' });
                      }}
                      className="text-primary hover:text-primary/80"
                    >
                      {isSignUp ? '既存プレイヤーの方はこちら' : '初めての方はこちら'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};