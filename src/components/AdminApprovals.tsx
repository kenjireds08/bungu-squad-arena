import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Edit, Clock, Trophy, AlertCircle } from 'lucide-react';

interface AdminApprovalsProps {
  onBack: () => void;
}

// Mock approvals data
const mockApprovals = {
  pendingResults: [
    {
      id: 1,
      player1: "鈴木さん",
      player2: "佐藤さん",
      reportedResult: "鈴木さん勝利",
      reportedBy: "鈴木さん",
      reportedAt: "2024-07-25 20:30",
      table: "卓1",
      rule: "トランプルール",
      player1Rating: 1850,
      player2Rating: 1685,
      estimatedChange: { winner: "+12", loser: "-12" }
    },
    {
      id: 2,
      player1: "田中さん",
      player2: "山田さん",
      reportedResult: "田中さん勝利",
      reportedBy: "田中さん",
      reportedAt: "2024-07-25 20:25",
      table: "卓3",
      rule: "カードプラスルール",
      player1Rating: 1620,
      player2Rating: 1580,
      estimatedChange: { winner: "+16", loser: "-16" }
    }
  ],
  longWaitingMatches: [
    {
      id: 3,
      player1: "高橋さん",
      player2: "中村さん",
      table: "卓2",
      rule: "トランプルール",
      startedAt: "2024-07-25 20:00",
      elapsedMinutes: 35
    }
  ],
  recentApprovals: [
    {
      id: 4,
      player1: "小林さん",
      player2: "伊藤さん",
      result: "小林さん勝利",
      approvedAt: "2024-07-25 20:20",
      approvedBy: "管理者A"
    }
  ]
};

export const AdminApprovals = ({ onBack }: AdminApprovalsProps) => {
  const [selectedApproval, setSelectedApproval] = useState<number | null>(null);

  const handleApprove = (approvalId: number) => {
    // TODO: Implement approval logic
    console.log('Approving result:', approvalId);
  };

  const handleReject = (approvalId: number) => {
    // TODO: Implement rejection logic
    console.log('Rejecting result:', approvalId);
  };

  const handleDirectInput = (matchId: number) => {
    // TODO: Implement direct input
    console.log('Direct input for match:', matchId);
  };

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">対戦結果承認</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Pending Approvals */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              承認待ちの結果 ({mockApprovals.pendingResults.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockApprovals.pendingResults.length > 0 ? (
              mockApprovals.pendingResults.map((approval, index) => (
                <div
                  key={approval.id}
                  className="p-4 bg-warning/10 border border-warning/20 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">
                        {approval.player1} vs {approval.player2}
                      </h3>
                      <div className="text-sm text-muted-foreground">
                        {approval.table} • {approval.rule}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-warning border-warning">
                      承認待ち
                    </Badge>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-3">
                    <div className="text-sm">
                      <div className="font-medium text-foreground mb-1">申告内容:</div>
                      <div>{approval.reportedResult}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        申告者: {approval.reportedBy} • {approval.reportedAt}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="font-medium">レート変動予想</div>
                      <div>勝者: <span className="text-success font-semibold">{approval.estimatedChange.winner}pt</span></div>
                      <div>敗者: <span className="text-destructive font-semibold">{approval.estimatedChange.loser}pt</span></div>
                    </div>
                    <div className="space-y-1">
                      <div className="font-medium">現在レート</div>
                      <div>{approval.player1}: {approval.player1Rating}pt</div>
                      <div>{approval.player2}: {approval.player2Rating}pt</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="bg-success hover:bg-success/90"
                      onClick={() => handleApprove(approval.id)}
                    >
                      <CheckCircle className="h-3 w-3" />
                      承認
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleReject(approval.id)}
                    >
                      <XCircle className="h-3 w-3" />
                      却下
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedApproval(approval.id)}
                    >
                      <Edit className="h-3 w-3" />
                      修正
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>承認待ちの結果はありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Long Waiting Matches */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-info" />
              長時間未報告の試合
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockApprovals.longWaitingMatches.map((match, index) => (
              <div
                key={match.id}
                className="p-4 bg-info/10 border border-info/20 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">
                      {match.player1} vs {match.player2}
                    </h3>
                    <div className="text-sm text-muted-foreground">
                      {match.table} • {match.rule}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-destructive border-destructive">
                    {match.elapsedMinutes}分経過
                  </Badge>
                </div>

                <div className="text-sm text-muted-foreground mb-3">
                  開始時刻: {match.startedAt}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    📱 催促通知
                  </Button>
                  <Button 
                    variant="tournament" 
                    size="sm"
                    onClick={() => handleDirectInput(match.id)}
                  >
                    <Edit className="h-3 w-3" />
                    代理入力
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Approvals */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-success" />
              最近の承認済み結果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockApprovals.recentApprovals.map((approval, index) => (
              <div
                key={approval.id}
                className="p-3 bg-success/10 border border-success/20 rounded-lg flex items-center justify-between"
              >
                <div>
                  <div className="font-medium text-foreground">
                    {approval.player1} vs {approval.player2}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    結果: {approval.result}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    承認: {approval.approvedBy} • {approval.approvedAt}
                  </div>
                </div>
                <Badge variant="default" className="bg-success">
                  承認済み
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <Button variant="fantasy" size="lg" className="h-16">
            📊 一括承認
          </Button>
          <Button variant="outline" size="lg" className="h-16">
            📄 承認履歴エクスポート
          </Button>
        </div>
      </main>
    </div>
  );
};