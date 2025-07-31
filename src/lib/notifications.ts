/**
 * PWA通知システム
 */

export class NotificationManager {
  private static instance: NotificationManager;
  
  private constructor() {}
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  /**
   * 通知権限を要求
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  /**
   * 通知を送信
   */
  async sendNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
    const permission = await this.requestPermission();
    
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'bungu-squad',
        renotify: true,
        requireInteraction: true,
        ...options
      });

      // 通知をクリックした時の処理
      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options.data?.action) {
          this.handleNotificationClick(options.data.action);
        }
      };

      // 自動で閉じる（10秒後）
      setTimeout(() => {
        notification.close();
      }, 10000);

      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  }

  /**
   * 通知クリック時のアクション処理
   */
  private handleNotificationClick(action: string) {
    switch (action) {
      case 'match_start':
        // 試合画面に遷移
        window.location.hash = '#/match-waiting';
        break;
      case 'match_approved':
        // ダッシュボードに遷移
        window.location.hash = '#/dashboard';
        break;
      default:
        // デフォルトでダッシュボードに遷移
        window.location.hash = '#/dashboard';
    }
  }

  /**
   * 試合開始通知
   */
  async notifyMatchStart(opponentName: string, matchNumber: number): Promise<boolean> {
    return this.sendNotification(
      `🎯 試合開始のお知らせ`,
      {
        body: `${matchNumber}試合目 vs ${opponentName}\n準備はよろしいですか？`,
        data: { action: 'match_start' },
        actions: [
          { action: 'start', title: '試合開始' },
          { action: 'later', title: '後で' }
        ]
      }
    );
  }

  /**
   * 試合結果承認通知
   */
  async notifyMatchApproved(ratingChange: number, newRating: number): Promise<boolean> {
    const isPositive = ratingChange > 0;
    const emoji = isPositive ? '🎉' : '💪';
    const changeText = isPositive ? `+${ratingChange}` : `${ratingChange}`;
    
    return this.sendNotification(
      `${emoji} 試合結果が承認されました`,
      {
        body: `レーティング変動: ${changeText}pt\n新しいレーティング: ${newRating}pt`,
        data: { action: 'match_approved' }
      }
    );
  }

  /**
   * 大会開始通知
   */
  async notifyTournamentStart(tournamentName: string): Promise<boolean> {
    return this.sendNotification(
      `🏆 大会開始`,
      {
        body: `${tournamentName}が開始されました！\n組み合わせを確認しましょう。`,
        data: { action: 'tournament_start' }
      }
    );
  }

  /**
   * 順番待ち通知
   */
  async notifyTurnComing(matchNumber: number, estimatedTime: number): Promise<boolean> {
    return this.sendNotification(
      `⏰ 順番が近づいています`,
      {
        body: `${matchNumber}試合目まであと約${estimatedTime}分\n準備をお願いします。`,
        data: { action: 'turn_coming' }
      }
    );
  }

  /**
   * 自分の番通知
   */
  async notifyYourTurn(opponentName: string, matchNumber: number): Promise<boolean> {
    return this.sendNotification(
      `🎯 あなたの番です！`,
      {
        body: `${matchNumber}試合目 vs ${opponentName}\n試合を開始してください。`,
        data: { action: 'your_turn' },
        actions: [
          { action: 'start', title: '試合開始' },
          { action: 'later', title: '後で' }
        ]
      }
    );
  }
}

// シングルトンインスタンスをエクスポート
export const notificationManager = NotificationManager.getInstance();