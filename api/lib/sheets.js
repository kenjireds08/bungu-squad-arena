const { google } = require('googleapis');

class SheetsService {
  constructor() {
    this.auth = null;
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }

  async authenticate() {
    if (this.auth) return this.auth;

    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      return this.auth;
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Failed to authenticate with Google Sheets API');
    }
  }

  async getPlayers() {
    await this.authenticate();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:Z1000'
      });

      const rows = response.data.values || [];
      return rows.map((row, index) => ({
        id: row[0] || `player_${index + 1}`,
        nickname: row[1] || '',
        email: row[2] || '',
        current_rating: parseInt(row[3]) || 1500,
        annual_wins: parseInt(row[4]) || 0,
        annual_losses: parseInt(row[5]) || 0,
        total_wins: parseInt(row[6]) || 0,
        total_losses: parseInt(row[7]) || 0,
        champion_badges: row[8] || '',
        trump_rule_experienced: row[9] === 'true',
        first_trump_game_date: row[10] || '',
        cardplus_rule_experienced: row[11] === 'true',
        first_cardplus_game_date: row[12] || '',
        registration_date: row[13] || '',
        profile_image_url: row[14] || '',
        is_active: row[15] === 'true',
        last_activity_date: row[16] || '',
        player_status: row[17] || 'active',
        notification_preferences: row[18] || '{}',
        device_tokens: row[19] || '[]',
        last_login_date: row[20] || '',
        profile_image_uploaded: row[21] === 'true',
        preferred_language: row[22] || 'ja'
      }));
    } catch (error) {
      console.error('Error fetching players:', error);
      throw new Error('Failed to fetch players data');
    }
  }

  async getRankings() {
    const players = await this.getPlayers();
    return players
      .sort((a, b) => b.current_rating - a.current_rating)
      .map((player, index) => ({
        ...player,
        rank: index + 1
      }));
  }

  async getPlayer(id) {
    const players = await this.getPlayers();
    return players.find(player => player.id === id);
  }

  async updatePlayerRating(playerId, newRating) {
    await this.authenticate();
    
    try {
      const players = await this.getPlayers();
      const playerIndex = players.findIndex(p => p.id === playerId);
      
      if (playerIndex === -1) {
        throw new Error('Player not found');
      }

      const range = `Players!D${playerIndex + 2}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [[newRating]]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating player rating:', error);
      throw new Error('Failed to update player rating');
    }
  }
}

module.exports = SheetsService;