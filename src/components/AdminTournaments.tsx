import { useState } from 'react';
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

interface AdminTournamentsProps {
  onBack: () => void;
}

// Mock tournaments data
const mockTournaments = {
  active: [
    {
      id: 1,
      name: "第8回BUNGU SQUAD大会",
      date: "2024-07-25",
      time: "19:00",
      location: "○○コミュニティセンター",
      participants: 12,
      status: "開催中"
    }
  ],
  upcoming: [
    {
      id: 2,
      name: "第9回BUNGU SQUAD大会",
      date: "2024-08-08",
      time: "19:00",
      location: "△△コミュニティセンター",
      participants: 0,
      status: "募集中"
    }
  ],
  completed: [
    {
      id: 3,
      name: "第7回BUNGU SQUAD大会",
      date: "2024-07-18",
      time: "19:00",
      location: "○○コミュニティセンター",
      participants: 15,
      status: "完了"
    }
  ]
};

export const AdminTournaments = ({ onBack }: AdminTournamentsProps) => {
  const [currentView, setCurrentView] = useState<'list' | 'create'>('list');
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrTournament, setQrTournament] = useState<any>(null);
  const [newTournament, setNewTournament] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    matchType: 'random',
    description: ''
  });

  const handleCreateTournament = () => {
    // TODO: Implement tournament creation
    console.log('Creating tournament:', newTournament);
    setCurrentView('list');
    setNewTournament({
      name: '',
      date: '',
      time: '',
      location: '',
      matchType: 'random',
      description: ''
    });
  };

  const handleShowQR = (tournament: any) => {
    setQrTournament(tournament);
    setShowQRCode(true);
  };

  const handleCloseQR = () => {
    setShowQRCode(false);
    setQrTournament(null);
  };

  if (currentView === 'create') {
    return (
      <div className="min-h-screen bg-gradient-parchment">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => setCurrentView('list')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex items-center gap-2">
                  <Plus className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-bold text-foreground">新しい大会を作成</h1>
                </div>
              </div>
              <Button variant="fantasy" onClick={handleCreateTournament}>
                作成
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
                <Label htmlFor="match-type">対戦方式</Label>
                <Select value={newTournament.matchType} onValueChange={(value) => setNewTournament(prev => ({ ...prev, matchType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="random">ランダム</SelectItem>
                    <SelectItem value="round-robin">総当たり</SelectItem>
                    <SelectItem value="manual">手動設定</SelectItem>
                  </SelectContent>
                </Select>
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
              開催中の大会
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockTournaments.active.length > 0 ? (
              mockTournaments.active.map((tournament, index) => (
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
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        参加者: {tournament.participants}名
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm">
                      <Settings className="h-3 w-3" />
                      組み合わせ
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
            {mockTournaments.upcoming.map((tournament, index) => (
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
                  <Button variant="outline" size="sm">編集</Button>
                  <Button variant="outline" size="sm">削除</Button>
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
                  {mockTournaments.completed.map((tournament) => (
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
                        <div className="font-medium">{tournament.participants}名</div>
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