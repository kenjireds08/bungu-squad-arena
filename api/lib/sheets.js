const { google } = require('googleapis');

// Global memory cache for same instance
const cache = globalThis.__cache ?? (globalThis.__cache = new Map());

async function cached(key, ttl, loader) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.t < ttl) return hit.v;
  const p = loader().catch(e => { cache.delete(key); throw e; });
  cache.set(key, { t: now, v: p });
  return p;
}

class SheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  }

  // ヘッダー取得＆indexマップ
  async _getHeaders(range) {
    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range
    });
    const headers = res.data.values?.[0] || [];
    const idx = (name) => headers.indexOf(name); // 見つからなければ -1
    return { headers, idx };
  }

  // Helper function to find column index with multiple candidate names
  _pickIdx(idx, ...candidates) {
    for (const candidate of candidates) {
      const i = idx(candidate);
      if (i >= 0) return i;
    }
    return -1;
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

  /**
   * Create TournamentMatches sheet if it doesn't exist
   */
  async createTournamentMatchesSheet() {
    try {
      // Check if sheet exists
      const sheetResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheetExists = sheetResponse.data.sheets.some(sheet => 
        sheet.properties.title === 'TournamentMatches'
      );
      
      if (sheetExists) return;
      
      // Create the sheet with headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'TournamentMatches',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 20
                }
              }
            }
          }]
        }
      });
      
      // Add headers
      const headers = [
        'match_id', 'tournament_id', 'round', 'player1_id', 'player1_name', 
        'player2_id', 'player2_name', 'game_type', 'status', 'winner_id', 
        'result_details', 'created_at', 'completed_at', 'approved_at'
      ];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A1:N1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
      
      console.log('TournamentMatches sheet created with headers');
    } catch (error) {
      console.warn('Error creating TournamentMatches sheet:', error);
      // Don't throw - sheet might already exist
    }
  }

  /**
   * Create MatchResults sheet if it doesn't exist
   */
  async createMatchResultsSheet() {
    try {
      // Check if sheet exists
      const sheetResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheetExists = sheetResponse.data.sheets.some(sheet => 
        sheet.properties.title === 'MatchResults'
      );
      
      if (sheetExists) return;
      
      // Create the sheet with headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'MatchResults',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            }
          }]
        }
      });
      
      // Add headers
      const headers = [
        'result_id', 'match_id', 'player_id', 'opponent_id', 'result', 
        'status', 'timestamp', 'approved_by', 'approved_at'
      ];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A1:I1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
      
      console.log('MatchResults sheet created with headers');
    } catch (error) {
      console.warn('Error creating MatchResults sheet:', error);
      // Don't throw - sheet might already exist
    }
  }

  /**
   * Create TournamentDailyArchive sheet if it doesn't exist
   */
  async createTournamentDailyArchiveSheet() {
    try {
      // Check if sheet exists
      const sheetResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheetExists = sheetResponse.data.sheets.some(sheet => 
        sheet.properties.title === 'TournamentDailyArchive'
      );
      
      if (sheetExists) return;
      
      // Create the sheet with headers
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'TournamentDailyArchive',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 10
                }
              }
            }
          }]
        }
      });
      
      // Add headers
      const headers = [
        'archive_id', 'tournament_date', 'player_id', 'player_nickname', 
        'entry_timestamp', 'total_participants_that_day', 'created_at'
      ];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentDailyArchive!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] }
      });
      
      console.log('TournamentDailyArchive sheet created with headers');
    } catch (error) {
      console.warn('Error creating TournamentDailyArchive sheet:', error);
      // Don't throw - sheet might already exist
    }
  }

  async autoResetOldTournamentParticipation() {
    try {
      console.log('=== AUTO RESET CHECK START ===');
      
      // Use Japan timezone to ensure consistency
      const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD format
      console.log(`Today (Japan time): ${today}`);
      
      // Check if we have any active players first
      let activePlayers = [];
      try {
        activePlayers = await this.getActiveTournamentPlayers();
        console.log(`Found ${activePlayers.length} active tournament players`);
        
        if (activePlayers.length === 0) {
          console.log('No active tournament players, skipping reset');
          return;
        }
      } catch (activePlayersError) {
        console.warn('Failed to get active players, skipping reset:', activePlayersError.message);
        return;
      }
      
      // Get current tournament data to check dates
      const tournamentsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A2:Z1000'
      });
      
      const tournamentRows = tournamentsResponse.data.values || [];
      console.log(`Found ${tournamentRows.length} tournament records`);
      
      // Find the most recent tournament
      const lastTournament = tournamentRows
        .filter(row => row[2]) // Has date
        .sort((a, b) => new Date(b[2]).getTime() - new Date(a[2]).getTime())[0]; // Most recent
      
      if (lastTournament) {
        const lastTournamentDate = lastTournament[2];
        console.log(`Last tournament date: ${lastTournamentDate}`);
        
        // Compare dates
        if (lastTournamentDate !== today) {
          console.log(`Last tournament (${lastTournamentDate}) was not today (${today}). Resetting all tournament_active flags`);
          await this.resetAllTournamentActive();
          console.log('✓ Auto-reset completed successfully');
        } else {
          console.log('Last tournament was today, keeping players active');
        }
      } else {
        // No tournaments found but players are active - reset them
        console.log('No tournament records found but players are active, resetting all tournament_active flags');
        await this.resetAllTournamentActive();
        console.log('✓ Auto-reset completed successfully');
      }
      
      console.log('=== AUTO RESET CHECK END ===');
    } catch (error) {
      console.error('=== AUTO RESET ERROR ===');
      console.error('Failed to auto-reset old tournament participation:', error.message);
      console.error('Error stack:', error.stack);
      // Don't throw error, just log warning to prevent breaking getPlayers
    }
  }

  async getPlayers() {
    return cached('players', 15000, async () => {
      await this.authenticate();
      
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Players!A2:Z1000'
        });

        const rows = response.data.values || [];
        
        // Auto-reset tournament participation flags for new day (fire-and-forget to avoid deadlock)
        this.autoResetOldTournamentParticipation()
          .then(() => console.log('Auto-reset check completed'))
          .catch(resetError => console.warn('Auto-reset failed:', resetError.message));
        
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
          trump_rule_experienced: row[9] === 'TRUE',  // J列 (index 9)
          first_trump_game_date: row[10] || '',       // K列 (index 10)  
          cardplus_rule_experienced: row[11] === 'TRUE', // L列 (index 11)
          first_cardplus_game_date: row[12] || '',    // M列 (index 12)
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
          tournament_active: row[23] === 'TRUE',
          email_verified: row[24] === 'TRUE' // Y column
        }));
      } catch (error) {
        console.error('Error fetching players:', error);
        
        // Handle specific Google Sheets API errors
        if (error.code === 404) {
          throw new Error('Players sheet not found. Please check if the sheet exists.');
        } else if (error.code === 403) {
          throw new Error('Permission denied. Please check Google Sheets API credentials.');
        } else if (error.code === 429) {
          console.warn('Rate limit hit in getPlayers, implementing backoff');
          const rateLimitError = new Error('API rate limit exceeded. Please try again later.');
          rateLimitError.code = 429;
          throw rateLimitError;
        } else {
          console.error('Environment check:', {
            hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
            hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
            sheetId: process.env.GOOGLE_SHEETS_ID,
            serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length
          });
          throw new Error(`Failed to fetch players data: ${error.message}`);
        }
      }
    });
  }

  async getRankings() {
    return cached('rankings', 15000, async () => {
      try {
        const players = await this.getPlayers();
      const sortedPlayers = players.sort((a, b) => b.current_rating - a.current_rating);
      
      // Calculate ranks with ties
      let currentRank = 1;
      return sortedPlayers.map((player, index) => {
        // If this player has the same rating as the previous player, keep the same rank
        if (index > 0 && sortedPlayers[index - 1].current_rating === player.current_rating) {
          // Same rank as previous player
        } else {
          // New rank = current position + 1
          currentRank = index + 1;
        }
        
        // Check if there are multiple players with the same rating
        const sameRatingCount = sortedPlayers.filter(p => p.current_rating === player.current_rating).length;
        const isTied = sameRatingCount > 1;
        
        // Generate badges string from experience flags
        let badges = player.champion_badges || '';
        
        // Add game rule badges only if not already present
        if (player.trump_rule_experienced && !badges.includes('♠️')) {
          badges += badges ? ', ♠️' : '♠️';
        }
        if (player.cardplus_rule_experienced && !badges.includes('➕')) {
          badges += badges ? ', ➕' : '➕';
        }
        
        return {
          ...player,
          rank: currentRank,
          rankDisplay: isTied ? `${currentRank}位タイ` : `${currentRank}位`,
          champion_badges: badges
        };
      });
    } catch (error) {
      console.error('Error getting rankings:', error);
      // Re-throw the error from getPlayers with proper context
      throw new Error(`Failed to get rankings: ${error.message}`);
    }
    });
  }

  async getPlayer(id) {
    try {
      const players = await this.getPlayers();
      return players.find(player => player.id === id);
    } catch (error) {
      console.error('Error getting player:', error);
      throw new Error(`Failed to get player: ${error.message}`);
    }
  }

  async getPlayerByEmail(email) {
    try {
      const players = await this.getPlayers();
      return players.find(player => player.email === email);
    } catch (error) {
      console.error('Error getting player by email:', error);
      return null; // Return null if not found instead of throwing
    }
  }

  async addPlayer(playerData) {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('Players!1:1');
      
      // Get current sheet data to append to
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const rows = response.data.values || [];
      
      // Create new row with player data
      const newRow = [];
      
      // Map all the player fields to their respective columns
      // FIXED: Use 'player_id' instead of 'id' to match spreadsheet header
      console.log('DEBUG: Headers mapping:', headers);
      console.log('DEBUG: tournament_active column index:', idx('tournament_active'));
      console.log('DEBUG: last_login column index:', idx('last_login'));
      console.log('DEBUG: playerData.tournament_active:', playerData.tournament_active);
      
      newRow[idx('player_id')] = playerData.id || `player_${Date.now()}`;
      newRow[idx('nickname')] = playerData.nickname || '';
      newRow[idx('email')] = playerData.email || '';
      newRow[idx('current_rating')] = playerData.current_rating || 1500;
      newRow[idx('annual_wins')] = playerData.annual_wins || 0;
      newRow[idx('annual_losses')] = playerData.annual_losses || 0;
      newRow[idx('total_wins')] = playerData.total_wins || 0;
      newRow[idx('total_losses')] = playerData.total_losses || 0;
      newRow[idx('champion_badges')] = playerData.champion_badges || '';
      newRow[idx('trump_rule_experienced')] = playerData.trump_rule_experienced ? 'TRUE' : 'FALSE';
      newRow[idx('first_trump_game_date')] = playerData.first_trump_game_date || '';
      newRow[idx('cardplus_rule_experienced')] = playerData.cardplus_rule_experienced ? 'TRUE' : 'FALSE';
      newRow[idx('first_cardplus_game_date')] = playerData.first_cardplus_game_date || '';
      newRow[idx('registration_date')] = playerData.registration_date || new Date().toISOString().split('T')[0];
      newRow[idx('profile_image_url')] = playerData.profile_image_url || '';
      newRow[idx('is_active')] = playerData.is_active !== false ? 'true' : 'false';
      newRow[idx('last_activity_date')] = playerData.last_activity_date || new Date().toISOString().split('T')[0];
      newRow[idx('player_status')] = playerData.player_status || 'active';
      newRow[idx('notification_preferences')] = playerData.notification_preferences || '{}';
      newRow[idx('device_tokens')] = playerData.device_tokens || '[]';
      newRow[idx('last_login')] = playerData.last_login || new Date().toISOString();
      newRow[idx('profile_image_uploaded')] = playerData.profile_image_uploaded ? 'true' : 'false';
      newRow[idx('preferred_language')] = playerData.preferred_language || 'ja';
      newRow[idx('tournament_active')] = playerData.tournament_active ? 'TRUE' : 'FALSE';
      newRow[idx('email_verified')] = playerData.email_verified ? 'TRUE' : 'FALSE';
      
      console.log('DEBUG: Final newRow array:', newRow);
      console.log('DEBUG: tournament_active value at index', idx('tournament_active'), ':', newRow[idx('tournament_active')]);
      
      // Add new row to the sheet
      rows.push(newRow);
      
      // Update the sheet with new data
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
      
      return playerData.id || `player_${Date.now()}`;
    } catch (error) {
      console.error('Error adding player:', error);
      throw new Error(`Failed to add player: ${error.message}`);
    }
  }

  async updatePlayer(playerId, updates) {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('Players!1:1');
      
      // Get all player data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const rows = response.data.values || [];
      let playerRowIndex = -1;
      
      // Find player row - support both 'id' and 'player_id'
      const idColumnIndex = this._pickIdx(idx, 'id', 'player_id');
      if (idColumnIndex === -1) {
        throw new Error('Neither id nor player_id column found in Players sheet');
      }
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColumnIndex] === playerId) {
          playerRowIndex = i;
          break;
        }
      }
      
      if (playerRowIndex === -1) {
        throw new Error('Player not found');
      }
      
      // Apply updates
      Object.keys(updates).forEach(key => {
        const colIdx = idx(key);
        if (colIdx >= 0 && rows[playerRowIndex]) {
          rows[playerRowIndex][colIdx] = updates[key];
        }
      });
      
      // Write back the entire sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating player:', error);
      throw new Error(`Failed to update player: ${error.message}`);
    }
  }

  async updatePlayerRating(playerId, newRating) {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('Players!1:1');
      
      // Get player data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const rows = response.data.values || [];
      let playerRow = -1;
      
      // Find player row - support both 'id' and 'player_id'
      const idColumnIndex = this._pickIdx(idx, 'id', 'player_id');
      if (idColumnIndex === -1) {
        throw new Error('Neither id nor player_id column found in Players sheet');
      }
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColumnIndex] === playerId) {
          playerRow = i;
          break;
        }
      }
      
      if (playerRow === -1) {
        throw new Error('Player not found');
      }

      // Find current_rating column
      const ratingColumnIndex = idx('current_rating');
      if (ratingColumnIndex === -1) {
        throw new Error('current_rating column not found in Players sheet');
      }

      const range = `Players!${String.fromCharCode(65 + ratingColumnIndex)}${playerRow + 1}`;
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

  async updatePlayerNickname(playerId, nickname) {
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

      // Update the nickname (column B = index 1)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!B${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[nickname]]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating player nickname:', error);
      throw new Error('Failed to update player nickname');
    }
  }

  async updatePlayerProfileImage(playerId, profileImageUrl) {
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

      // Update the profile image URL (column O = index 14, as per spreadsheet documentation)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!O${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[profileImageUrl]]
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating player profile image:', {
        playerId,
        imageSize: profileImageUrl?.length,
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to update player profile image: ${error.message}`);
    }
  }

  async updateLastLogin(playerId) {
    await this.authenticate();
    
    try {
      console.log('Updating last login for player:', playerId);
      
      // First, find the player's row
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:A1000'
      });

      const playerIds = playersResponse.data.values || [];
      const rowIndex = playerIds.findIndex(row => row[0] === playerId);
      
      if (rowIndex === -1) {
        console.error('Player not found with ID:', playerId);
        throw new Error('Player not found');
      }

      const now = new Date().toISOString();
      console.log('Updating last login to:', now, 'for row:', rowIndex + 2);
      
      // Update last_login (column U = index 20)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!U${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[now]]
        }
      });

      console.log('Last login updated successfully for player:', playerId);
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
      // First, get current active players for archiving
      const activePlayers = await this.getActiveTournamentPlayers();
      
      // Archive today's tournament data if there are active players
      if (activePlayers.length > 0) {
        await this.archiveTournamentDay(activePlayers);
      }
      
      // Get all players to know how many rows to update
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:A1000'
      });

      const playerRows = playersResponse.data.values || [];
      const rowCount = playerRows.length;
      
      if (rowCount === 0) {
        return { success: true, updatedCount: 0, archivedCount: 0 };
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

      console.log(`Reset tournament_active for ${rowCount} players, archived ${activePlayers.length} active players`);
      return { 
        success: true, 
        updatedCount: rowCount, 
        archivedCount: activePlayers.length 
      };
    } catch (error) {
      console.error('Error resetting tournament active:', error);
      throw new Error('Failed to reset tournament active status');
    }
  }

  async getActiveTournamentPlayers() {
    await this.authenticate();
    
    try {
      const players = await this.getPlayers();
      return players.filter(player => player.tournament_active);
    } catch (error) {
      console.error('Error getting active tournament players:', error);
      throw new Error('Failed to get active tournament players');
    }
  }

  async archiveTournamentDay(activePlayers) {
    await this.authenticate();
    
    try {
      const today = new Date().toLocaleDateString('sv-SE'); // Use local date YYYY-MM-DD
      const timestamp = new Date().toISOString();
      const totalParticipants = activePlayers.length;
      
      // Ensure TournamentDailyArchive sheet exists
      await this.createTournamentDailyArchiveSheet();
      
      // Create archive entries for each active player
      const archiveEntries = activePlayers.map(player => [
        `archive_${Date.now()}_${player.id}`, // archive_id
        today, // tournament_date
        player.id, // player_id
        player.nickname, // player_nickname
        timestamp, // entry_timestamp (using current time as approximation)
        totalParticipants, // total_participants_that_day
        timestamp // created_at
      ]);

      if (archiveEntries.length > 0) {
        // Append to TournamentDailyArchive sheet
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentDailyArchive!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: archiveEntries
          }
        });
      }

      console.log(`Archived ${activePlayers.length} players for ${today}`);
      return { success: true, archivedCount: activePlayers.length, date: today };
    } catch (error) {
      console.error('Error archiving tournament day:', error);
      // Don't throw here - we still want the reset to continue even if archiving fails
      console.warn('Archiving failed, but continuing with reset...');
      return { success: false, error: error.message };
    }
  }

  async getTournamentDailyArchive(dateFrom = null, dateTo = null) {
    await this.authenticate();
    
    try {
      // Ensure the sheet exists before trying to read from it
      await this.createTournamentDailyArchiveSheet();
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentDailyArchive!A2:G1000'
      });

      const rows = response.data.values || [];
      let archive = rows.map(row => ({
        archive_id: row[0] || '',
        tournament_date: row[1] || '',
        player_id: row[2] || '',
        player_nickname: row[3] || '',
        entry_timestamp: row[4] || '',
        total_participants_that_day: parseInt(row[5]) || 0,
        created_at: row[6] || ''
      }));

      // Filter by date range if provided
      if (dateFrom || dateTo) {
        archive = archive.filter(entry => {
          const entryDate = entry.tournament_date;
          if (dateFrom && entryDate < dateFrom) return false;
          if (dateTo && entryDate > dateTo) return false;
          return true;
        });
      }

      return archive.sort((a, b) => new Date(b.tournament_date) - new Date(a.tournament_date));
    } catch (error) {
      console.error('Error fetching tournament daily archive:', error);
      throw new Error(`Failed to fetch tournament daily archive: ${error.message}`);
    }
  }

  async ensureTournamentSheetStructure() {
    await this.authenticate();
    
    try {
      // First, get sheet metadata to check current column count
      const sheetResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const tournamentSheet = sheetResponse.data.sheets.find(sheet => 
        sheet.properties.title === 'Tournaments'
      );
      
      if (!tournamentSheet) {
        throw new Error('Tournaments sheet not found');
      }
      
      const currentColumns = tournamentSheet.properties.gridProperties.columnCount;
      console.log(`Current Tournaments sheet has ${currentColumns} columns`);
      
      // If we don't have at least 13 columns (A-M), expand the sheet
      if (currentColumns < 13) {
        console.log('Expanding Tournaments sheet to include description column...');
        
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              updateSheetProperties: {
                properties: {
                  sheetId: tournamentSheet.properties.sheetId,
                  gridProperties: {
                    columnCount: 13
                  }
                },
                fields: 'gridProperties.columnCount'
              }
            }]
          }
        });
        
        // Now add the header
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Tournaments!M1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['description']]
          }
        });
        
        console.log('Description column added successfully');
      } else {
        // Check if header exists
        const headerResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Tournaments!M1'
        });
        
        if (!headerResponse.data.values || !headerResponse.data.values[0] || !headerResponse.data.values[0][0]) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Tournaments!M1',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['description']]
            }
          });
          console.log('Description header added');
        }
      }
    } catch (error) {
      console.error('Error ensuring tournament sheet structure:', error);
      // Don't throw error here, continue with the operation
    }
  }

  async getTournaments() {
    return cached('tournaments', 15000, async () => {
      await this.authenticate();
    
    try {
      // Skip structure check for read operations to avoid 500 errors
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A2:M1000'
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
        tournament_type: row[11] || 'random',
        description: row[12] || ''
      }));
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      // Handle specific Google Sheets API errors
      if (error.code === 404) {
        throw new Error('Tournaments sheet not found. Please check if the sheet exists.');
      } else if (error.code === 403) {
        throw new Error('Permission denied. Please check Google Sheets API credentials.');
      } else if (error.code === 429) {
        // Rate limit - wait and retry once
        console.warn('Rate limit hit in getTournaments, implementing backoff');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const rateLimitError = new Error('API rate limit exceeded. Please try again later.');
        rateLimitError.code = 429;
        throw rateLimitError;
      } else {
        throw new Error(`Failed to fetch tournaments data: ${error.message}`);
      }
    }
    });
  }

  async createTournament(tournamentData) {
    await this.authenticate();
    
    try {
      // Ensure the sheet has the correct structure
      await this.ensureTournamentSheetStructure();
      const timestamp = new Date().toISOString();
      const tournamentId = `tournament_${Date.now()}`;
      const qrCodeUrl = `${process.env.FRONTEND_URL || 'https://bungu-squad-arena.vercel.app'}/qr/${tournamentId}`;
      
      const values = [[
        tournamentId,                           // A: id
        tournamentData.tournament_name,         // B: tournament_name
        tournamentData.date,                    // C: date
        tournamentData.start_time,              // D: start_time
        tournamentData.location,                // E: location
        qrCodeUrl,                              // F: qr_code_url
        'admin',                                // G: created_by
        timestamp,                              // H: created_at
        tournamentData.status || 'upcoming',    // I: status
        tournamentData.max_participants || 20,  // J: max_participants
        0,                                      // K: current_participants
        tournamentData.tournament_type || 'random', // L: tournament_type
        tournamentData.description || ''        // M: description
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A:M',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });

      console.log(`Tournament created: ${tournamentId}`);
      return { success: true, tournamentId };
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw new Error(`Failed to create tournament: ${error.message}`);
    }
  }

  async updateTournament(tournamentId, updateData) {
    await this.authenticate();
    
    try {
      // Ensure the sheet has the correct structure
      await this.ensureTournamentSheetStructure();
      // First, find the tournament's row
      const tournamentsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A2:A1000'
      });

      const tournamentIds = tournamentsResponse.data.values || [];
      const rowIndex = tournamentIds.findIndex(row => row[0] === tournamentId);
      
      if (rowIndex === -1) {
        throw new Error('Tournament not found');
      }

      // Update individual fields based on what's provided
      const updatePromises = [];
      const actualRowNumber = rowIndex + 2; // +2 because array is 0-indexed and we skip header

      if (updateData.tournament_name !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!B${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.tournament_name]] }
          })
        );
      }

      if (updateData.date !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!C${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.date]] }
          })
        );
      }

      if (updateData.start_time !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!D${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.start_time]] }
          })
        );
      }

      if (updateData.location !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!E${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.location]] }
          })
        );
      }

      if (updateData.status !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!I${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.status]] }
          })
        );
      }

      if (updateData.current_participants !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!K${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.current_participants]] }
          })
        );
      }

      if (updateData.description !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `Tournaments!M${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.description]] }
          })
        );
      }

      await Promise.all(updatePromises);

      console.log(`Tournament updated: ${tournamentId}`);
      return { success: true };
    } catch (error) {
      console.error('Error updating tournament:', error);
      throw new Error(`Failed to update tournament: ${error.message}`);
    }
  }

  async deleteTournament(tournamentId) {
    await this.authenticate();
    
    try {
      // Ensure the sheet has the correct structure
      await this.ensureTournamentSheetStructure();
      
      // Get sheet metadata to find the correct sheet ID
      const sheetResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const tournamentSheet = sheetResponse.data.sheets.find(sheet => 
        sheet.properties.title === 'Tournaments'
      );
      
      if (!tournamentSheet) {
        throw new Error('Tournaments sheet not found');
      }
      
      const sheetId = tournamentSheet.properties.sheetId;
      
      // Get current tournament data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A:M'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) {
        throw new Error('Tournament not found');
      }

      const tournamentRowIndex = rows.findIndex((row, index) => 
        index > 0 && row[0] === tournamentId
      );

      if (tournamentRowIndex === -1) {
        throw new Error('Tournament not found');
      }

      // Delete the row
      const actualRowNumber = tournamentRowIndex + 1; // +1 because findIndex includes the header
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: actualRowNumber - 1, // 0-indexed for batch update
                endIndex: actualRowNumber
              }
            }
          }]
        }
      });

      console.log(`Tournament deleted: ${tournamentId}`);
      return { success: true, message: '大会を削除しました' };
    } catch (error) {
      console.error('Error deleting tournament:', error);
      // Return success:false instead of throwing to avoid 500 errors
      return { success: false, error: error.message };
    }
  }

  async deleteTournamentMatches(tournamentId) {
    await this.authenticate();
    
    try {
      // Get all data from TournamentMatches sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:X'
      });

      const rows = response.data.values || [];
      const newRows = [];
      let deletedCount = 0;

      // Keep header row and filter out matching tournament_id rows
      for (let i = 0; i < rows.length; i++) {
        if (i === 0) {
          // Keep header row
          newRows.push(rows[i]);
        } else if (rows[i][1] !== tournamentId) {
          // Keep rows that don't match the tournament ID
          newRows.push(rows[i]);
        } else {
          // This row will be deleted
          deletedCount++;
        }
      }

      // Clear the entire sheet and rewrite with filtered data
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:X'
      });

      if (newRows.length > 0) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentMatches!A1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: newRows
          }
        });
      }

      console.log(`Deleted ${deletedCount} existing matches for tournament ${tournamentId}`);
      return { success: true, deletedCount: deletedCount };
    } catch (error) {
      console.error('Error deleting tournament matches:', error);
      throw new Error(`Failed to delete tournament matches: ${error.message}`);
    }
  }

  async saveTournamentMatches(tournamentId, matches) {
    await this.authenticate();
    const { headers, idx } = await this._getHeaders('TournamentMatches!1:1');
    
    try {
      // Ensure tournament matches sheet exists
      await this.createTournamentMatchesSheet();
      
      // Try to delete existing matches for this tournament
      try {
        await this.deleteTournamentMatches(tournamentId);
        console.log(`Existing matches deleted for tournament ${tournamentId}`);
      } catch (deleteError) {
        console.warn(`Failed to delete existing matches for ${tournamentId}, continuing with append:`, deleteError.message);
      }
      
      const timestamp = new Date().toISOString();
      const values = matches.map((match, index) => {
        const row = new Array(headers.length).fill('');
        const set = (name, val) => { const i = idx(name); if (i >= 0) row[i] = val; };

        set('match_id', `${tournamentId}_${match.id}`);
        set('tournament_id', tournamentId);
        set('player1_id', match.player1.id);
        set('player2_id', match.player2.id);
        set('game_type', match.gameType);
        set('status', 'scheduled');
        set('match_status', 'scheduled');
        set('created_at', timestamp);
        // Set table_number as the match number for display purposes
        if (idx('table_number') >= 0) set('table_number', `match_${index + 1}`);
        if (idx('round') >= 0) set('round', 'player_00');

        return row;
      });

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });

      console.log(`Tournament matches saved for ${tournamentId}: ${matches.length} matches`);
      return { success: true, matchCount: matches.length };
    } catch (error) {
      console.error('Error saving tournament matches:', error);
      throw new Error(`Failed to save tournament matches: ${error.message}`);
    }
  }

  async getTournamentMatches(tournamentId) {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('TournamentMatches!1:1');

      const resp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:Z'
      });
      const rows = resp.data.values || [];
      if (rows.length <= 1) return [];

      // Players を取得して id->nickname のマップ化
      const players = await this.getPlayers();
      const nameMap = new Map(players.map(p => [p.id, p.nickname]));

      const out = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (tournamentId && r[idx('tournament_id')] !== tournamentId) continue;

        const p1 = r[idx('player1_id')] || '';
        const p2 = r[idx('player2_id')] || '';

        out.push({
          match_id:         r[idx('match_id')] || '',
          tournament_id:    r[idx('tournament_id')] || '',
          match_number:     r[idx('table_number')] || `match_${out.length + 1}`, // Use table_number for match display, fallback to tournament sequence
          player1_id:       p1,
          player1_name:     nameMap.get(p1) || '',
          player2_id:       p2,
          player2_name:     nameMap.get(p2) || '',
          game_type:        r[idx('game_type')] || '',   // ← 既定値に 'trump' は使わない
          status:           r[idx('status')] || r[idx('match_status')] || 'scheduled',
          winner_id:        r[idx('winner_id')] || '',
          created_at:       r[idx('created_at')] || '',
          match_start_time: r[idx('match_start_time')] || '',
          match_end_time:   r[idx('match_end_time')] || '',
          reported_at:      r[idx('reported_at')] || '',
          approved_by:      r[idx('approved_by')] || '',
          approved_at:      r[idx('approved_at')] || ''
        });
      }
      return out;
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
      
      // Handle specific Google Sheets API errors
      if (error.code === 404) {
        throw new Error('Match sheets not found. Please check if the sheets exist.');
      } else if (error.code === 403) {
        throw new Error('Permission denied. Please check Google Sheets API credentials.');
      } else if (error.code === 429) {
        console.warn('Rate limit hit in getTournamentMatches, implementing backoff');
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Failed to fetch tournament matches: ${error.message}`);
      }
    }
  }

  async getMatchHistory(playerId) {
    await this.authenticate();
    
    try {
      console.log('🔍 Fetching match history for player:', playerId);
      
      // Get both tournament matches and historical match results
      const [tournamentMatches, matchResults] = await Promise.all([
        this.getTournamentMatches(null), // Get all tournament matches
        this.getMatchResults() // Get historical match results
      ]);
      
      console.log('🔍 Total tournament matches:', tournamentMatches.length);
      console.log('🔍 Total match results:', matchResults.length);
      
      const playerHistory = [];
      
      // Add tournament matches where player participated
      for (const match of tournamentMatches) {
        if (match.player1_id === playerId || match.player2_id === playerId) {
          const isPlayer1 = match.player1_id === playerId;
          const opponent = isPlayer1 ? 
            { id: match.player2_id, name: match.player2_name } : 
            { id: match.player1_id, name: match.player1_name };
          
          let result = 'pending';
          let ratingChange = 0;
          
          if (match.status === 'completed' && match.winner_id) {
            if (match.winner_id === playerId) {
              result = 'win';
            } else if (match.winner_id === opponent.id) {
              result = 'lose';
            }
          }
          
          playerHistory.push({
            match_id: match.match_id,
            tournament_id: match.tournament_id,
            opponent: opponent,
            game_type: match.game_type || 'trump',
            result: result,
            rating_change: ratingChange, // TODO: Calculate from actual rating changes
            timestamp: match.match_end_time || match.created_at || '',
            match_type: 'tournament'
          });
        }
      }
      
      // Add historical matches from MatchResults sheet
      for (const result of matchResults) {
        if (result.player1_id === playerId || result.player2_id === playerId) {
          const isPlayer1 = result.player1_id === playerId;
          const opponent = isPlayer1 ? 
            { id: result.player2_id, name: result.player2_name || 'Unknown' } : 
            { id: result.player1_id, name: result.player1_name || 'Unknown' };
          
          let matchResult = 'unknown';
          let ratingChange = 0;
          
          if (result.result) {
            if (result.result === 'win' && isPlayer1) {
              matchResult = 'win';
              ratingChange = result.player1_rating_change || 0;
            } else if (result.result === 'win' && !isPlayer1) {
              matchResult = 'lose';
              ratingChange = result.player2_rating_change || 0;
            } else if (result.result === 'loss' && isPlayer1) {
              matchResult = 'lose';
              ratingChange = result.player1_rating_change || 0;
            } else if (result.result === 'loss' && !isPlayer1) {
              matchResult = 'win';
              ratingChange = result.player2_rating_change || 0;
            }
          }
          
          playerHistory.push({
            match_id: result.match_id || `result_${result.id}`,
            tournament_id: result.tournament_id || null,
            opponent: opponent,
            game_type: result.game_type || 'trump',
            result: matchResult,
            rating_change: ratingChange,
            timestamp: result.created_at || '',
            match_type: result.tournament_id ? 'tournament' : 'casual'
          });
        }
      }
      
      // Sort by timestamp (newest first)
      playerHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      console.log('🔍 Player history compiled:', {
        playerId: playerId,
        totalMatches: playerHistory.length,
        wins: playerHistory.filter(h => h.result === 'win').length,
        losses: playerHistory.filter(h => h.result === 'lose').length
      });
      
      return playerHistory;
      
    } catch (error) {
      console.error('❌ Error fetching match history:', error);
      
      // Handle specific errors
      if (error.code === 404) {
        return []; // Return empty array if sheets not found
      } else if (error.code === 403) {
        throw new Error('Permission denied accessing match history');
      } else if (error.code === 429) {
        throw new Error('API rate limit exceeded');
      } else {
        // Return empty array instead of throwing to prevent 500 errors
        console.warn('Returning empty match history due to error:', error.message);
        return [];
      }
    }
  }

  async getAllMatches() {
    // Fallback method for general match fetching
    try {
      return await this.getTournamentMatches(null);
    } catch (error) {
      console.error('Error in getAllMatches:', error);
      return [];
    }
  }

  async getMatchResults() {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('MatchResults!1:1');
      
      const resp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:Z'
      });
      const rows = resp.data.values || [];
      if (rows.length <= 1) return [];
      
      const results = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        results.push({
          id: r[idx('id')] || `result_${i}`,
          match_id: r[idx('match_id')] || '',
          tournament_id: r[idx('tournament_id')] || '',
          player1_id: r[idx('player1_id')] || '',
          player1_name: r[idx('player1_name')] || '',
          player2_id: r[idx('player2_id')] || '',
          player2_name: r[idx('player2_name')] || '',
          result: r[idx('result')] || '',
          game_type: r[idx('game_type')] || 'trump',
          player1_rating_change: parseInt(r[idx('player1_rating_change')] || '0'),
          player2_rating_change: parseInt(r[idx('player2_rating_change')] || '0'),
          created_at: r[idx('created_at')] || ''
        });
      }
      return results;
      
    } catch (error) {
      console.error('Error fetching match results:', error);
      return []; // Return empty array instead of throwing
    }
  }

  async addMatchResult(matchData) {
    await this.authenticate();
    
    try {
      const timestamp = new Date().toISOString();
      const matchId = `match_${Date.now()}`;
      
      const values = [[
        matchId,                          // A: match_id
        tournamentId,                     // B: tournament_id
        'player_00',                      // C: round (default)
        matchData.player1_id,             // D: player1_id
        matchData.player1_name,           // E: player1_name
        matchData.player2_id,             // F: player2_id
        matchData.player2_name,           // G: player2_name
        matchData.game_type,              // H: game_type
        'scheduled',                      // I: status
        '',                               // J: winner_id (empty until match completed)
        timestamp                         // K: created_at
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:X',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
      });

      console.log(`Single match added to tournament ${tournamentId}: ${matchId}`);
      return { 
        success: true, 
        matchId: matchId,
        matchNumber: nextMatchNumber 
      };
    } catch (error) {
      console.error('Error adding single tournament match:', error);
      throw new Error(`Failed to add tournament match: ${error.message}`);
    }
  }

  /**
   * Delete or deactivate a player
   */
  async deletePlayer(playerId) {
    await this.authenticate();
    try {
      // Check if player exists in any matches
      const matchResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:Z'
      });
      
      const matchRows = matchResponse.data.values || [];
      const { headers: matchHeaders, idx: matchIdx } = await this._getHeaders('TournamentMatches!1:1');
      
      // Check if player has participated in any matches
      for (let i = 1; i < matchRows.length; i++) {
        const player1Id = matchRows[i][matchIdx('player1_id')];
        const player2Id = matchRows[i][matchIdx('player2_id')];
        
        if (player1Id === playerId || player2Id === playerId) {
          // Player has match history - soft delete only
          const { headers: playerHeaders, idx: playerIdx } = await this._getHeaders('Players!1:1');
          const playersResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'Players!A:Z'
          });
          
          const playerRows = playersResponse.data.values || [];
          let playerRowIndex = -1;
          
          const idColumnIndex = this._pickIdx(playerIdx, 'id', 'player_id');
          if (idColumnIndex === -1) {
            throw new Error('Neither id nor player_id column found in Players sheet');
          }
          
          for (let j = 1; j < playerRows.length; j++) {
            if (playerRows[j][idColumnIndex] === playerId) {
              playerRowIndex = j;
              break;
            }
          }
          
          if (playerRowIndex === -1) {
            throw new Error('Player not found');
          }
          
          // Set is_active to false
          if (playerIdx('is_active') >= 0) {
            await this.sheets.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `Players!${String.fromCharCode(65 + playerIdx('is_active'))}${playerRowIndex + 1}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [['false']]
              }
            });
          }
          
          // Set player_status to inactive
          if (playerIdx('player_status') >= 0) {
            await this.sheets.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `Players!${String.fromCharCode(65 + playerIdx('player_status'))}${playerRowIndex + 1}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [['inactive']]
              }
            });
          }
          
          return {
            success: true,
            message: '過去の対戦履歴があるため、非アクティブ化しました',
            deactivated: true
          };
        }
      }
      
      // No match history - can permanently delete
      const { headers: playerHeaders, idx: playerIdx } = await this._getHeaders('Players!1:1');
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const playerRows = playersResponse.data.values || [];
      let playerRowIndex = -1;
      
      const idColumnIndex = this._pickIdx(playerIdx, 'id', 'player_id');
      if (idColumnIndex === -1) {
        throw new Error('Neither id nor player_id column found in Players sheet');
      }
      
      for (let i = 1; i < playerRows.length; i++) {
        if (playerRows[i][idColumnIndex] === playerId) {
          playerRowIndex = i;
          break;
        }
      }
      
      if (playerRowIndex === -1) {
        throw new Error('Player not found');
      }
      
      // Get sheet ID for Players sheet
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const playersSheet = spreadsheet.data.sheets.find(sheet => 
        sheet.properties.title === 'Players'
      );
      
      if (!playersSheet) {
        throw new Error('Players sheet not found');
      }
      
      // Delete the row
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: playersSheet.properties.sheetId,
                dimension: 'ROWS',
                startIndex: playerRowIndex,
                endIndex: playerRowIndex + 1
              }
            }
          }]
        }
      });
      
      return {
        success: true,
        message: 'プレイヤーを削除しました',
        deleted: true
      };
    } catch (error) {
      console.error('Error deleting player:', error);
      throw new Error(`Failed to delete player: ${error.message}`);
    }
  }

  async verifyPlayerEmail(email) {
    try {
      await this.authenticate();
      
      // Find player by email and set email_verified to TRUE
      const players = await this.getPlayers();
      const player = players.find(p => p.email.toLowerCase() === email.toLowerCase());
      
      if (!player) {
        throw new Error('Player not found');
      }
      
      // Get row number (index + 2 because data starts at row 2)
      const playerIndex = players.findIndex(p => p.email.toLowerCase() === email.toLowerCase());
      const rowNumber = playerIndex + 2;
      
      // Update email_verified column (Y column)
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `Players!Y${rowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['TRUE']]
        }
      });
      
      console.log(`Email verified for player: ${email}`);
      return true;
    } catch (error) {
      console.error('Error verifying player email:', error);
      throw error;
    }
  }
  /**
   * 大会参加者を取得
   */
  async getTournamentParticipants() {
    await this.authenticate();
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentParticipants!A:Z'
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      const headers = rows[0];
      const participants = rows.slice(1).map(row => {
        const participant = {};
        headers.forEach((header, index) => {
          participant[header] = row[index] || '';
        });
        return participant;
      });

      return participants;
    } catch (error) {
      console.error('Error fetching tournament participants:', error);
      throw error;
    }
  }

  /**
   * 大会参加者を追加または更新（upsert）- 二重登録を防ぐ
   */
  async addTournamentParticipant(participant) {
    await this.authenticate();
    try {
      // まずヘッダーを取得して列構造を確認
      const { headers, idx } = await this._getHeaders('TournamentParticipants!1:1');
      
      if (headers.length === 0) {
        throw new Error('TournamentParticipants sheet headers not found');
      }

      // 既存データを全て取得
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentParticipants!A:Z'
      });
      
      const rows = response.data.values || [];
      
      // 既存の参加者を検索（tournament_id + player_id で重複チェック）
      const tournamentIdIdx = this._pickIdx(idx, 'tournament_id', 'tour_id');
      const playerIdIdx = this._pickIdx(idx, 'player_id', 'participant_id');
      const statusIdx = idx('status');
      
      let existingRowIndex = -1;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][tournamentIdIdx] === participant.tournament_id && 
            rows[i][playerIdIdx] === participant.player_id) {
          existingRowIndex = i;
          break;
        }
      }
      
      if (existingRowIndex >= 0) {
        // 既存の参加者が見つかった場合：statusを'active'に更新
        console.log(`[addTournamentParticipant] Updating existing participant at row ${existingRowIndex}`);
        
        if (statusIdx >= 0) {
          rows[existingRowIndex][statusIdx] = 'active';
        }
        
        // 更新日時も設定
        const joinedAtIdx = idx('joined_at');
        if (joinedAtIdx >= 0) {
          rows[existingRowIndex][joinedAtIdx] = new Date().toISOString();
        }
        
        // 全シートを更新
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentParticipants!A:Z',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows }
        });
        
        console.log('Tournament participant updated to active:', participant.player_id);
        return { ok: true, updated: true };
      } else {
        // 新規参加者を追加
        console.log(`[addTournamentParticipant] Adding new participant`);
        
        // participantオブジェクトをヘッダー順の配列に変換
        const row = headers.map(header => participant[header] || '');

        // 新しい行を追加
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentParticipants!A:Z',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [row]
          }
        });

        console.log('Tournament participant added successfully:', participant.player_id);
        return { ok: true, updated: false };
      }
    } catch (error) {
      console.error('Error adding/updating tournament participant:', error);
      throw error;
    }
  }

  /**
   * Submit match result from player (pending approval)
   */
  async submitMatchResult(resultData) {
    await this.authenticate();
    try {
      const { matchId, playerId, result, opponentId, timestamp, status } = resultData;
      
      // Create result ID
      const resultId = `result_${Date.now()}`;
      
      // Add to MatchResults sheet
      const values = [[
        resultId,           // A: result_id
        matchId,           // B: match_id
        playerId,          // C: player_id
        opponentId,        // D: opponent_id
        result,            // E: result ('win'/'lose')
        status,            // F: status ('pending_approval')
        timestamp,         // G: timestamp
        '',                // H: approved_by (empty until approved)
        ''                 // I: approved_at (empty until approved)
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });

      console.log(`Match result submitted: ${resultId}`);
      return resultId;
    } catch (error) {
      console.error('Error submitting match result:', error);
      throw new Error(`Failed to submit match result: ${error.message}`);
    }
  }

  /**
   * Update match status in TournamentMatches sheet
   */
  async updateMatchStatus(matchId, status, winnerId = '') {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('TournamentMatches!1:1');

    const resp = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId, 
      range: 'TournamentMatches!A:Z'
    });
    const rows = resp.data.values || [];

    let hit = -1;
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][idx('match_id')] || '') === matchId) { 
        hit = i; 
        break; 
      }
    }
    if (hit < 0) throw new Error(`Match ${matchId} not found`);

    const now = new Date().toISOString();
    
    if (idx('status') >= 0) rows[hit][idx('status')] = status;
    if (idx('match_status') >= 0) rows[hit][idx('match_status')] = status;
    if (winnerId && idx('winner_id') >= 0) rows[hit][idx('winner_id')] = winnerId;
    
    // 試合完了時の日時フィールドを更新
    if (status === 'completed' || status === 'approved') {
      if (idx('match_end_time') >= 0) rows[hit][idx('match_end_time')] = now;
      if (idx('approved_at') >= 0) rows[hit][idx('approved_at')] = now;
      if (idx('approved_by') >= 0) rows[hit][idx('approved_by')] = 'admin';
    }
    
    // 試合開始時
    if (status === 'in_progress' && idx('match_start_time') >= 0) {
      rows[hit][idx('match_start_time')] = now;
    }

    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: 'TournamentMatches!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    });

    console.log(`Match ${matchId} status updated to ${status}`);
    return { success: true };
    } catch (error) {
      console.error('Error updating match status:', error);
      throw new Error(`Failed to update match status: ${error.message}`);
    }
  }

  // Update specific match metadata fields
  async updateMatchMetadata(matchId, metadata) {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('TournamentMatches!1:1');

      const resp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId, 
        range: 'TournamentMatches!A:Z'
      });
      const rows = resp.data.values || [];

      let hit = -1;
      for (let i = 1; i < rows.length; i++) {
        if ((rows[i][idx('match_id')] || '') === matchId) { 
          hit = i; 
          break; 
        }
      }
      if (hit < 0) throw new Error(`Match ${matchId} not found`);

      // Update provided metadata fields
      Object.keys(metadata).forEach(field => {
        if (idx(field) >= 0) {
          rows[hit][idx(field)] = metadata[field];
        }
      });

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });

      console.log(`Match ${matchId} metadata updated:`, metadata);
      return { success: true };
    } catch (error) {
      console.error('Error updating match metadata:', error);
      throw new Error(`Failed to update match metadata: ${error.message}`);
    }
  }

  // End tournament and update status
  async endTournament(tournamentId) {
    await this.authenticate();
    
    try {
      const { headers, idx } = await this._getHeaders('Tournaments!1:1');
      
      const resp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId, 
        range: 'Tournaments!A:Z'
      });
      const rows = resp.data.values || [];

      // Support both 'id' and 'tournament_id' columns
      const idIdx = this._pickIdx(idx, 'id', 'tournament_id');
      if (idIdx < 0) {
        console.error('No ID column found in Tournaments sheet');
        return { success: false, error: 'No ID column found' };
      }

      let hit = -1;
      for (let i = 1; i < rows.length; i++) {
        if ((rows[i][idIdx] || '') === tournamentId) { 
          hit = i; 
          break; 
        }
      }
      if (hit < 0) {
        console.error(`Tournament ${tournamentId} not found`);
        return { success: false, error: 'Tournament not found' };
      }

      // Update tournament status to 'completed' (compatible with UI) and set ended_at timestamp
      const now = new Date().toISOString();
      
      // Update status column to 'completed' for UI compatibility
      const statusIdx = idx('status');
      if (statusIdx >= 0) {
        rows[hit][statusIdx] = 'completed';  // Changed from 'ended' to 'completed'
      }
      
      // Also update raw_status if it exists (for backend tracking)
      const rawStatusIdx = idx('raw_status');
      if (rawStatusIdx >= 0) {
        rows[hit][rawStatusIdx] = 'ended';
      }
      
      // Set ended_at timestamp
      const endedAtIdx = idx('ended_at');
      if (endedAtIdx >= 0) {
        rows[hit][endedAtIdx] = now;
      }

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });

      console.log(`Tournament ${tournamentId} ended at ${now}`);
      return { success: true, endedAt: now };
    } catch (error) {
      console.error('Error ending tournament:', error);
      // Return error instead of throwing
      return { success: false, error: error.message };
    }
  }

  // Deactivate all participants for a tournament
  async deactivateTournamentParticipants(tournamentId) {
    await this.authenticate();
    
    try {
      // Deactivate in TournamentParticipants sheet
      const { headers: participantHeaders, idx: participantIdx } = await this._getHeaders('TournamentParticipants!1:1');
      
      const participantResp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentParticipants!A:Z'
      });
      const participantRows = participantResp.data.values || [];
      
      // Use _pickIdx for column flexibility
      const tournamentIdIdx = this._pickIdx(participantIdx, 'tournament_id', 'tour_id');
      const statusIdx = participantIdx('status');
      
      console.log(`[deactivateTournamentParticipants] Processing ${participantRows.length - 1} participants for tournament ${tournamentId}`);
      console.log(`[deactivateTournamentParticipants] Column indices: tournamentId=${tournamentIdIdx}, status=${statusIdx}`);
      
      let participantDeactivated = 0;
      if (tournamentIdIdx >= 0) {
        for (let i = 1; i < participantRows.length; i++) {
          const rowTournamentId = participantRows[i][tournamentIdIdx];
          console.log(`[deactivateTournamentParticipants] Row ${i}: tournamentId=${rowTournamentId}, target=${tournamentId}, match=${rowTournamentId === tournamentId}`);
          
          if (rowTournamentId === tournamentId) {
            if (statusIdx >= 0) {
              const oldStatus = participantRows[i][statusIdx];
              participantRows[i][statusIdx] = 'inactive';
              participantDeactivated++;
              console.log(`[deactivateTournamentParticipants] Deactivated participant row ${i}: ${oldStatus} → inactive`);
            }
          }
        }
        
        if (participantDeactivated > 0) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'TournamentParticipants!A:Z',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: participantRows }
          });
        }
      } else {
        console.warn('Tournament ID column not found in TournamentParticipants sheet');
      }

      // Also deactivate in Players sheet (tournament_active = false)
      const { headers: playerHeaders, idx: playerIdx } = await this._getHeaders('Players!1:1');
      
      const playerResp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      const playerRows = playerResp.data.values || [];
      
      const tournamentActiveIdx = playerIdx('tournament_active');
      
      console.log(`[deactivateTournamentParticipants] Processing ${playerRows.length - 1} players, tournament_active column index: ${tournamentActiveIdx}`);
      
      let playerDeactivated = 0;
      if (tournamentActiveIdx >= 0) {
        for (let i = 1; i < playerRows.length; i++) {
          const activeValue = playerRows[i][tournamentActiveIdx];
          if (activeValue === 'true' || activeValue === true) {
            playerRows[i][tournamentActiveIdx] = 'false';
            playerDeactivated++;
            console.log(`[deactivateTournamentParticipants] Deactivated player row ${i}: tournament_active ${activeValue} → false`);
          }
        }
        
        if (playerDeactivated > 0) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Players!A:Z',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: playerRows }
          });
        }
      } else {
        console.warn('tournament_active column not found in Players sheet');
      }

      console.log(`Deactivated ${participantDeactivated} tournament participants and ${playerDeactivated} players for tournament ${tournamentId}`);
      return { 
        success: true, 
        deactivatedCount: participantDeactivated,
        playersDeactivated: playerDeactivated
      };
    } catch (error) {
      console.error('Error deactivating tournament participants:', error);
      // Return partial success instead of throwing
      return { 
        success: false, 
        error: error.message,
        deactivatedCount: 0,
        playersDeactivated: 0
      };
    }
  }

  /**
   * Admin direct match result input
   */
  async adminDirectMatchResult(matchData) {
    await this.authenticate();
    try {
      const { matchId, winnerId, loserId, timestamp } = matchData;
      
      // 試合情報を取得してgame_typeを確認
      const matches = await this.getTournamentMatches();
      const match = matches.find(m => m.match_id === matchId);
      if (!match) {
        throw new Error(`Match ${matchId} not found`);
      }
      
      // Create result ID
      const resultId = `admin_result_${Date.now()}`;
      
      // Add to MatchResults sheet as approved
      const values = [[
        resultId,           // A: result_id
        matchId,           // B: match_id
        winnerId,          // C: player_id (winner)
        loserId,           // D: opponent_id (loser)
        'win',             // E: result (from winner's perspective)
        'approved',        // F: status
        timestamp,         // G: timestamp
        'admin',           // H: approved_by
        timestamp          // I: approved_at
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values }
      });

      // Update TournamentMatches status - admin decision is final so set to approved
      await this.updateMatchStatus(matchId, 'approved', winnerId);

      // レーティング計算とプレイヤー情報更新
      const players = await this.getPlayers();
      const winner = players.find(p => p.id === winnerId);
      const loser = players.find(p => p.id === loserId);
      
      if (!winner || !loser) {
        throw new Error('Winner or loser not found');
      }

      // Elo レーティング計算 (K=32)
      const K = 32;
      const expectedWinner = 1 / (1 + Math.pow(10, (loser.current_rating - winner.current_rating) / 400));
      const expectedLoser = 1 - expectedWinner;
      
      const winnerDelta = Math.round(K * (1 - expectedWinner));
      const loserDelta = Math.round(K * (0 - expectedLoser));
      
      const winnerNewRating = winner.current_rating + winnerDelta;
      const loserNewRating = loser.current_rating + loserDelta;

      // レーティング更新
      await this.updatePlayerRating(winnerId, winnerNewRating);
      await this.updatePlayerRating(loserId, loserNewRating);

      // カードプラスバッジ付与（非ブロッキング）
      let badgeAdded = false;
      if (match.game_type === 'cardplus' || match.game_type === 'カード+') {
        try {
          const badgeResult = await this.addBadgeToPlayer(winnerId, '➕');
          badgeAdded = badgeResult?.success === true;
        } catch (error) {
          console.warn('Badge add failed but continuing match result process:', error);
          badgeAdded = false;
        }
      }

      console.log(`Admin direct result recorded: ${resultId}`);
      return { 
        success: true, 
        resultId,
        ratingUpdate: {
          winnerDelta,
          loserDelta,
          winnerAfter: winnerNewRating,
          loserAfter: loserNewRating
        },
        badgeAdded
      };
    } catch (error) {
      console.error('Error recording admin direct match result:', error);
      throw new Error(`Failed to record admin match result: ${error.message}`);
    }
  }

  /**
   * Approve match result
   */
  async approveMatchResult(resultId, approved) {
    await this.authenticate();
    try {
      // Get MatchResults data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:I'
      });

      const rows = response.data.values || [];
      let updated = false;
      let matchId = '';

      // Find and update the result
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === resultId) {
          rows[i][5] = approved ? 'approved' : 'rejected';  // F: status
          rows[i][7] = 'admin';                            // H: approved_by
          rows[i][8] = new Date().toISOString();           // I: approved_at
          matchId = rows[i][1];                            // B: match_id
          updated = true;
          break;
        }
      }

      if (!updated) {
        throw new Error(`Match result ${resultId} not found`);
      }

      // Write back to MatchResults sheet
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:I',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows }
      });

      // If approved, update TournamentMatches status
      if (approved && matchId) {
        const winnerId = rows.find(r => r[0] === resultId)?.[2]; // C: player_id (winner)
        await this.updateMatchStatus(matchId, 'completed', winnerId);
      }

      console.log(`Match result ${resultId} ${approved ? 'approved' : 'rejected'}`);
      return { 
        success: true, 
        message: approved ? '試合結果が承認されました' : '試合結果が却下されました'
      };
    } catch (error) {
      console.error('Error approving match result:', error);
      throw new Error(`Failed to approve match result: ${error.message}`);
    }
  }

  /**
   * Get pending match results for admin approval
   */
  async getPendingMatchResults() {
    await this.authenticate();
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:I'
      });

      const rows = response.data.values || [];
      const pendingResults = [];

      // Get player data for name resolution
      const players = await this.getPlayers();
      const playerMap = new Map(players.map(p => [p.id, p.nickname]));

      // Filter pending results and add player names
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (row[5] === 'pending_approval') {  // F: status
          pendingResults.push({
            resultId: row[0] || '',
            matchId: row[1] || '',
            playerId: row[2] || '',
            opponentId: row[3] || '',
            result: row[4] || '',
            timestamp: row[6] || '',
            status: row[5] || '',
            playerName: playerMap.get(row[2]) || row[2],
            opponentName: playerMap.get(row[3]) || row[3]
          });
        }
      }

      return pendingResults;
    } catch (error) {
      console.error('Error fetching pending match results:', error);
      throw new Error(`Failed to fetch pending match results: ${error.message}`);
    }
  }

  /**
   * Supersede pending match results when admin makes final decision
   */
  async supersedePendingMatchResults(matchId) {
    await this.authenticate();
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:I'
      });

      const rows = response.data.values || [];
      let changed = false;
      const now = new Date().toISOString();

      // A:result_id, B:match_id, ... F:status, H:approved_by, I:approved_at
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === matchId && rows[i][5] === 'pending_approval') {
          rows[i][5] = 'superseded'; // Status changed to superseded
          rows[i][7] = 'admin';      // H: approved_by
          rows[i][8] = now;          // I: approved_at
          changed = true;
        }
      }

      if (changed) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'MatchResults!A:I',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows }
        });
        console.log(`Superseded pending results for match ${matchId}`);
      }

      return { success: true, supersededCount: changed ? 1 : 0 };
    } catch (error) {
      console.error('Error superseding pending match results:', error);
      throw new Error(`Failed to supersede pending match results: ${error.message}`);
    }
  }

  /**
   * Add badge to player (avoiding duplicates) - Non-blocking version
   */
  async addBadgeToPlayer(playerId, badge) {
    await this.authenticate();
    try {
      const { headers, idx } = await this._getHeaders('Players!1:1');
      
      // Get player data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const rows = response.data.values || [];
      let playerRow = -1;
      
      // Find player row - support both 'id' and 'player_id'
      const idColumnIndex = this._pickIdx(idx, 'id', 'player_id');
      if (idColumnIndex === -1) {
        console.warn('Neither id nor player_id column found in Players sheet');
        return { success: false, reason: 'no_id_column' };
      }
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColumnIndex] === playerId) {
          playerRow = i;
          break;
        }
      }
      
      if (playerRow === -1) {
        console.warn(`Player ${playerId} not found in Players sheet`);
        return { success: false, reason: 'player_not_found' };
      }
      
      // Get current badges (champion_badges column)
      const badgeColumnIndex = idx('champion_badges');
      if (badgeColumnIndex === -1) {
        console.warn('champion_badges column not found in Players sheet');
        return { success: false, reason: 'no_badge_column' };
      }
      
      const currentBadges = rows[playerRow][badgeColumnIndex] || '';
      
      // Add badge if not already present
      if (!currentBadges.includes(badge)) {
        const newBadges = currentBadges ? currentBadges + badge : badge;
        
        // Update the specific cell
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Players!${String.fromCharCode(65 + badgeColumnIndex)}${playerRow + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[newBadges]]
          }
        });
        
        console.log(`Badge ${badge} added to player ${playerId}`);
        return { success: true, added: true };
      } else {
        console.log(`Player ${playerId} already has badge ${badge}`);
        return { success: true, added: false };
      }
    } catch (error) {
      console.error('Error adding badge to player:', error);
      return { success: false, reason: error.message };
    }
  }

  // Specific method for Card Plus badges
  async addCardPlusBadge(playerId) {
    await this.authenticate();
    try {
      const { headers, idx } = await this._getHeaders('Players!1:1');
      
      // Get player data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const rows = response.data.values || [];
      let playerRow = -1;
      
      // Find player row
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idx('id')] === playerId) {
          playerRow = i;
          break;
        }
      }
      
      if (playerRow === -1) {
        throw new Error(`Player ${playerId} not found`);
      }
      
      // Get current badges (I列 = champion_badges)
      const badgeColumnIndex = idx('champion_badges');
      if (badgeColumnIndex === -1) {
        console.warn('champion_badges column not found');
        return { badgesAdded: [] };
      }
      
      const currentBadges = rows[playerRow][badgeColumnIndex] || '';
      
      // Check if Card Plus badge (＋) is already present
      if (!currentBadges.includes('＋')) {
        const newBadges = currentBadges + '＋';
        
        // Update the specific cell
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Players!${String.fromCharCode(65 + badgeColumnIndex)}${playerRow + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[newBadges]]
          }
        });
        
        console.log(`Card Plus badge (＋) added to player ${playerId}`);
        return { badgesAdded: ['＋'] };
      } else {
        console.log(`Player ${playerId} already has Card Plus badge (＋)`);
        return { badgesAdded: [] };
      }
    } catch (error) {
      console.error('Error adding Card Plus badge:', error);
      throw new Error(`Failed to add Card Plus badge: ${error.message}`);
    }
  }
}

module.exports = SheetsService;