import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCheck, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { api } from '@/lib/api';
import { usePendingMatchResults, useApproveMatchResult } from '@/hooks/useApi';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

// Type definition for pending match
interface PendingMatch {
  resultId: string;
  matchId: string;
  playerId: string;
  opponentId: string;
  result: string;
  timestamp: string;
  status: string;
  playerName: string;
  opponentName: string;
}

interface MatchApprovalProps {
  onBack?: () => void;
}

export const MatchApproval = ({ onBack }: MatchApprovalProps = {}) => {
  const [selectedMatch, setSelectedMatch] = useState<PendingMatch | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const { data: pendingMatches, isLoading, error, refetch } = usePendingMatchResults();
  const { mutate: approveMatch, isPending: isApprovalLoading } = useApproveMatchResult();

  useEffect(() => {
    if (error) {
      toast({
        title: 'エラー',
        description: '保留中の試合結果の読み込みに失敗しました',
        variant: 'destructive',
      });
    }
  }, [error]);

  const handleOpenApprovalDialog = (match: PendingMatch) => {
    setSelectedMatch(match);
  };

  const handleApproveMatch = async (approved: boolean) => {
    if (!selectedMatch) return;

    try {
      setIsApproving(true);
      await approveMatch({ resultId: selectedMatch.resultId, approved });
      toast({
        title: '承認完了',
        description: '試合結果を承認しました',
      });
      setSelectedMatch(null);
      await refetch(); // Refresh the pending matches
    } catch (err: any) {
      toast({
        title: 'エラー',
        description: `試合結果の承認に失敗しました: ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setIsApproving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">保留中の試合結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <CheckCheck className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">試合結果承認</h1>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <CheckCheck className="h-4 w-4 mr-2" />
              更新
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {pendingMatches && pendingMatches.length > 0 ? (
          <div className="space-y-3">
            {pendingMatches.map((match) => (
              <Card key={match.resultId} className="border-fantasy-frame shadow-soft">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          試合ID: {match.matchId}
                        </span>
                        <Badge variant="secondary">
                          {match.result === 'win' ? `${match.playerName} 勝利` : `${match.opponentName} 勝利`}
                        </Badge>
                      </div>
                      <p className="font-medium text-lg">
                        {match.playerName} vs {match.opponentName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        報告日時: {format(new Date(match.timestamp), 'yyyy年M月d日 H時m分', { locale: ja })}
                      </p>
                      {/* Remove the rating display section that references non-existent properties */}
                      {/* The rating changes are not available in pending matches, only after approval */}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenApprovalDialog(match)}>
                        確認
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-fantasy-frame shadow-soft">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">保留中の試合結果はありません</p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedMatch} onOpenChange={() => setSelectedMatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>試合結果を承認しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedMatch?.playerName} vs {selectedMatch?.opponentName} の試合結果を
              {selectedMatch?.result === 'win' ? ` ${selectedMatch?.playerName}の勝利` : ` ${selectedMatch?.opponentName}の勝利`}として承認します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleApproveMatch(true)} disabled={isApproving}>
              {isApproving ? '承認中...' : '承認'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
