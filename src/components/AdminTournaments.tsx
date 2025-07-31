import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Calendar, MapPin, QrCode, Users, Settings } from 'lucide-react';
import { QRCodeDisplay } from './QRCodeDisplay';
import { TournamentManagementView } from './TournamentManagementView';
import { useRankings, useTournaments, useCreateTournament, useUpdateTournament, useDeleteTournament } from '@/hooks/useApi';
import { useToast } from '@/components/ui/use-toast';
import { getCategorizedTournaments, getTournamentStatus } from '@/utils/tournamentData';

interface AdminTournamentsProps {
  onBack: () => void;
  initialView?: 'list' | 'create';
}


export const AdminTournaments = ({ onBack, initialView = 'list' }: AdminTournamentsProps) => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'management' | 'participants'>(initialView);
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState(0);
  const { data: rankings } = useRankings();
  const { data: tournamentsData, isLoading: tournamentsLoading } = useTournaments();
  const createTournamentMutation = useCreateTournament();
  const updateTournamentMutation = useUpdateTournament();
  const deleteTournamentMutation = useDeleteTournament();
  const { toast } = useToast();
  
  // Get tournaments from API data
  const tournaments = getCategorizedTournaments(tournamentsData || []);
  const [qrTournament, setQrTournament] = useState<any>(null);
  const [managementTournament, setManagementTournament] = useState<any>(null);
  const [newTournament, setNewTournament] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    description: ''
  });

  // Calculate active participants from rankings data
  useEffect(() => {
    if (rankings) {
      const activeCount = rankings.filter(player => player.tournament_active === true).length;
      setActiveParticipants(activeCount);
    }
  }, [rankings]);

  const handleCreateTournament = async () => {
    // Validate required fields
    if (!newTournament.name || !newTournament.date || !newTournament.time || !newTournament.location) {
      toast({
        title: "入力エラー",
        description: "必須項目をすべて入力してください",
        variant: "destructive"
      });
      return;
    }

    try {
      const isEditing = !!selectedTournament;
      
      if (isEditing) {
        // Update existing tournament
        await updateTournamentMutation.mutateAsync({
          id: selectedTournament.id,
          tournament: {
            tournament_name: newTournament.name,
            date: newTournament.date,
            start_time: newTournament.time,
            location: newTournament.location,
            description: newTournament.description
          }
        });
        
        toast({
          title: "大会更新完了",
          description: `${newTournament.name}を更新しました`,
        });
      } else {
        // Create new tournament
        await createTournamentMutation.mutateAsync({
          tournament_name: newTournament.name,
          date: newTournament.date,
          start_time: newTournament.time,
          location: newTournament.location,
          description: newTournament.description,
          status: 'upcoming',
          max_participants: 20
        });
        
        toast({
          title: "大会作成完了",
          description: `${newTournament.name}を作成しました`,
        });
      }
      
      setCurrentView('list');
      setSelectedTournament(null);
      setNewTournament({
        name: '',
        date: '',
        time: '',
        location: '',
        description: ''
      });
    } catch (error) {
      console.error('Failed to save tournament:', error);
      const isEditing = !!selectedTournament;
      toast({
        title: "エラー",
        description: `大会の${isEditing ? '更新' : '作成'}に失敗しました`,
        variant: "destructive"
      });
    }
  };


  const handleShowParticipants = (tournament: any) => {
    setSelectedTournament(tournament);
    setCurrentView('participants');
  };

  const handleShowQR = (tournament: any) => {
    setQrTournament(tournament);
    setShowQRCode(true);
  };

  const handleCloseQR = () => {
    setShowQRCode(false);
    setQrTournament(null);
  };

  const handleShowManagement = (tournament: any) => {
    setManagementTournament(tournament);
    setCurrentView('management');
  };

  const handleBackFromManagement = () => {
    setCurrentView('list');
    setManagementTournament(null);
  };

  const handleDeleteTournament = async (tournamentId: string, tournamentName: string) => {
    if (!confirm(`「${tournamentName}」を削除しますか？この操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteTournamentMutation.mutateAsync(tournamentId);
      toast({
        title: "削除完了",
        description: `${tournamentName}を削除しました`,
      });
    } catch (error) {
      console.error('Failed to delete tournament:', error);
      toast({
        title: "エラー",
        description: "大会の削除に失敗しました",
        variant: "destructive"
      });
    }
  };

  const handleEditTournament = (tournament: any) => {
    // Set form data with tournament info and switch to create view for editing
    setNewTournament({
      name: tournament.name,
      date: tournament.date,
      time: tournament.time,
      location: tournament.location,
      description: tournament.description || ''
    });
    setSelectedTournament(tournament);
    setCurrentView('create');
  };

  if (currentView === 'participants' && selectedTournament) {
    return (
      <div className="min-h-screen bg-gradient-parchment">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => {
                setCurrentView('list');
                setSelectedTournament(null);
              }}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">参加者一覧</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          <Card className="border-fantasy-frame shadow-soft">
            <CardHeader>
              <CardTitle>{selectedTournament.name} - 参加者一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rankings?.filter(player => player.tournament_active).map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{player.nickname}</p>
                      <p className="text-sm text-muted-foreground">レーティング: {player.current_rating}</p>
                    </div>
                    <Badge className="bg-green-500 text-white">参加中</Badge>
                  </div>
                )) || <p className="text-muted-foreground">参加者がいません</p>}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (currentView === 'management' && managementTournament) {
    return (
      <TournamentManagementView
        onClose={handleBackFromManagement}
        tournamentId={managementTournament.id.toString()}
        tournamentName={managementTournament.name}
      />
    );
  }

  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-parchment">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => {
                  setCurrentView('list');
                  setSelectedTournament(null);
                  setNewTournament({
                    name: '',
                    date: '',
                    time: '',
                    location: '',
                    
                    description: ''
                  });
                }}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Plus className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-bold text-foreground">
                    {selectedTournament ? '大会を編集' : '新しい大会を作成'}
                  </h1>
                </div>
              </div>
              <Button 
                variant="fantasy" 
                onClick={handleCreateTournament}
                disabled={createTournamentMutation.isPending || updateTournamentMutation.isPending}
              >
                {selectedTournament ? '更新' : '作成'}
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle>大会情報</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tournament-name">大会名</Label>
                <Input
                  id="tournament-name"
                  placeholder="第○回BUNGU SQUAD大会"
                  value={newTournament.name}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tournament-date">開催日</Label>
                  <Input
                    id="tournament-date"
                    type="date"
                    value={newTournament.date}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tournament-time">開始時刻</Label>
                  <Input
                    id="tournament-time"
                    type="time"
                    value={newTournament.time}
                    onChange={(e) => setNewTournament(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tournament-location">開催場所</Label>
                <Input
                  id="tournament-location"
                  placeholder="○○コミュニティセンター"
                  value={newTournament.location}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="tournament-description">説明（任意）</Label>
                <Textarea
                  id="tournament-description"
                  placeholder="大会の詳細や注意事項など..."
                  value={newTournament.description}
                  onChange={(e) => setNewTournament(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-fantasy-frame shadow-soft animate-slide-up">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                QRコード設定
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <QrCode className="h-16 w-16 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  大会作成後に専用QRコードが自動生成されます
                </p>
              </div>
            </CardContent>
          </Card>
        </main>
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
                <Calendar className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">大会管理</h1>
              </div>
            </div>
            <Button variant="fantasy" onClick={() => setCurrentView('create')}>
              <Plus className="h-4 w-4" />
              新規作成
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Active Tournaments */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              本日の大会
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournaments.active.length > 0 ? (
              tournaments.active.map((tournament, index) => (
                <div key={tournament.id} className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                    <Badge variant="default" className="bg-success">
                      {tournament.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {tournament.date} {tournament.time}〜
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {tournament.location}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 cursor-pointer hover:text-primary" onClick={() => handleShowParticipants(tournament)}>
                        <Users className="h-3 w-3" />
                        参加者: {tournament.status === '開催中' ? activeParticipants : tournament.participants}名
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" onClick={() => handleShowManagement(tournament)}>
                      <Settings className="h-3 w-3" />
                      大会管理
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleShowQR(tournament)}>
                      <QrCode className="h-3 w-3" />
                      QRコード
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>開催中の大会はありません</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tournaments */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-info" />
              予定されている大会
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournaments.upcoming.map((tournament, index) => (
              <div key={tournament.id} className="p-4 bg-info/10 border border-info/20 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">{tournament.name}</h3>
                  <Badge variant="outline" className="text-info border-info">
                    {tournament.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {tournament.date} {tournament.time}〜
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tournament.location}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      参加者: {tournament.participants}名
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" onClick={() => handleEditTournament(tournament)}>編集</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDeleteTournament(tournament.id, tournament.name)}>削除</Button>
                  <Button variant="outline" size="sm" onClick={() => handleShowQR(tournament)}>
                    <QrCode className="h-3 w-3" />
                    QRコード
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Completed Tournaments */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '200ms' }}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              過去の大会
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px] whitespace-nowrap">大会名</TableHead>
                    <TableHead className="text-center w-[120px] whitespace-nowrap">開催日</TableHead>
                    <TableHead className="text-center w-[100px] whitespace-nowrap">参加者</TableHead>
                    <TableHead className="text-center w-[80px] whitespace-nowrap">ステータス</TableHead>
                    <TableHead className="text-center w-[120px] whitespace-nowrap">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.completed.map((tournament) => (
                    <TableRow key={tournament.id} className="hover:bg-muted/30">
                      <TableCell className="whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTournament(tournament)}
                          className="text-left hover:underline focus:outline-none"
                        >
                          <div className="font-medium text-foreground">{tournament.name}</div>
                        </button>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="text-muted-foreground">{tournament.date}</div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="font-medium">{tournament.status === '開催中' ? activeParticipants : tournament.participants}名</div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge variant="outline" className="whitespace-nowrap">
                          {tournament.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="text-xs px-2">
                            結果確認
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs px-2">
                            データ出力
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

        {/* Tournament Detail Modal */}
        <Dialog open={!!selectedTournament} onOpenChange={() => setSelectedTournament(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>大会詳細</DialogTitle>
            </DialogHeader>
            {selectedTournament && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{selectedTournament.name}</h3>
                  <Badge variant="outline" className="mt-1">
                    {selectedTournament.status}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      {selectedTournament.date} {selectedTournament.time}〜
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedTournament.location}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">参加者: {selectedTournament.participants}名</span>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <Button variant="outline" className="w-full">
                    <Calendar className="h-4 w-4 mr-2" />
                    結果確認
                  </Button>
                  <Button variant="outline" className="w-full">
                    <QrCode className="h-4 w-4 mr-2" />
                    データ出力
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* QR Code Display Modal */}
        {qrTournament && (
          <QRCodeDisplay
            tournamentId={qrTournament.id.toString()}
            tournamentName={qrTournament.name}
            onClose={handleCloseQR}
            isOpen={showQRCode}
          />
        )}
      </main>
    </div>
  );
};