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
        last_login: row[20] || '',
        profile_image_uploaded: row[21] === 'true',
        preferred_language: row[22] || 'ja',
        tournament_active: row[23] === 'TRUE'
      }));
    } catch (error) {
      console.error('Error fetching players:', error);
      console.error('Environment check:', {
        hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
        hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
        sheetId: process.env.GOOGLE_SHEETS_ID,
        serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length
      });
      throw new Error(`Failed to fetch players data: ${error.message}`);
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

  async updatePlayerEmail(playerId, email) {
    await this.authenticate();
    
    try {
      // First, find the player's row
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:A1000'
      });

      const playerIds = playersResponse.data.values || [];
      const rowIndex = playerIds.findIndex(row => row[0] === playerId);
      
      if (rowIndex === -1) {
        throw new Error('Player not found');
      }

      // Update the email (column C = index 2)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!C${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[email]]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating player email:', error);
      throw new Error('Failed to update player email');
    }
  }

  async updateLastLogin(playerId) {
    await this.authenticate();
    
    try {
      // First, find the player's row
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:A1000'
      });

      const playerIds = playersResponse.data.values || [];
      const rowIndex = playerIds.findIndex(row => row[0] === playerId);
      
      if (rowIndex === -1) {
        throw new Error('Player not found');
      }

      const now = new Date().toISOString();
      
      // Update last_login (column K = index 10)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!K${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[now]]
        }
      });

      return { success: true, timestamp: now };
    } catch (error) {
      console.error('Error updating last login:', error);
      throw new Error('Failed to update last login');
    }
  }

  async updateTournamentActive(playerId, isActive) {
    await this.authenticate();
    
    try {
      // First, find the player's row
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:A1000'
      });

      const playerIds = playersResponse.data.values || [];
      const rowIndex = playerIds.findIndex(row => row[0] === playerId);
      
      if (rowIndex === -1) {
        throw new Error('Player not found');
      }
      
      // Update tournament_active (column X = index 23)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!X${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[isActive ? 'TRUE' : 'FALSE']]
        }
      });

      return { success: true, playerId, isActive };
    } catch (error) {
      console.error('Error updating tournament active:', error);
      throw new Error('Failed to update tournament active status');
    }
  }

  async resetAllTournamentActive() {
    await this.authenticate();
    
    try {
      // Get all players to know how many rows to update
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:A1000'
      });

      const playerRows = playersResponse.data.values || [];
      const rowCount = playerRows.length;
      
      if (rowCount === 0) {
        return { success: true, updatedCount: 0 };
      }

      // Create array of FALSE values for all players
      const falseValues = Array(rowCount).fill(['FALSE']);
      
      // Update all tournament_active values to FALSE (column X)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!X2:X${rowCount + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: falseValues
        }
      });

      console.log(`Reset tournament_active for ${rowCount} players`);
      return { success: true, updatedCount: rowCount };
    } catch (error) {
      console.error('Error resetting tournament active:', error);
      throw new Error('Failed to reset tournament active status');
    }
  }

  async getTournaments() {
    await this.authenticate();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A2:L1000'
      });

      const rows = response.data.values || [];
      return rows.map((row, index) => ({
        id: row[0] || `tournament_${index + 1}`,
        tournament_name: row[1] || '',
        date: row[2] || '',
        start_time: row[3] || '',
        location: row[4] || '',
        qr_code_url: row[5] || '',
        created_by: row[6] || '',
        created_at: row[7] || '',
        status: row[8] || 'upcoming',
        max_participants: parseInt(row[9]) || 20,
        current_participants: parseInt(row[10]) || 0,
        tournament_type: row[11] || 'random'
      }));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      throw new Error(`Failed to fetch tournaments data: ${error.message}`);
    }
  }

  async addMatchResult(matchData) {
    await this.authenticate();
    
    try {
      const timestamp = new Date().toISOString();
      const matchId = `match_${Date.now()}`;
      
      const values = [[
        matchId,
        matchData.tournament_id || '',
        matchData.player1_id,
        matchData.player2_id,
        matchData.winner_id || '',
        matchData.loser_id || '',
        matchData.game_rule || 'trump',
        timestamp,
        matchData.match_end_time || '',
        'completed',
        matchData.reported_by || '',
        timestamp,
        matchData.approved_by || '',
        matchData.approved_at || '',
        matchData.player1_rating_before || 0,
        matchData.player2_rating_before || 0,
        matchData.player1_rating_after || 0,
        matchData.player2_rating_after || 0,
        matchData.player1_rating_change || 0,
        matchData.player2_rating_change || 0,
        false, // is_proxy_input
        '', // proxy_reason
        '', // proxy_reason_detail
        '', // proxy_input_by
        true, // notification_sent
        matchData.is_first_time_rule || false,
        matchData.table_number || '',
        timestamp, // notification_sent_at
        0, // reminder_sent_count
        '', // last_reminder_sent_at
        'elo', // rating_calculation_method
        matchData.notes || '',
        matchData.weather_condition || '',
        'web' // device_used
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:AH',
        valueInputOption: 'RAW',
        resource: { values }
      });

      if (matchData.player1_rating_after) {
        await this.updatePlayerRating(matchData.player1_id, matchData.player1_rating_after);
      }
      if (matchData.player2_rating_after) {
        await this.updatePlayerRating(matchData.player2_id, matchData.player2_rating_after);
      }

      return { success: true, matchId };
    } catch (error) {
      console.error('Error adding match result:', error);
      throw new Error('Failed to add match result');
    }
  }

  async getMatchHistory(playerId = null) {
    await this.authenticate();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A2:AH1000'
      });

      const rows = response.data.values || [];
      let matches = rows.map(row => ({
        id: row[0],
        tournament_id: row[1],
        player1_id: row[2],
        player2_id: row[3],
        winner_id: row[4],
        loser_id: row[5],
        game_rule: row[6],
        match_start_time: row[7],
        match_end_time: row[8],
        match_status: row[9],
        reported_by: row[10],
        reported_at: row[11],
        approved_by: row[12],
        approved_at: row[13],
        player1_rating_before: parseInt(row[14]) || 0,
        player2_rating_before: parseInt(row[15]) || 0,
        player1_rating_after: parseInt(row[16]) || 0,
        player2_rating_after: parseInt(row[17]) || 0,
        player1_rating_change: parseInt(row[18]) || 0,
        player2_rating_change: parseInt(row[19]) || 0,
        is_proxy_input: row[20] === 'true',
        table_number: row[26],
        notes: row[31],
        weather_condition: row[32]
      }));

      if (playerId) {
        matches = matches.filter(match => 
          match.player1_id === playerId || match.player2_id === playerId
        );
      }

      return matches.sort((a, b) => new Date(b.match_start_time) - new Date(a.match_start_time));
    } catch (error) {
      console.error('Error fetching match history:', error);
      throw new Error('Failed to fetch match history');
    }
  }

  calculateEloRating(player1Rating, player2Rating, result, player1Matches = 0) {
    const K = player1Matches < 10 ? 40 : player1Matches < 30 ? 20 : 10;
    
    const expectedScore = 1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));
    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    
    const ratingChange = Math.round(K * (actualScore - expectedScore));
    
    return {
      player1NewRating: player1Rating + ratingChange,
      player2NewRating: player2Rating - ratingChange,
      player1: ratingChange,
      player2: -ratingChange
    };
  }
}

module.exports = SheetsService;