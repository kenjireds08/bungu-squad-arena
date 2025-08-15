import { google } from 'googleapis';
import type { Player, Tournament, TournamentMatch } from '@/types';

export class GoogleSheetsClient {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '{}'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheets = google.sheets({ version: 'v4', auth });
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID || '';
  }

  /**
   * プレイヤー一覧を取得
   */
  async getPlayers(): Promise<Player[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Players!A:AC',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const headers = rows[0];
    return rows.slice(1).map((row: any[]) => this.rowToPlayer(headers, row));
  }

  /**
   * プレイヤーIDでプレイヤーを取得
   */
  async getPlayerById(playerId: string): Promise<Player | null> {
    const players = await this.getPlayers();
    return players.find(p => p.id === playerId) || null;
  }

  /**
   * プレイヤーのバッジを更新
   */
  async updatePlayerBadges(playerId: string, badges: string[]): Promise<void> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Players!A:AC',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return;

    const headers = rows[0];
    const badgesColumnIndex = headers.indexOf('badges');
    
    if (badgesColumnIndex === -1) {
      throw new Error('badges column not found in Players sheet');
    }

    // プレイヤーの行を見つける
    let playerRowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === playerId) {
        playerRowIndex = i;
        break;
      }
    }

    if (playerRowIndex === -1) {
      throw new Error(`Player ${playerId} not found`);
    }

    // バッジをカンマ区切りの文字列として保存
    const badgesString = badges.join(',');
    
    // セルを更新（A列から数えてbadgesColumnIndex番目）
    const cellAddress = `${String.fromCharCode(65 + badgesColumnIndex)}${playerRowIndex + 1}`;
    
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `Players!${cellAddress}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[badgesString]],
      },
    });
  }

  /**
   * 大会の試合データを取得
   */
  async getTournamentMatches(): Promise<TournamentMatch[]> {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'TournamentMatches!A:S',
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    const headers = rows[0];
    return rows.slice(1).map((row: any[]) => this.rowToTournamentMatch(headers, row));
  }

  /**
   * 試合IDで試合を取得
   */
  async getTournamentMatchById(matchId: string): Promise<TournamentMatch | null> {
    const matches = await this.getTournamentMatches();
    return matches.find(m => m.match_id === matchId) || null;
  }

  /**
   * 行データをPlayerオブジェクトに変換
   */
  private rowToPlayer(headers: string[], row: any[]): Player {
    const player: any = {};
    headers.forEach((header, index) => {
      if (header === 'badges' && row[index]) {
        // バッジはカンマ区切りの文字列から配列に変換
        player[header] = row[index].split(',').filter(Boolean);
      } else {
        player[header] = row[index] || '';
      }
    });
    return player as Player;
  }

  /**
   * 行データをTournamentMatchオブジェクトに変換
   */
  private rowToTournamentMatch(headers: string[], row: any[]): TournamentMatch {
    const match: any = {};
    headers.forEach((header, index) => {
      match[header] = row[index] || '';
    });
    return match as TournamentMatch;
  }
}