import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface LoginProps {
  onLoginSuccess: (userId: string, isAdmin: boolean) => void;
}

export const Login = ({ onLoginSuccess }: LoginProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nickname: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // 新規登録処理
        if (!formData.nickname.trim()) {
          toast({
            title: "エラー",
            description: "ニックネームは必須です",
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }

        // TODO: API call to create new player
        toast({
          title: "登録完了",
          description: "アカウントが作成されました！",
        });
        
        // 仮のユーザーIDとadminフラグ
        onLoginSuccess('new_player_id', false);
      } else {
        // ログイン処理 - メールアドレスからプレイヤーを検索
        try {
          const response = await fetch('/api/rankings');
          const players = await response.json();
          
          // メールアドレスでプレイヤーを検索
          const player = players.find((p: any) => p.email === formData.email);
          
          if (!player) {
            toast({
              title: "ログイン失敗",
              description: "このメールアドレスは登録されていません",
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
            // 管理者または一般ユーザーのログイン成功
            toast({
              title: "ログイン成功",
              description: isAdmin ? "管理者としてログインしました" : "ログインしました",
            });
            
            // 実際のプレイヤーIDを使用
            onLoginSuccess(player.id, isAdmin);
          } else {
            toast({
              title: "ログイン失敗",
              description: "パスワードが正しくありません",
              variant: "destructive"
            });
          }
        } catch (error) {
          toast({
            title: "エラー",
            description: "ユーザー情報の取得に失敗しました",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "ログイン処理中にエラーが発生しました",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-parchment flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-fantasy-frame shadow-golden">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">
            {isSignUp ? '新規登録' : 'BUNGU SQUAD'}
          </CardTitle>
          <CardDescription className="text-center">
            {isSignUp 
              ? '新しいアカウントを作成します' 
              : 'アカウントにログインしてください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="nickname">
                  ニックネーム <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nickname"
                  placeholder="表示される名前"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={isLoading}
              />
            </div>
            
            {(!isSignUp || formData.email.includes('@')) && (
              <div className="space-y-2">
                <Label htmlFor="password">
                  パスワード {!isSignUp && <span className="text-muted-foreground text-xs">(管理者のみ)</span>}
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={isSignUp ? "安全なパスワード" : "管理者パスワード"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  登録する
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  ログイン
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm"
            >
              {isSignUp 
                ? 'すでにアカウントをお持ちの方はこちら' 
                : '新規登録はこちら'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};