import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Bell, Trophy, Users, Calendar, Trash2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface Notification {
  id: string;
  type: 'tournament' | 'match' | 'result' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
}

interface NotificationHistoryProps {
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'tournament',
    title: '新しい大会が作成されました',
    message: '第9回BUNGU SQUAD大会が8/22(木)に開催されます。エントリーをお忘れなく！',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    priority: 'high',
    read: false
  },
  {
    id: '2',
    type: 'match',
    title: '対戦相手が決定しました',
    message: '田中さんとの対戦が卓2で予定されています。カードプラスルールで行います。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    priority: 'medium',
    read: true
  },
  {
    id: '3',
    type: 'result',
    title: 'レーティングが更新されました',
    message: '対戦結果が承認され、レーティングが1650pt → 1665pt (+15pt) に更新されました。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    priority: 'medium',
    read: true
  },
  {
    id: '4',
    type: 'system',
    title: 'ランキングが更新されました',
    message: '月間ランキングが更新されました。現在の順位は3位です。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    priority: 'low',
    read: true
  },
  {
    id: '5',
    type: 'tournament',
    title: '大会エントリー締切間近',
    message: '第8回BUNGU SQUAD大会のエントリー締切まで残り1日です。',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    priority: 'medium',
    read: true
  }
];

export const NotificationHistory = ({ onClose }: NotificationHistoryProps) => {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = notifications.filter(notification => {
    const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notification.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || (filter === 'unread' && !notification.read);
    return matchesSearch && matchesFilter;
  });

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <Trophy className="h-5 w-5 text-primary" />;
      case 'match':
        return <Users className="h-5 w-5 text-success" />;
      case 'result':
        return <Bell className="h-5 w-5 text-info" />;
      case 'system':
        return <Calendar className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">重要</Badge>;
      case 'medium':
        return <Badge variant="default" className="text-xs">通常</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">低</Badge>;
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60));
      return `${diffInMinutes}分前`;
    } else if (diffInHours < 24) {
      return `${diffInHours}時間前`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}日前`;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gradient-parchment">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-fantasy-frame shadow-soft">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={onClose} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              戻る
            </Button>
            <h1 className="text-lg font-bold text-foreground">通知履歴</h1>
            <Button variant="ghost" size="sm" onClick={clearAll}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary */}
        <Card className="border-fantasy-frame shadow-soft animate-fade-in">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">通知一覧</h2>
                <p className="text-sm text-muted-foreground">
                  全{notifications.length}件
                  {unreadCount > 0 && (
                    <span className="text-destructive ml-2">
                      （未読{unreadCount}件）
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  すべて
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                  className="relative"
                >
                  未読
                  {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 text-xs p-0 flex items-center justify-center">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="通知を検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notification, index) => (
            <Card 
              key={notification.id} 
              className={`border-fantasy-frame shadow-soft animate-slide-up cursor-pointer transition-all hover:shadow-golden ${
                !notification.read ? 'ring-2 ring-primary/20' : ''
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => markAsRead(notification.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-medium ${!notification.read ? 'text-primary' : 'text-foreground'}`}>
                          {notification.title}
                        </h3>
                        {getPriorityBadge(notification.priority)}
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredNotifications.length === 0 && (
          <Card className="border-muted">
            <CardContent className="pt-8 pb-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? '該当する通知が見つかりません' : '通知はありません'}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};