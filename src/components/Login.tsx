import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, UserPlus, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface LoginProps {
  onLoginSuccess: (userId: string, isAdmin: boolean) => void;
  isNewPlayer?: boolean;
}

export const Login = ({ onLoginSuccess, isNewPlayer = false }: LoginProps) => {
  const [isSignUp, setIsSignUp] = useState(isNewPlayer);
  const [isLoading, setIsLoading] = useState(false);
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
        // 新規登録 - メール認証フローに変更
        if (!formData.nickname.trim() || !formData.email.trim()) {
          toast({
            title: "エラー",
            description: "ニックネームとメールアドレスは必須です",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // メール認証送信処理
        const emailResponse = await fetch('/api/sendVerificationEmail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email.trim(),
            nickname: formData.nickname.trim(),
            tournamentId: 'current',
            tournamentDate: new Date().toISOString().split('T')[0],
            tournamentTime: '15:30'
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          throw new Error(errorData.error || 'メール送信に失敗しました');
        }

        const emailResult = await emailResponse.json();
        
        toast({
          title: "認証メールを送信しました",
          description: `${formData.email} に認証リンクを送信しました。メールを確認してリンクをクリックしてください。`,
          duration: 8000,
        });

        // 認証待ち状態に切り替え（実装必要）
        console.log('メール認証待ち状態:', emailResult);
        
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
          'mr.warabisako@gmail.com',
          'yosshio@example.com'
        ];
        
        const isAdmin = adminEmails.includes(formData.email) && formData.password === 'bungu-2025';
        
        if (isAdmin || !formData.password) {
          // 最終ログイン日時を更新
          try {
            console.log('Updating last login for user:', user.id);
            const response = await fetch(`/api/players?id=${user.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ updateLastLogin: true })
            });
            const result = await response.json();
            console.log('Last login update result:', result);
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
                ? 'ニックネームとメールアドレスで登録し、自動的に大会にエントリーします'
                : 'メールアドレスでログインしてください'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    {isSignUp ? '登録中...' : 'ログイン中...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        登録して大会にエントリー
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
                    setFormData({ email: '', nickname: '', password: '' });
                  }}
                  className="text-primary hover:text-primary/80"
                >
                  {isSignUp ? '既存プレイヤーの方はこちら' : '初めての方はこちら'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};