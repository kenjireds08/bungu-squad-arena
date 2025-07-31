import { useEffect, useCallback } from 'react';
import { notificationManager } from '@/lib/notifications';

export const useNotifications = () => {
  // Service Worker メッセージリスナーの設定
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_CLICKED') {
        console.log('Notification clicked:', event.data);
        // ここで必要に応じて状態更新やナビゲーションを行う
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      };
    }
  }, []);

  // 通知権限の要求
  const requestPermission = useCallback(async () => {
    return await notificationManager.requestPermission();
  }, []);

  // 試合開始通知
  const notifyMatchStart = useCallback(async (opponentName: string, matchNumber: number) => {
    return await notificationManager.notifyMatchStart(opponentName, matchNumber);
  }, []);

  // 試合結果承認通知
  const notifyMatchApproved = useCallback(async (ratingChange: number, newRating: number) => {
    return await notificationManager.notifyMatchApproved(ratingChange, newRating);
  }, []);

  // 大会開始通知
  const notifyTournamentStart = useCallback(async (tournamentName: string) => {
    return await notificationManager.notifyTournamentStart(tournamentName);
  }, []);

  // 順番待ち通知
  const notifyTurnComing = useCallback(async (matchNumber: number, estimatedTime: number) => {
    return await notificationManager.notifyTurnComing(matchNumber, estimatedTime);
  }, []);

  // 自分の番通知
  const notifyYourTurn = useCallback(async (opponentName: string, matchNumber: number) => {
    return await notificationManager.notifyYourTurn(opponentName, matchNumber);
  }, []);

  return {
    requestPermission,
    notifyMatchStart,
    notifyMatchApproved,
    notifyTournamentStart,
    notifyTurnComing,
    notifyYourTurn
  };
};