import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  Trophy, 
  BarChart3,
  Filter,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DataExportProps {
  onClose: () => void;
}

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  size: string;
  type: 'csv' | 'pdf';
}

const exportOptions: ExportOption[] = [
  {
    id: 'match-records',
    name: '試合記録',
    description: '全ての対戦結果とレーティング変動',
    icon: <Trophy className="h-4 w-4" />,
    size: '~2MB',
    type: 'csv'
  },
  {
    id: 'player-list',
    name: 'プレイヤー一覧',
    description: 'プレイヤー情報と現在のレーティング',
    icon: <Users className="h-4 w-4" />,
    size: '~500KB',
    type: 'csv'
  },
  {
    id: 'tournament-history',
    name: '大会履歴',
    description: '過去の大会情報と参加者データ',
    icon: <Calendar className="h-4 w-4" />,
    size: '~1MB',
    type: 'csv'
  },
  {
    id: 'ranking-report',
    name: 'ランキングレポート',
    description: '現在のランキングと統計情報（PDF）',
    icon: <BarChart3 className="h-4 w-4" />,
    size: '~3MB',
    type: 'pdf'
  },
  {
    id: 'monthly-summary',
    name: '月間サマリー',
    description: '月別の活動統計と分析結果',
    icon: <FileText className="h-4 w-4" />,
    size: '~1.5MB',
    type: 'pdf'
  },
  {
    id: 'year-end-report',
    name: '年間レポート',
    description: '年間チャンピオン決定戦用レポート',
    icon: <Trophy className="h-4 w-4" />,
    size: '~5MB',
    type: 'pdf'
  }
];

export const DataExport = ({ onClose }: DataExportProps) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<string>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<Record<string, 'pending' | 'processing' | 'completed' | 'error'>>({});

  const handleOptionToggle = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOptions.length === exportOptions.length) {
      setSelectedOptions([]);
    } else {
      setSelectedOptions(exportOptions.map(opt => opt.id));
    }
  };

  const handleExport = async () => {
    if (selectedOptions.length === 0) return;

    setIsExporting(true);
    const progress: Record<string, 'pending' | 'processing' | 'completed' | 'error'> = {};
    
    // Initialize progress
    selectedOptions.forEach(id => {
      progress[id] = 'pending';
    });
    setExportProgress(progress);

    // Simulate export process
    for (const optionId of selectedOptions) {
      progress[optionId] = 'processing';
      setExportProgress({ ...progress });

      try {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
        
        // Simulate random success/failure
        if (Math.random() > 0.1) { // 90% success rate
          progress[optionId] = 'completed';
          
          // Trigger actual download (mock)
          const option = exportOptions.find(opt => opt.id === optionId);
          if (option) {
            console.log(`Downloading ${option.name} as ${option.type.toUpperCase()}`);
            // TODO: Implement actual file download
          }
        } else {
          progress[optionId] = 'error';
        }
      } catch (error) {
        progress[optionId] = 'error';
      }
      
      setExportProgress({ ...progress });
    }

    setIsExporting(false);
  };

  const getProgressIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const completedCount = Object.values(exportProgress).filter(status => status === 'completed').length;
  const totalSelected = selectedOptions.length;

  return (
    <div className="min-h-screen bg-gradient-parchment">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <Download className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold text-foreground">データ出力</h1>
              </div>
            </div>
            {isExporting && (
              <Badge variant="outline" className="text-info border-info">
                {completedCount}/{totalSelected} 完了
              </Badge>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Export Options */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-primary" />
                エクスポート項目
              </CardTitle>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedOptions.length === exportOptions.length ? '全て解除' : '全て選択'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {exportOptions.map((option, index) => (
              <div
                key={option.id}
                className={`p-4 border rounded-lg transition-all ${
                  selectedOptions.includes(option.id)
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-muted/40 hover:border-muted/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={option.id}
                    checked={selectedOptions.includes(option.id)}
                    onCheckedChange={() => handleOptionToggle(option.id)}
                    disabled={isExporting}
                  />
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span className="font-medium text-foreground">{option.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {option.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{option.size}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {option.description}
                    </div>
                  </div>

                  {selectedOptions.includes(option.id) && exportProgress[option.id] && (
                    <div className="flex items-center gap-2">
                      {getProgressIcon(exportProgress[option.id])}
                      <span className="text-xs text-muted-foreground capitalize">
                        {exportProgress[option.id] === 'processing' ? '処理中...' :
                         exportProgress[option.id] === 'completed' ? '完了' :
                         exportProgress[option.id] === 'error' ? 'エラー' : '待機中'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Date Range Filter */}
        <Card className="border-fantasy-frame shadow-soft animate-slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              期間設定
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">データの期間を選択</label>
              <Select value={dateRange} onValueChange={setDateRange} disabled={isExporting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全期間</SelectItem>
                  <SelectItem value="current-year">今年（2024年）</SelectItem>
                  <SelectItem value="last-year">昨年（2023年）</SelectItem>
                  <SelectItem value="last-3-months">過去3ヶ月</SelectItem>
                  <SelectItem value="last-month">先月</SelectItem>
                  <SelectItem value="current-month">今月</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Export Summary */}
        {selectedOptions.length > 0 && (
          <Card className="border-fantasy-frame shadow-soft animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                エクスポート概要
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-primary">{selectedOptions.length}</div>
                  <div className="text-xs text-muted-foreground">選択項目</div>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-info">
                    {selectedOptions.filter(id => exportOptions.find(opt => opt.id === id)?.type === 'csv').length}
                  </div>
                  <div className="text-xs text-muted-foreground">CSVファイル</div>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-success">
                    {selectedOptions.filter(id => exportOptions.find(opt => opt.id === id)?.type === 'pdf').length}
                  </div>
                  <div className="text-xs text-muted-foreground">PDFファイル</div>
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-warning">~10MB</div>
                  <div className="text-xs text-muted-foreground">推定サイズ</div>
                </div>
              </div>

              {dateRange !== 'all' && (
                <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="text-sm text-info">
                    📅 期間フィルターが適用されます: {
                      dateRange === 'current-year' ? '2024年のデータのみ' :
                      dateRange === 'last-year' ? '2023年のデータのみ' :
                      dateRange === 'last-3-months' ? '過去3ヶ月のデータのみ' :
                      dateRange === 'last-month' ? '先月のデータのみ' :
                      dateRange === 'current-month' ? '今月のデータのみ' : ''
                    }
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Export Button */}
        <div className="flex gap-3 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={isExporting}>
            キャンセル
          </Button>
          
          <Button 
            variant="fantasy" 
            className="flex-1" 
            onClick={handleExport}
            disabled={selectedOptions.length === 0 || isExporting}
          >
            {isExporting ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                エクスポート中... ({completedCount}/{totalSelected})
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                データをエクスポート ({selectedOptions.length}件)
              </>
            )}
          </Button>
        </div>

        {/* Progress Details */}
        {isExporting && Object.keys(exportProgress).length > 0 && (
          <Card className="border-fantasy-frame shadow-soft animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                エクスポート進行状況
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedOptions.map(optionId => {
                const option = exportOptions.find(opt => opt.id === optionId);
                const status = exportProgress[optionId];
                if (!option) return null;

                return (
                  <div key={optionId} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <span className="text-sm font-medium">{option.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getProgressIcon(status)}
                      <span className="text-xs text-muted-foreground">
                        {status === 'processing' ? '処理中...' :
                         status === 'completed' ? '完了' :
                         status === 'error' ? 'エラー' : '待機中'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};