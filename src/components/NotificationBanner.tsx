import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Bell, Trophy, Users, Calendar } from 'lucide-react';

interface Notification {
  id: string;
  type: 'tournament' | 'match' | 'result' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

interface NotificationBannerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
  onViewAll: () => void;
}

export const NotificationBanner = ({ notifications, onDismiss, onViewAll }: NotificationBannerProps) => {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notifications.length > 0 && !currentNotification) {
      // Show highest priority notification first
      const sortedNotifications = [...notifications].sort((a, b) => {
        const priority = { high: 3, medium: 2, low: 1 };
        return priority[b.priority] - priority[a.priority];
      });
      setCurrentNotification(sortedNotifications[0]);
      setIsVisible(true);
    }
  }, [notifications, currentNotification]);

  useEffect(() => {
    if (currentNotification) {
      // Auto-dismiss after 5 seconds for low priority notifications
      if (currentNotification.priority === 'low') {
        const timer = setTimeout(() => {
          handleDismiss();
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentNotification]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (currentNotification) {
        onDismiss(currentNotification.id);
        setCurrentNotification(null);
      }
    }, 300);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'tournament':
        return <Trophy className="h-4 w-4" />;
      case 'match':
        return <Users className="h-4 w-4" />;
      case 'result':
        return <Bell className="h-4 w-4" />;
      case 'system':
        return <Calendar className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getBannerStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-gradient-parchment border-fantasy-frame text-foreground shadow-elegant';
      case 'medium':
        return 'bg-card/95 border-border text-card-foreground shadow-md';
      case 'low':
        return 'bg-muted/95 text-muted-foreground border-border shadow-sm';
      default:
        return 'bg-background/95 text-foreground border-border shadow-sm';
    }
  };

  if (!currentNotification || !isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-16 left-4 right-4 z-40 mx-auto max-w-md transform transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <div className={`rounded-lg border shadow-lg backdrop-blur-sm ${getBannerStyle(currentNotification.priority)}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="mt-0.5">
                {getIcon(currentNotification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm mb-1">
                  {currentNotification.title}
                </h4>
                <p className="text-sm opacity-90 line-clamp-2">
                  {currentNotification.message}
                </p>
                <p className="text-xs opacity-70 mt-1">
                  {currentNotification.timestamp.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              {notifications.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onViewAll}
                  className="h-6 w-6 p-0 hover:bg-white/20"
                >
                  <Bell className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="h-6 w-6 p-0 hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Progress bar for auto-dismiss */}
        {currentNotification.priority === 'low' && (
          <div className="h-1 bg-white/20 overflow-hidden">
            <div 
              className="h-full bg-white/50 animate-pulse"
              style={{
                animation: 'shrink 5s linear forwards'
              }}
            />
          </div>
        )}
      </div>
      
      {/* Multiple notifications indicator */}
      {notifications.length > 1 && (
        <div className="text-center mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs text-white/80 hover:text-white"
          >
            他{notifications.length - 1}件の通知
          </Button>
        </div>
      )}
    </div>
  );
};

// Add custom animation to CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes shrink {
    from { width: 100%; }
    to { width: 0%; }
  }
`;
document.head.appendChild(style);