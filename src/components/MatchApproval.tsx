import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Shield, Trophy, Users, Clock, CheckCircle, XCircle, Loader2, MessageSquare, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MatchApprovalProps {
  onBack: () => void;
}

interface PendingMatch {
  match_id: string;
  tournament_id: string;
  player1_id: string;
  player2_id: string;
  player1_name: string;
  player2_name: string;
  table_number: number;
  match_status: string;
  winner_id: string;
  loser_id: string;
  reported_by: string;
  reported_at: string;
  player1_rating_before: number;
  player2_rating_before: number;
  notes: string;
}

export const MatchApproval = ({ onBack }: MatchApprovalProps) => {
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<PendingMatch | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvingMatchId, setApprovingMatchId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingMatches();
  }, []);

  const loadPendingMatches = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/matches?action=pendingResults');
      if (!response.ok) {
        throw new Error('Failed to load pending matches');
      }

      const result = await response.json();
      setPendingMatches(result.data || []);
    } catch (error) {
      console.error('Error loading pending matches:', error);
      toast({
        title: "エラー",
        description: "承認待ち一覧の読み込みに失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowDetail = (match: PendingMatch) => {
    setSelectedMatch(match);
    setShowDetailDialog(true);
  };

  const handleApprove = async (matchId: string, action: 'approve' | 'reject') => {
    setIsApproving(true);
    setApprovingMatchId(matchId);
    
    try {
      const response = await fetch('/api/matches?action=approve', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          match_id: matchId,
          action,
          approved_by: 'admin', // TODO: Get from current user context
          approved_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process approval');
      }

      const result = await response.json();
      
      toast({
        title: action === 'approve' ? "承認完了" : "却下完了",
        description: action === 'approve' ? 
          "対戦結果を承認し、レーティングを更新しました" : 
          "対戦結果を却下しました",
      });
      
      // Reload pending matches
      await loadPendingMatches();
      setShowDetailDialog(false);
      
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "承認処理に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsApproving(false);
      setApprovingMatchId(null);
    }
  };

  const getWinnerName = (match: PendingMatch) => {
    return match.winner_id === match.player1_id ? match.player1_name : match.player2_name;
  };

  const getLoserName = (match: PendingMatch) => {
    return match.loser_id === match.player1_id ? match.player1_name : match.player2_name;
  };

  const getReporterName = (match: PendingMatch) => {
    return match.reported_by === match.player1_id ? match.player1_name : match.player2_name;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-parchment flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">承認待ち一覧を読み込み中...</p>
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
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">対戦結果承認</h1>
              </div>
            </div>
            <Badge variant="secondary" className="bg-gradient-gold">
              承認待ち: {pendingMatches.length}件
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {pendingMatches.length === 0 ? (
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardContent className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">承認待ちの対戦結果はありません</h3>
              <p className="text-muted-foreground">
                プレイヤーが対戦結果を報告すると、ここに表示されます。
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle>承認待ち一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">テーブル</TableHead>
                      <TableHead className="w-[200px]">対戦</TableHead>
                      <TableHead className="w-[120px]">勝者</TableHead>
                      <TableHead className="w-[100px]">報告者</TableHead>
                      <TableHead className="w-[150px]">報告日時</TableHead>
                      <TableHead className="w-[80px]">メモ</TableHead>
                      <TableHead className="text-center w-[180px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingMatches.map((match) => (
                      <TableRow key={match.match_id} className="hover:bg-muted/30">
                        <TableCell>
                          <Badge variant="outline">{match.table_number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm font-medium">
                              {match.player1_name} vs {match.player2_name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {match.player1_rating_before}pt vs {match.player2_rating_before}pt
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Trophy className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium">{getWinnerName(match)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{getReporterName(match)}</span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(match.reported_at)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {match.notes && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowDetail(match)}
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleShowDetail(match)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-green-200 hover:bg-green-50"
                              onClick={() => handleApprove(match.match_id, 'approve')}
                              disabled={isApproving && approvingMatchId === match.match_id}
                            >
                              {isApproving && approvingMatchId === match.match_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-red-200 hover:bg-red-50"
                              onClick={() => handleApprove(match.match_id, 'reject')}
                              disabled={isApproving && approvingMatchId === match.match_id}
                            >
                              <XCircle className="h-3 w-3 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            承認すると自動的にレーティングが計算・更新されます。却下した場合、対戦は無効になります。
          </AlertDescription>
        </Alert>
      </main>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>対戦結果詳細</DialogTitle>
          </DialogHeader>
          
          {selectedMatch && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-center space-y-2">
                  <Badge variant="outline">テーブル {selectedMatch.table_number}</Badge>
                  <div className="text-lg font-bold">
                    {selectedMatch.player1_name} vs {selectedMatch.player2_name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedMatch.player1_rating_before}pt vs {selectedMatch.player2_rating_before}pt
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">勝者: {getWinnerName(selectedMatch)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>報告者: {getReporterName(selectedMatch)}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>報告日時: {formatDateTime(selectedMatch.reported_at)}</span>
                </div>
              </div>

              {selectedMatch.notes && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">メモ・コメント</span>
                  </div>
                  <div className="p-3 bg-muted/20 rounded-md text-sm">
                    {selectedMatch.notes}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDetailDialog(false)}
            >
              閉じる
            </Button>
            {selectedMatch && (
              <>
                <Button
                  variant="outline"
                  className="border-red-200 hover:bg-red-50"
                  onClick={() => handleApprove(selectedMatch.match_id, 'reject')}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                  )}
                  却下
                </Button>
                <Button
                  variant="heroic"
                  onClick={() => handleApprove(selectedMatch.match_id, 'approve')}
                  disabled={isApproving}
                >
                  {isApproving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  承認
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};