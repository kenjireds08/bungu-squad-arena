import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Spade, 
  Plus, 
  Star, 
  Info, 
  Trophy, 
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface RuleSelectionProps {
  player1: {
    name: string;
    trumpExperience: boolean;
    cardplusExperience: boolean;
    isNewPlayer?: boolean;
  };
  player2: {
    name: string;
    trumpExperience: boolean;
    cardplusExperience: boolean;
    isNewPlayer?: boolean;
  };
  onRuleSelected: (rule: 'trump' | 'cardplus', showTutorial?: boolean) => void;
  onClose: () => void;
}

export const RuleSelection = ({ player1, player2, onRuleSelected, onClose }: RuleSelectionProps) => {
  const [selectedRule, setSelectedRule] = useState<'trump' | 'cardplus' | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const hasNewPlayer = player1.isNewPlayer || player2.isNewPlayer;
  const canPlayTrump = player1.trumpExperience && player2.trumpExperience;
  const canPlayCardplus = player1.cardplusExperience && player2.cardplusExperience;

  const getRuleBadge = (rule: 'trump' | 'cardplus', player: typeof player1) => {
    if (rule === 'trump') {
      return player.trumpExperience ? (
        <Badge variant="default" className="bg-info text-info-foreground">
          <Spade className="h-3 w-3 mr-1" />
          習得済み
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          未習得
        </Badge>
      );
    } else {
      return player.cardplusExperience ? (
        <Badge variant="default" className="bg-success text-success-foreground">
          <Plus className="h-3 w-3 mr-1" />
          習得済み
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          未習得
        </Badge>
      );
    }
  };

  const handleRuleSelect = (rule: 'trump' | 'cardplus') => {
    setSelectedRule(rule);
    
    // Check if tutorial should be shown for new players
    const needsTutorial = hasNewPlayer || 
      (rule === 'trump' && (!player1.trumpExperience || !player2.trumpExperience)) ||
      (rule === 'cardplus' && (!player1.cardplusExperience || !player2.cardplusExperience));
    
    if (needsTutorial) {
      setShowTutorial(true);
    } else {
      onRuleSelected(rule);
    }
  };

  const handleConfirmWithTutorial = () => {
    if (selectedRule) {
      onRuleSelected(selectedRule, true);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[85vh] overflow-auto">
          <Card className="border-fantasy-frame shadow-soft">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                対戦ルール選択
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Player Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="font-medium text-foreground">{player1.name}</div>
                  <div className="space-y-1">
                    {getRuleBadge('trump', player1)}
                    {getRuleBadge('cardplus', player1)}
                    {player1.isNewPlayer && (
                      <Badge variant="outline" className="text-warning border-warning">
                        <Star className="h-3 w-3 mr-1" />
                        新規参加
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="font-medium text-foreground">{player2.name}</div>
                  <div className="space-y-1">
                    {getRuleBadge('trump', player2)}
                    {getRuleBadge('cardplus', player2)}
                    {player2.isNewPlayer && (
                      <Badge variant="outline" className="text-warning border-warning">
                        <Star className="h-3 w-3 mr-1" />
                        新規参加
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Rule Selection */}
              <div className="space-y-4">
                <div className="font-medium text-foreground">使用ルールを選択してください</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Trump Rule */}
                  <Button
                    variant="outline"
                    className={`h-24 flex flex-col gap-2 ${
                      !canPlayTrump ? 'opacity-50 cursor-not-allowed' : 'hover:bg-info/10'
                    }`}
                    onClick={() => canPlayTrump && handleRuleSelect('trump')}
                    disabled={!canPlayTrump}
                  >
                    <div className="flex items-center gap-2">
                      <Spade className="h-6 w-6 text-info" />
                      <span className="font-semibold">トランプルール</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      基本ルール
                    </div>
                    {!canPlayTrump && (
                      <Badge variant="outline" className="text-xs">
                        どちらかが未習得
                      </Badge>
                    )}
                  </Button>

                  {/* Card Plus Rule */}
                  <Button
                    variant="outline"
                    className={`h-24 flex flex-col gap-2 ${
                      !canPlayCardplus ? 'opacity-50 cursor-not-allowed' : 'hover:bg-success/10'
                    }`}
                    onClick={() => canPlayCardplus && handleRuleSelect('cardplus')}
                    disabled={!canPlayCardplus}
                  >
                    <div className="flex items-center gap-2">
                      <Plus className="h-6 w-6 text-success" />
                      <span className="font-semibold">カードプラスルール</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      上級ルール
                    </div>
                    {!canPlayCardplus && (
                      <Badge variant="outline" className="text-xs">
                        どちらかが未習得
                      </Badge>
                    )}
                  </Button>
                </div>

                {/* Force Rule Selection for New Players */}
                {hasNewPlayer && (
                  <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium text-warning mb-1">新規参加者がいます</div>
                        <div className="text-muted-foreground">
                          新規参加者には、選択したルールの簡単な説明が表示されます。
                          この対戦完了後、ルール習得バッジが自動的に付与されます。
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Override for Learning */}
                {(!canPlayTrump || !canPlayCardplus) && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">
                      学習用として対戦する場合：
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {!canPlayTrump && (
                        <Button
                          variant="outline"
                          className="h-16 flex flex-col gap-1 hover:bg-info/10 border-dashed"
                          onClick={() => handleRuleSelect('trump')}
                        >
                          <Spade className="h-4 w-4 text-info" />
                          <span className="text-sm">トランプルールで学習</span>
                          <span className="text-xs text-muted-foreground">習得扱いになります</span>
                        </Button>
                      )}
                      {!canPlayCardplus && (
                        <Button
                          variant="outline"
                          className="h-16 flex flex-col gap-1 hover:bg-success/10 border-dashed"
                          onClick={() => handleRuleSelect('cardplus')}
                        >
                          <Plus className="h-4 w-4 text-success" />
                          <span className="text-sm">カードプラスで学習</span>
                          <span className="text-xs text-muted-foreground">習得扱いになります</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end">
                <Button variant="ghost" onClick={onClose}>
                  キャンセル
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tutorial Confirmation Dialog */}
      <Dialog open={showTutorial} onOpenChange={setShowTutorial}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-info" />
              ルール説明の表示
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="font-medium">
                {selectedRule === 'trump' ? 'トランプルール' : 'カードプラスルール'}を選択しました
              </div>
              <div className="text-sm text-muted-foreground">
                新規参加者または未習得者がいるため、対戦開始前にルールの簡単な説明を表示します。
              </div>
            </div>
            
            <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
              <div className="text-sm">
                <div className="font-medium text-info mb-1">対戦完了後の処理</div>
                <div className="text-muted-foreground">
                  • 該当プレイヤーにルール習得バッジを付与<br />
                  • 次回から通常の対戦が可能になります
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowTutorial(false)}
              >
                キャンセル
              </Button>
              <Button 
                variant="fantasy" 
                className="flex-1"
                onClick={handleConfirmWithTutorial}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                対戦開始
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};