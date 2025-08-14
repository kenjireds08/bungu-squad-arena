import { GoogleSheetsClient } from './google-sheets-client';
import type { Player, Badge } from '@/types';

export interface GameStats {
  totalGames: number;
  totalWins: number;
  currentWinStreak: number;
  maxWinStreak: number;
}

export interface BadgeCheckResult {
  badgeId: string;
  badgeName: string;
  shouldAward: boolean;
  reason: string;
}

export class BadgeService {
  private sheetsClient: GoogleSheetsClient;

  constructor(sheetsClient: GoogleSheetsClient) {
    this.sheetsClient = sheetsClient;
  }

  /**
   * プレイヤーのゲーム統計を取得
   */
  async getPlayerGameStats(playerId: string): Promise<GameStats> {
    const matches = await this.sheetsClient.getTournamentMatches();
    
    // プレイヤーが参加した全試合を取得
    const playerMatches = matches.filter(m => 
      (m.player1_id === playerId || m.player2_id === playerId) &&
      m.match_status === 'completed'
    );

    const totalGames = playerMatches.length;
    const totalWins = playerMatches.filter(m => m.winner_id === playerId).length;

    // 連勝記録を計算
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let tempStreak = 0;

    // 試合を時系列順にソート
    const sortedMatches = playerMatches.sort((a, b) => 
      new Date(a.match_end_time || a.created_at).getTime() - 
      new Date(b.match_end_time || b.created_at).getTime()
    );

    for (const match of sortedMatches) {
      if (match.winner_id === playerId) {
        tempStreak++;
        maxWinStreak = Math.max(maxWinStreak, tempStreak);
      } else {
        tempStreak = 0;
      }
    }

    // 最新の連勝記録を確認
    for (let i = sortedMatches.length - 1; i >= 0; i--) {
      if (sortedMatches[i].winner_id === playerId) {
        currentWinStreak++;
      } else {
        break;
      }
    }

    return {
      totalGames,
      totalWins,
      currentWinStreak,
      maxWinStreak
    };
  }

  /**
   * プレイヤーが取得すべきバッジをチェック
   */
  async checkBadgesForPlayer(playerId: string): Promise<BadgeCheckResult[]> {
    const player = await this.sheetsClient.getPlayerById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const stats = await this.getPlayerGameStats(playerId);
    const existingBadges = player.badges || [];
    const results: BadgeCheckResult[] = [];

    // ゲーム参加バッジ
    const gameParticipationBadges = [
      { id: 'game_10', name: '初心者戦士', threshold: 10 },
      { id: 'game_50', name: 'ベテラン戦士', threshold: 50 },
      { id: 'game_100', name: '百戦錬磨', threshold: 100 }
    ];

    for (const badge of gameParticipationBadges) {
      const hasBadge = existingBadges.includes(badge.id);
      const shouldAward = stats.totalGames >= badge.threshold && !hasBadge;
      
      if (shouldAward) {
        results.push({
          badgeId: badge.id,
          badgeName: badge.name,
          shouldAward: true,
          reason: `${badge.threshold}試合参加達成！`
        });
      }
    }

    // 勝利バッジ
    const winBadges = [
      { id: 'win_first', name: '初勝利', threshold: 1 },
      { id: 'win_10', name: '勝利の道', threshold: 10 },
      { id: 'win_50', name: '勝利の覇者', threshold: 50 },
      { id: 'win_100', name: '百勝王', threshold: 100 }
    ];

    for (const badge of winBadges) {
      const hasBadge = existingBadges.includes(badge.id);
      const shouldAward = stats.totalWins >= badge.threshold && !hasBadge;
      
      if (shouldAward) {
        results.push({
          badgeId: badge.id,
          badgeName: badge.name,
          shouldAward: true,
          reason: `${badge.threshold}勝利達成！`
        });
      }
    }

    // 連勝バッジ
    const streakBadges = [
      { id: 'streak_3', name: '三連勝', threshold: 3 },
      { id: 'streak_5', name: '五連勝', threshold: 5 },
      { id: 'streak_10', name: '十連勝', threshold: 10 }
    ];

    for (const badge of streakBadges) {
      const hasBadge = existingBadges.includes(badge.id);
      const shouldAward = stats.maxWinStreak >= badge.threshold && !hasBadge;
      
      if (shouldAward) {
        results.push({
          badgeId: badge.id,
          badgeName: badge.name,
          shouldAward: true,
          reason: `${badge.threshold}連勝達成！`
        });
      }
    }

    return results;
  }

  /**
   * プレイヤーにバッジを付与
   */
  async awardBadge(playerId: string, badgeId: string): Promise<void> {
    const player = await this.sheetsClient.getPlayerById(playerId);
    if (!player) {
      throw new Error('Player not found');
    }

    const currentBadges = player.badges || [];
    
    // 既にバッジを持っている場合はスキップ
    if (currentBadges.includes(badgeId)) {
      console.log(`Player ${playerId} already has badge ${badgeId}`);
      return;
    }

    // バッジを追加
    const updatedBadges = [...currentBadges, badgeId];
    
    // プレイヤー情報を更新
    await this.sheetsClient.updatePlayerBadges(playerId, updatedBadges);
    
    console.log(`Awarded badge ${badgeId} to player ${playerId}`);
  }

  /**
   * 試合終了後にバッジをチェックして付与
   */
  async processMatchCompletion(matchId: string): Promise<BadgeCheckResult[]> {
    const match = await this.sheetsClient.getTournamentMatchById(matchId);
    if (!match || match.match_status !== 'completed') {
      return [];
    }

    const allResults: BadgeCheckResult[] = [];
    
    // 両プレイヤーのバッジをチェック
    const playerIds = [match.player1_id, match.player2_id].filter(Boolean);
    
    for (const playerId of playerIds) {
      if (!playerId) continue;
      
      try {
        const results = await this.checkBadgesForPlayer(playerId);
        
        // 付与すべきバッジがある場合は付与
        for (const result of results) {
          if (result.shouldAward) {
            await this.awardBadge(playerId, result.badgeId);
            allResults.push(result);
          }
        }
      } catch (error) {
        console.error(`Error processing badges for player ${playerId}:`, error);
      }
    }

    return allResults;
  }

  /**
   * 全プレイヤーのバッジ状態を再計算（管理者用）
   */
  async recalculateAllBadges(): Promise<Map<string, BadgeCheckResult[]>> {
    const players = await this.sheetsClient.getPlayers();
    const resultMap = new Map<string, BadgeCheckResult[]>();

    for (const player of players) {
      try {
        const results = await this.checkBadgesForPlayer(player.id);
        
        // 付与すべきバッジがある場合は付与
        for (const result of results) {
          if (result.shouldAward) {
            await this.awardBadge(player.id, result.badgeId);
          }
        }
        
        if (results.length > 0) {
          resultMap.set(player.id, results);
        }
      } catch (error) {
        console.error(`Error recalculating badges for player ${player.id}:`, error);
      }
    }

    return resultMap;
  }
}