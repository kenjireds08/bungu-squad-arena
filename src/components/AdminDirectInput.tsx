import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Edit2, 
  Trophy, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  User
} from 'lucide-react';

interface DirectInputProps {
  matchId?: number;
  player1?: string;
  player2?: string;
  table?: string;
  rule?: string;
  onBack: () => void;
  onComplete?: (result: DirectInputResult) => void;
}

interface DirectInputResult {
  matchId: number;
  winner: string;
  loser: string;
  reason: string;
  customReason?: string;
  inputBy: string;
}

const DIRECT_INPUT_REASONS = [
  { value: 'player-forgot', label: 'プレイヤーが報告を忘れた' },
  { value: 'technical-issue', label: '技術的問題で報告できない' },
  { value: 'timeout', label: '15分タイムアウト' },
  { value: 'dispute', label: '結果に争いがある' },
  { value: 'other', label: 'その他' }
];

export const AdminDirectInput = ({ 
  matchId = 1, 
  player1 = "高橋さん", 
  player2 = "中村さん", 
  table = "卓3", 
  rule = "トランプルール",
  onBack, 
  onComplete 
}: DirectInputProps) => {
  const [selectedWinner, setSelectedWinner] = useState<string>('');
  const [inputReason, setInputReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmit = async () => {
    if (!selectedWinner || !inputReason) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result: DirectInputResult = {
        matchId,
        winner: selectedWinner,
        loser: selectedWinner === player1 ? player2! : player1!,
        reason: inputReason,
        customReason: inputReason === 'other' ? customReason : undefined,
        inputBy: '管理者' // TODO: Get actual admin name
      };

      // TODO: API call to submit direct input
      console.log('Submitting direct input:', result);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onComplete?.(result);
      onBack();
    } catch (error) {
      console.error('Error submitting direct input:', error);
    } finally {
      setIsSubmitting(false);
      setShowConfirmDialog(false);
    }
  };

  const canSubmit = selectedWinner && inputReason && (inputReason !== 'other' || customReason.trim());

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Edit2 className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">代理入力</h1>
              </div>
            </div>
            <Badge variant="secondary" className="bg-warning/20 text-warning">
              管理者機能
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Match Information */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              対戦情報
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">対戦者</Label>
                <div className="flex items-center justify-center p-3 bg-muted/30 rounded-lg">
                  <div className="text-center">
                    <div className="font-semibold text-foreground">{player1}</div>
                    <div className="text-xs text-muted-foreground">vs</div>
                    <div className="font-semibold text-foreground">{player2}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">詳細</Label>
                <div className="p-3 bg-muted/30 rounded-lg space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">卓:</span>
                    <span>{table}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">ルール:</span>
                    <span>{rule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3 w-3" />
                    <span>Match ID: {matchId}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Winner Selection */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-success" />
              試合結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">勝者を選択してください</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={selectedWinner === player1 ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 ${
                    selectedWinner === player1 ? 'bg-success hover:bg-success/90' : ''
                  }`}
                  onClick={() => setSelectedWinner(player1!)}
                >
                  <Trophy className="h-5 w-5" />
                  <span className="font-semibold">{player1}</span>
                  <span className="text-xs">勝利</span>
                </Button>
                <Button
                  variant={selectedWinner === player2 ? "default" : "outline"}
                  className={`h-16 flex flex-col gap-1 ${
                    selectedWinner === player2 ? 'bg-success hover:bg-success/90' : ''
                  }`}
                  onClick={() => setSelectedWinner(player2!)}
                >
                  <Trophy className="h-5 w-5" />
                  <span className="font-semibold">{player2}</span>
                  <span className="text-xs">勝利</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reason Selection */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              代理入力理由
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason-select">理由を選択してください</Label>
              <Select value={inputReason} onValueChange={setInputReason}>
                <SelectTrigger>
                  <SelectValue placeholder="理由を選択..." />
                </SelectTrigger>
                <SelectContent>
                  {DIRECT_INPUT_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {inputReason === 'other' && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="custom-reason">詳細理由</Label>
                <Textarea
                  id="custom-reason"
                  placeholder="詳しい理由を入力してください..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {inputReason && (
              <div className="p-3 bg-info/10 border border-info/20 rounded-lg animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium text-info mb-1">注意事項</div>
                    <div className="text-muted-foreground">
                      代理入力を実行すると、該当プレイヤーに自動的に通知が送信されます。
                      レーティングも即座に更新されますので、慎重に操作してください。
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Button variant="outline" className="flex-1" onClick={onBack}>
            キャンセル
          </Button>
          
          <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="fantasy" 
                className="flex-1" 
                disabled={!canSubmit}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                代理入力を実行
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  代理入力の確認
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="font-medium">入力内容</div>
                  <div className="text-sm space-y-1">
                    <div>対戦: {player1} vs {player2}</div>
                    <div>勝者: <span className="font-semibold text-success">{selectedWinner}</span></div>
                    <div>理由: {DIRECT_INPUT_REASONS.find(r => r.value === inputReason)?.label}</div>
                    {inputReason === 'other' && customReason && (
                      <div>詳細: {customReason}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  この操作は取り消せません。レーティングが即座に更新され、
                  プレイヤーに通知が送信されます。
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setShowConfirmDialog(false)}
                  >
                    キャンセル
                  </Button>
                  <Button 
                    variant="fantasy" 
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>処理中...</>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        実行
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};