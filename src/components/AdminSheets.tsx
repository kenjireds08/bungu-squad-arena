import React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Database, CheckCircle, AlertCircle, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface AdminSheetsProps {
  onBack: () => void;
}

export const AdminSheets = ({ onBack }: AdminSheetsProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [sheetStatus, setSheetStatus] = useState<{
    tournamentMatches: 'unknown' | 'exists' | 'missing';
    tournamentDailyArchive: 'unknown' | 'exists' | 'missing';
  }>({
    tournamentMatches: 'unknown',
    tournamentDailyArchive: 'unknown'
  });
  const { toast } = useToast();

  const handleCreateTournamentMatchesSheet = async () => {
    setIsCreating(true);
    
    try {
      const response = await fetch('/api/admin?action=create-sheet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create sheet');
      }

      const result = await response.json();
      
      toast({
        title: "シート作成完了",
        description: "TournamentMatchesシートが正常に作成されました",
      });

      setSheetStatus(prev => ({
        ...prev,
        tournamentMatches: 'exists'
      }));
      
    } catch (error) {
      console.error('Error creating tournament matches sheet:', error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "シートの作成に失敗しました",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'exists':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'missing':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Database className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'exists':
        return '作成済み';
      case 'missing':
        return '未作成';
      default:
        return '不明';
    }
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
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold text-foreground">シート管理</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            大会機能を使用するために必要なGoogle Sheetsのシートを作成・管理します。
          </AlertDescription>
        </Alert>

        {/* Tournament Matches Sheet */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon(sheetStatus.tournamentMatches)}
                TournamentMatchesシート
              </span>
              <span className="text-sm text-muted-foreground">
                {getStatusText(sheetStatus.tournamentMatches)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>大会の組み合わせと対戦結果を管理するシートです。</p>
              <p>以下のカラムが含まれます：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>match_id, tournament_id, player1_id, player2_id</li>
                <li>table_number, match_status, created_at</li>
                <li>winner_id, loser_id, match_start_time, match_end_time</li>
                <li>rating情報 (before/after/change)</li>
                <li>reported_by, approved_by, notes</li>
              </ul>
            </div>
            
            {sheetStatus.tournamentMatches !== 'exists' && (
              <Button 
                variant="heroic" 
                onClick={handleCreateTournamentMatchesSheet}
                disabled={isCreating}
                className="w-full"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    作成中...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    TournamentMatchesシートを作成
                  </>
                )}
              </Button>
            )}

            {sheetStatus.tournamentMatches === 'exists' && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  TournamentMatchesシートは既に作成されています。
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Tournament Daily Archive Sheet */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {getStatusIcon(sheetStatus.tournamentDailyArchive)}
                TournamentDailyArchiveシート
              </span>
              <span className="text-sm text-muted-foreground">
                {getStatusText(sheetStatus.tournamentDailyArchive)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>毎日の大会参加履歴を保存するシートです。</p>
              <p>以下のカラムが含まれます：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>archive_id, tournament_date, player_id, player_nickname</li>
                <li>entry_timestamp, total_participants_that_day</li>
                <li>created_at</li>
              </ul>
            </div>
            
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                TournamentDailyArchiveシートは手動で作成する必要があります。
                Google Sheetsで直接作成してください。
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle>システム状況</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="font-medium">組み合わせ機能</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sheetStatus.tournamentMatches === 'exists' ? 
                    '利用可能' : 
                    'TournamentMatchesシートが必要'
                  }
                </p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="h-4 w-4 text-primary" />
                  <span className="font-medium">アーカイブ機能</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {sheetStatus.tournamentDailyArchive === 'exists' ? 
                    '利用可能' : 
                    'TournamentDailyArchiveシートが必要'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};