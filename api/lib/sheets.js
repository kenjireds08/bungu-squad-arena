const { google } = require('googleapis');
const RatingCalculator = require('./rating');

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
        
        // DISABLED: Auto-reset causes issues with same-day tournament entries
        // The reset should only happen via admin action or scheduled job, not on every getPlayers call
        // this.autoResetOldTournamentParticipation()
        //   .then(() => console.log('Auto-reset check completed'))
        //   .catch(resetError => console.warn('Auto-reset failed:', resetError.message));
        
        return rows.map((row, index) => ({
          id: row[0] || `row${index + 2}`,
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
        
        // Get all matches to count player matches
        let allMatches = [];
        try {
          const matchesResponse = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'TournamentMatches!A2:Z1000'
          });
          allMatches = matchesResponse.data.values || [];
        } catch (error) {
          console.warn('Could not fetch matches for counting:', error.message);
        }
        
        // Count matches and wins/losses per player
        const matchCounts = {};
        const annualWins = {};
        const annualLosses = {};
        
        allMatches.forEach((match, index) => {
          const player1Id = match[2]; // player1_id (correct index based on actual structure)
          const player2Id = match[3]; // player2_id (correct index based on actual structure)
          const matchStatus = match[5]; // match_status (index 5)
          const winnerId = match[8]; // winner_id (index 8) - 修正: 実際の勝者IDはインデックス8に格納されている
          
          // Count all matches regardless of status where player IDs are not empty
          if (player1Id && player1Id.trim() !== '') {
            matchCounts[player1Id] = (matchCounts[player1Id] || 0) + 1;
            
            // Count wins and losses for approved matches
            if (matchStatus === 'approved' && winnerId) {
              // winner_id could be either player1_id or player2_id
              if (winnerId.trim() === player1Id.trim()) {
                annualWins[player1Id] = (annualWins[player1Id] || 0) + 1;
              } else if (winnerId.trim() === player2Id.trim()) {
                // player1 lost
                annualLosses[player1Id] = (annualLosses[player1Id] || 0) + 1;
              }
            }
          }
          if (player2Id && player2Id.trim() !== '') {
            matchCounts[player2Id] = (matchCounts[player2Id] || 0) + 1;
            
            // Count wins and losses for approved matches
            if (matchStatus === 'approved' && winnerId) {
              // winner_id could be either player1_id or player2_id
              if (winnerId.trim() === player2Id.trim()) {
                annualWins[player2Id] = (annualWins[player2Id] || 0) + 1;
              } else if (winnerId.trim() === player1Id.trim()) {
                // player2 lost
                annualLosses[player2Id] = (annualLosses[player2Id] || 0) + 1;
              }
            }
          }
        });
        
        // Debug log (can be removed in production)
        // console.log('Match counts:', matchCounts);
        
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
          champion_badges: badges,
          matches: matchCounts[player.id] || 0,
          annual_wins: annualWins[player.id] || 0,
          annual_losses: annualLosses[player.id] || 0
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
      const player = players.find(player => player.id === id);
      
      if (!player) {
        return null;
      }
      
      // Get match count for this player
      let matchCount = 0;
      try {
        const matchesResponse = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentMatches!A2:Z1000'
        });
        const allMatches = matchesResponse.data.values || [];
        
        allMatches.forEach(match => {
          const player1Id = match[2]; // player1_id (correct index based on actual structure)
          const player2Id = match[3]; // player2_id (correct index based on actual structure)
          const status = match[5]; // match_status (correct index based on actual structure)
          
          // Count all matches where the player participated (with non-empty IDs)
          if ((player1Id && player1Id.trim() === id) || (player2Id && player2Id.trim() === id)) {
            matchCount++;
          }
        });
      } catch (error) {
        console.warn('Could not fetch matches for player:', error.message);
      }
      
      return {
        ...player,
        matches: matchCount
      };
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
      // Handle tournament_active (which is stored in reserved_1 column, index 23)
      const tournamentActiveIdx = idx('tournament_active') >= 0 ? idx('tournament_active') : 
                                  idx('reserved_1') >= 0 ? idx('reserved_1') : 23;
      newRow[tournamentActiveIdx] = playerData.tournament_active ? 'TRUE' : 'FALSE';
      newRow[idx('email_verified')] = playerData.email_verified ? 'TRUE' : 'FALSE';
      
      console.log('DEBUG: Final newRow array:', newRow);
      console.log('DEBUG: tournament_active value at index', tournamentActiveIdx, ':', newRow[tournamentActiveIdx]);
      
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

  async updatePlayerGameExperience(playerId, gameType) {
    await this.authenticate();
    
    try {
      console.log(`[updatePlayerGameExperience] Updating game experience for player ${playerId}, game type: ${gameType}`);
      
      // Skip if game type is not trump or cardplus
      if (gameType !== 'trump' && gameType !== 'cardplus') {
        console.log(`[updatePlayerGameExperience] Skipping - game type ${gameType} doesn't require badge`);
        return { success: true, badgeUpdated: false };
      }
      
      // Get headers and player data
      const { headers, idx } = await this._getHeaders('Players!1:1');
      const playersResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:Z'
      });
      
      const rows = playersResponse.data.values || [];
      if (rows.length <= 1) {
        throw new Error('No players found');
      }
      
      // Find player row
      const playerIdIdx = this._pickIdx(idx, 'id', 'player_id');
      let playerRowIndex = -1;
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][playerIdIdx] === playerId) {
          playerRowIndex = i;
          break;
        }
      }
      
      if (playerRowIndex === -1) {
        console.warn(`[updatePlayerGameExperience] Player ${playerId} not found`);
        return { success: false, error: 'Player not found' };
      }
      
      const playerRow = rows[playerRowIndex];
      const today = new Date().toISOString().split('T')[0];
      let updated = false;
      
      if (gameType === 'trump') {
        const trumpExpIdx = idx('trump_rule_experienced');
        const trumpDateIdx = idx('first_trump_game_date');
        
        // Check if already experienced
        if (trumpExpIdx >= 0 && playerRow[trumpExpIdx] !== 'TRUE') {
          playerRow[trumpExpIdx] = 'TRUE';
          updated = true;
          console.log(`[updatePlayerGameExperience] Setting trump_rule_experienced to TRUE for ${playerId}`);
        }
        
        // Set first play date if empty
        if (trumpDateIdx >= 0 && !playerRow[trumpDateIdx]) {
          playerRow[trumpDateIdx] = today;
          updated = true;
          console.log(`[updatePlayerGameExperience] Setting first_trump_game_date to ${today} for ${playerId}`);
        }
      } else if (gameType === 'cardplus') {
        const cardplusExpIdx = idx('cardplus_rule_experienced');
        const cardplusDateIdx = idx('first_cardplus_game_date');
        
        // Check if already experienced
        if (cardplusExpIdx >= 0 && playerRow[cardplusExpIdx] !== 'TRUE') {
          playerRow[cardplusExpIdx] = 'TRUE';
          updated = true;
          console.log(`[updatePlayerGameExperience] Setting cardplus_rule_experienced to TRUE for ${playerId}`);
        }
        
        // Set first play date if empty
        if (cardplusDateIdx >= 0 && !playerRow[cardplusDateIdx]) {
          playerRow[cardplusDateIdx] = today;
          updated = true;
          console.log(`[updatePlayerGameExperience] Setting first_cardplus_game_date to ${today} for ${playerId}`);
        }
      }
      
      // Update sheet if changes were made
      if (updated) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Players!A:Z',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows }
        });
        
        console.log(`[updatePlayerGameExperience] Successfully updated game experience for ${playerId}`);
        return { success: true, badgeUpdated: true };
      } else {
        console.log(`[updatePlayerGameExperience] No update needed - player ${playerId} already has ${gameType} experience`);
        return { success: true, badgeUpdated: false };
      }
      
    } catch (error) {
      console.error('[updatePlayerGameExperience] Error:', error);
      return { success: false, error: error.message };
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
    
    let deactivateResult = { playersDeactivated: 0 };
    
    try {
      // First, deactivate all participants before deleting
      // This ensures players aren't left in an active state after tournament deletion
      console.log(`Deactivating participants for tournament ${tournamentId} before deletion...`);
      deactivateResult = await this.deactivateTournamentParticipants(tournamentId);
      console.log(`Deactivated ${deactivateResult.playersDeactivated} players before deletion`);
      
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

      console.log(`Tournament deleted: ${tournamentId}, deactivated ${deactivateResult.playersDeactivated} players`);
      return { 
        success: true, 
        message: `大会を削除し、${deactivateResult.playersDeactivated}名のエントリー状態を解除しました`,
        playersDeactivated: deactivateResult.playersDeactivated
      };
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

  // Add single tournament match (for appending to existing tournament)
  async addSingleTournamentMatch(tournamentId, matchData) {
    try {
      await this.authenticate();
      await this.createTournamentMatchesSheet();
      
      // Get headers to ensure proper field mapping
      const { headers, idx } = await this._getHeaders('TournamentMatches!1:1');
      
      // Get existing matches to determine next match number
      const existingMatches = await this.getTournamentMatches(tournamentId);
      const nextMatchNumber = existingMatches.length + 1;
      
      // Generate match ID and prepare row data
      const matchId = `${tournamentId}_match_${nextMatchNumber}_${Date.now()}`;
      const now = new Date().toISOString();
      
      // Create row data matching new header format
      const row = new Array(headers.length).fill('');
      
      // Helper function for safe field setting
      const setField = (fieldName, value) => {
        const i = idx(fieldName);
        if (i >= 0) row[i] = value;
      };

      setField('match_id', matchId);
      setField('tournament_id', tournamentId);
      setField('player1_id', matchData.player1_id);
      setField('player2_id', matchData.player2_id);
      setField('table_number', '');
      setField('match_status', 'scheduled');
      setField('game_type', matchData.game_type || 'trump');
      setField('created_at', now);
      setField('winner_id', '');
      setField('loser_id', '');
      setField('match_start_time', '');
      setField('match_end_time', '');
      setField('reported_by', '');
      setField('reported_at', '');
      setField('approved_by', '');
      setField('approved_at', '');
      setField('player1_rating_before', '');
      setField('player2_rating_before', '');
      setField('player1_rating_after', '');
      setField('player2_rating_after', '');
      setField('player1_rating_change', '');
      setField('player2_rating_change', '');
      setField('notes', '');
      setField('created_by', 'admin');
      
      // Append to TournamentMatches sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:X',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row]
        }
      });
      
      console.log(`Added single match ${matchId} to tournament ${tournamentId}`);
      
      return {
        success: true,
        matchId: matchId,
        message: '試合を追加しました'
      };
    } catch (error) {
      console.error('Error adding single tournament match:', error);
      throw error;
    }
  }

  async saveTournamentMatches(tournamentId, matches) {
    await this.authenticate();
    const { headers, idx } = await this._getHeaders('TournamentMatches!1:1');
    
    try {
      // Ensure tournament matches sheet exists
      await this.createTournamentMatchesSheet();
      
      // Skip deletion - append new matches to existing ones
      console.log(`Appending new matches to existing tournament ${tournamentId} matches`);
      
      const timestamp = new Date().toISOString();
      const values = matches.map((match, index) => {
        const row = new Array(headers.length).fill('');
        const set = (name, val) => { const i = idx(name); if (i >= 0) row[i] = val; };

        set('match_id', `${tournamentId}_${match.id}`);
        set('tournament_id', tournamentId);
        set('player1_id', match.player1.id);
        set('player2_id', match.player2.id);
        set('table_number', '');
        set('match_status', 'scheduled'); // Use correct field name
        set('game_type', match.gameType);
        set('created_at', timestamp);
        set('winner_id', '');
        set('loser_id', '');
        set('match_start_time', '');
        set('match_end_time', '');
        set('reported_by', '');
        set('reported_at', '');
        set('approved_by', '');
        set('approved_at', '');
        set('player1_rating_before', '');
        set('player2_rating_before', '');
        set('player1_rating_after', '');
        set('player2_rating_after', '');
        set('player1_rating_change', '');
        set('player2_rating_change', '');
        set('notes', '');
        set('created_by', 'admin');

        return row;
      });

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:X',
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
          approved_at:      r[idx('approved_at')] || '',
          player1_rating_change: r[idx('player1_rating_change')] || '',
          player2_rating_change: r[idx('player2_rating_change')] || ''
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
      const processedMatchIds = new Set(); // Track processed matches to avoid duplicates
      
      // Get players data once for name lookup
      const players = await this.getPlayers();
      
      // Priority 1: Add historical matches from MatchResults sheet (completed matches)
      for (const result of matchResults) {
        if (result.player_id === playerId || result.opponent_id === playerId) {
          const isReporter = result.player_id === playerId;
          const opponentId = isReporter ? result.opponent_id : result.player_id;
          
          // Get opponent name from players data
          const opponent = players.find(p => p.id === opponentId);
          const opponentName = opponent?.nickname || 'Unknown';
          
          let matchResult = 'unknown';
          
          if (result.result) {
            if (isReporter) {
              // Current user reported this result
              matchResult = result.result; // 'win' or 'loss'
            } else {
              // Opponent reported this result, so invert
              matchResult = result.result === 'win' ? 'lose' : 'win';
            }
          }
          
          // Calculate rating change for this player
          let ratingChange = 0;
          console.log(`DEBUG: MatchResults data for ${playerId}:`, {
            player1_rating_change: result.player1_rating_change,
            player2_rating_change: result.player2_rating_change,
            isReporter
          });
          
          if (result.player1_rating_change && result.player2_rating_change) {
            // If both rating changes are available, use the appropriate one
            if (isReporter) {
              ratingChange = parseInt(result.player1_rating_change) || 0;
            } else {
              ratingChange = parseInt(result.player2_rating_change) || 0;
            }
            console.log(`DEBUG: Using MatchResults rating change:`, ratingChange);
          } else {
            // Try to get from TournamentMatches sheet if available
            const tournamentMatch = tournamentMatches.find(tm => tm.match_id === result.match_id);
            if (tournamentMatch) {
              const isPlayer1InTournament = tournamentMatch.player1_id === playerId;
              if (isPlayer1InTournament) {
                ratingChange = parseInt(tournamentMatch.player1_rating_change) || 0;
                console.log(`DEBUG: Using TournamentMatches player1 rating change:`, tournamentMatch.player1_rating_change, '→', ratingChange);
              } else {
                ratingChange = parseInt(tournamentMatch.player2_rating_change) || 0;
                console.log(`DEBUG: Using TournamentMatches player2 rating change:`, tournamentMatch.player2_rating_change, '→', ratingChange);
              }
            } else {
              console.log(`DEBUG: No tournament match found for match_id:`, result.match_id);
            }
          }
          
          const matchId = result.match_id || `result_${result.id}`;
          processedMatchIds.add(matchId);
          
          playerHistory.push({
            match_id: matchId,
            tournament_id: result.tournament_id || null,
            opponent: { id: opponentId, name: opponentName },
            game_type: result.game_rule || 'trump',
            result: matchResult,
            rating_change: ratingChange,
            timestamp: result.reported_at || result.match_end_time || '',
            match_type: result.tournament_id ? 'tournament' : 'casual'
          });
        }
      }
      
      // Priority 2: Add tournament matches not yet in MatchResults (scheduled/pending matches)
      console.log(`DEBUG: Processing ${tournamentMatches.length} tournament matches for player ${playerId}`);
      for (const match of tournamentMatches) {
        if ((match.player1_id === playerId || match.player2_id === playerId) && 
            !processedMatchIds.has(match.match_id)) {
          
          console.log(`DEBUG: Processing tournament match:`, {
            match_id: match.match_id,
            player1_id: match.player1_id,
            player2_id: match.player2_id,
            winner_id: match.winner_id,
            player1_rating_change: match.player1_rating_change,
            player2_rating_change: match.player2_rating_change
          });
          
          const isPlayer1 = match.player1_id === playerId;
          const opponent = isPlayer1 ? 
            { id: match.player2_id, name: match.player2_name } : 
            { id: match.player1_id, name: match.player1_name };
          
          let result = 'pending';
          let ratingChange = 0;
          
          // Check if match has a winner (regardless of status)
          if (match.winner_id) {
            if (match.winner_id === playerId) {
              result = 'win';
            } else if (match.winner_id === opponent.id) {
              result = 'lose';
            }
            
            // Get rating change from tournament match data
            if (isPlayer1) {
              ratingChange = parseInt(match.player1_rating_change) || 0;
              console.log(`DEBUG: Player1 rating change for ${playerId}:`, match.player1_rating_change, '→', ratingChange);
            } else {
              ratingChange = parseInt(match.player2_rating_change) || 0;
              console.log(`DEBUG: Player2 rating change for ${playerId}:`, match.player2_rating_change, '→', ratingChange);
            }
          }
          
          playerHistory.push({
            match_id: match.match_id,
            tournament_id: match.tournament_id,
            opponent: opponent,
            game_type: match.game_type || 'trump',
            result: result,
            rating_change: ratingChange,
            timestamp: match.match_end_time || match.created_at || '',
            match_type: 'tournament'
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
        // Use correct field names from MatchResults sheet
        const playerId = r[idx('player_id')] || '';
        const opponentId = r[idx('opponent_id')] || '';
        const result = r[idx('result')] || '';
        
        results.push({
          id: r[idx('result_id')] || `result_${i}`,
          match_id: r[idx('match_id')] || '',
          tournament_id: r[idx('tournament_id')] || '',
          player_id: playerId,
          opponent_id: opponentId,
          result: result,
          game_rule: r[idx('game_rule')] || 'trump',
          match_start_time: r[idx('match_start_time')] || '',
          match_end_time: r[idx('match_end_time')] || '',
          reported_by: r[idx('reported_by')] || '',
          reported_at: r[idx('reported_at')] || '',
          approved_by: r[idx('approved_by')] || '',
          approved_at: r[idx('approved_at')] || ''
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
      console.log('[addTournamentParticipant] Starting with participant:', participant);
      
      // まずヘッダーを取得して列構造を確認
      const { headers, idx } = await this._getHeaders('TournamentParticipants!1:1');
      
      console.log('[addTournamentParticipant] Headers retrieved:', headers);
      
      if (!headers || headers.length === 0) {
        // TournamentParticipantsシートが存在しない場合、作成を試みる
        console.error('[addTournamentParticipant] TournamentParticipants sheet headers not found, attempting to create sheet');
        throw new Error('TournamentParticipants sheet headers not found - sheet might not exist');
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
        // 既存の参加者が見つかった場合：statusを'registered'に更新
        console.log(`[addTournamentParticipant] Updating existing participant at row ${existingRowIndex}`);
        
        if (statusIdx >= 0) {
          rows[existingRowIndex][statusIdx] = participant.status || 'registered';
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
        console.log(`[addTournamentParticipant] Adding new participant with data:`, participant);
        
        // デフォルト値を設定
        const participantWithDefaults = {
          ...participant,
          status: participant.status || 'registered',
          registered_at: participant.registered_at || new Date().toISOString(),
          joined_at: participant.joined_at || new Date().toISOString()
        };
        
        // participantオブジェクトをヘッダー順の配列に変換
        const row = headers.map(header => participantWithDefaults[header] || '');
        
        console.log(`[addTournamentParticipant] Row to append:`, row);
        console.log(`[addTournamentParticipant] Headers:`, headers);

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
    
    // Calculate rating changes when match is completed with a winner
    if (winnerId && (status === 'completed' || status === 'approved')) {
      const player1Id = rows[hit][idx('player1_id')] || '';
      const player2Id = rows[hit][idx('player2_id')] || '';
      const loserId = winnerId === player1Id ? player2Id : player1Id;
      
      // Get current ratings
      const [winner, loser] = await Promise.all([
        this.getPlayer(winnerId),
        this.getPlayer(loserId)
      ]);
      
      if (winner && loser) {
        const ratingCalculator = new RatingCalculator();
        const ratingResult = ratingCalculator.calculateBothPlayersRating(
          winner.current_rating || 1200,
          loser.current_rating || 1200
        );
        
        // Update rating changes in the match record
        if (winnerId === player1Id) {
          if (idx('player1_rating_before') >= 0) rows[hit][idx('player1_rating_before')] = winner.current_rating || 1200;
          if (idx('player2_rating_before') >= 0) rows[hit][idx('player2_rating_before')] = loser.current_rating || 1200;
          if (idx('player1_rating_after') >= 0) rows[hit][idx('player1_rating_after')] = ratingResult.winner.newRating;
          if (idx('player2_rating_after') >= 0) rows[hit][idx('player2_rating_after')] = ratingResult.loser.newRating;
          if (idx('player1_rating_change') >= 0) rows[hit][idx('player1_rating_change')] = ratingResult.winner.ratingChange;
          if (idx('player2_rating_change') >= 0) rows[hit][idx('player2_rating_change')] = ratingResult.loser.ratingChange;
        } else {
          if (idx('player1_rating_before') >= 0) rows[hit][idx('player1_rating_before')] = loser.current_rating || 1200;
          if (idx('player2_rating_before') >= 0) rows[hit][idx('player2_rating_before')] = winner.current_rating || 1200;
          if (idx('player1_rating_after') >= 0) rows[hit][idx('player1_rating_after')] = ratingResult.loser.newRating;
          if (idx('player2_rating_after') >= 0) rows[hit][idx('player2_rating_after')] = ratingResult.winner.newRating;
          if (idx('player1_rating_change') >= 0) rows[hit][idx('player1_rating_change')] = ratingResult.loser.ratingChange;
          if (idx('player2_rating_change') >= 0) rows[hit][idx('player2_rating_change')] = ratingResult.winner.ratingChange;
        }
        
        // Update player ratings
        await this.updatePlayerRating(winnerId, ratingResult.winner.newRating);
        await this.updatePlayerRating(loserId, ratingResult.loser.newRating);
        
        console.log(`Rating updated: ${winnerId} ${ratingResult.winner.ratingChange > 0 ? '+' : ''}${ratingResult.winner.ratingChange}, ${loserId} ${ratingResult.loser.ratingChange}`);
        
        // Auto-grant game badges
        const gameType = rows[hit][idx('game_type')] || rows[hit][idx('game_rule')] || '';
        if (gameType) {
          console.log(`[updateMatchStatus] Auto-granting ${gameType} badges for match ${matchId}`);
          
          // Update both players' game experience
          const [winnerBadgeResult, loserBadgeResult] = await Promise.all([
            this.updatePlayerGameExperience(winnerId, gameType),
            this.updatePlayerGameExperience(loserId, gameType)
          ]);
          
          if (winnerBadgeResult.badgeUpdated) {
            console.log(`[updateMatchStatus] New ${gameType} badge granted to winner ${winnerId}`);
          }
          if (loserBadgeResult.badgeUpdated) {
            console.log(`[updateMatchStatus] New ${gameType} badge granted to loser ${loserId}`);
          }
        }
      }
    }
    
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
      // TournamentParticipantsシートが使われていない場合のフォールバック処理
      // 大会終了時は、tournament_activeがTRUEの全プレイヤーをFALSEにする
      
      const { headers: playerHeaders, idx: playerIdx } = await this._getHeaders('Players!1:1');
      
      const playerResp = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:AC'
      });
      const playerRows = playerResp.data.values || [];
      
      // Get player ID column index (should be column A, index 0)
      const playerIdColumnIdx = playerIdx('id');
      
      // Try multiple possible column names for tournament_active
      let tournamentActiveIdx = playerIdx('tournament_active');
      if (tournamentActiveIdx === -1) {
        tournamentActiveIdx = playerIdx('reserved_1');  // Try reserved_1 as fallback
      }
      if (tournamentActiveIdx === -1) {
        tournamentActiveIdx = 23;  // Use hardcoded index 23 (column X) as last resort
        console.log(`[deactivateTournamentParticipants] Using hardcoded index 23 for tournament_active column`);
      }
      
      console.log(`[deactivateTournamentParticipants] Processing all active players for tournament ${tournamentId}`);
      console.log(`[deactivateTournamentParticipants] Column indices: playerId=${playerIdColumnIdx}, tournament_active=${tournamentActiveIdx}`);
      
      let playerDeactivated = 0;
      const deactivatedPlayerIds = [];
      
      if (tournamentActiveIdx >= 0) {
        for (let i = 1; i < playerRows.length; i++) {
          const playerId = playerRows[i][playerIdColumnIdx] || `row${i}`;
          const activeValue = playerRows[i][tournamentActiveIdx];
          
          // Deactivate ALL players with tournament_active = TRUE
          // (大会終了時は、参加中の全プレイヤーを非アクティブにする)
          if (activeValue === 'TRUE' || activeValue === 'true' || activeValue === true) {
            playerRows[i][tournamentActiveIdx] = 'FALSE';  // Use uppercase FALSE for consistency
            playerDeactivated++;
            deactivatedPlayerIds.push(playerId);
            console.log(`[deactivateTournamentParticipants] Deactivated player ${playerId} (row ${i}): tournament_active ${activeValue} → FALSE`);
          }
        }
        
        if (playerDeactivated > 0) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: 'Players!A:AC',
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: playerRows }
          });
          console.log(`[deactivateTournamentParticipants] Successfully deactivated ${playerDeactivated} players:`, deactivatedPlayerIds);
        } else {
          console.log(`[deactivateTournamentParticipants] No active players found to deactivate`);
        }
      } else {
        console.warn('tournament_active column not found in Players sheet');
      }

      console.log(`Deactivated ${playerDeactivated} players for tournament ${tournamentId}`);
      return { 
        success: true, 
        deactivatedCount: playerDeactivated,
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

      // ゲームバッジ自動付与
      let badgesUpdated = { winner: false, loser: false };
      const gameType = match.game_type || match.game_rule || '';
      
      if (gameType) {
        console.log(`[adminDirectMatchResult] Auto-granting ${gameType} badges for match ${matchId}`);
        
        try {
          // Update both players' game experience
          const [winnerBadgeResult, loserBadgeResult] = await Promise.all([
            this.updatePlayerGameExperience(winnerId, gameType),
            this.updatePlayerGameExperience(loserId, gameType)
          ]);
          
          badgesUpdated.winner = winnerBadgeResult.badgeUpdated || false;
          badgesUpdated.loser = loserBadgeResult.badgeUpdated || false;
          
          if (badgesUpdated.winner) {
            console.log(`[adminDirectMatchResult] New ${gameType} badge granted to winner ${winnerId}`);
          }
          if (badgesUpdated.loser) {
            console.log(`[adminDirectMatchResult] New ${gameType} badge granted to loser ${loserId}`);
          }
        } catch (error) {
          console.warn('Badge update failed but continuing match result process:', error);
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
        badgesUpdated
      };
    } catch (error) {
      console.error('Error recording admin direct match result:', error);
      throw new Error(`Failed to record admin match result: ${error.message}`);
    }
  }

  /**
   * Update match result (called from match edit UI)
   */
  async updateMatchResult(matchId, updateData) {
    try {
      await this.authenticate();
      console.log(`[updateMatchResult] Updating match ${matchId} with data:`, updateData);
      
      const { winnerId, gameType } = updateData;
      
      // Delegate to editCompletedMatch for actual implementation
      const result = await this.editCompletedMatch(matchId, winnerId, gameType);
      
      return result;
    } catch (error) {
      console.error('Error updating match result:', error);
      throw new Error(`Failed to update match result: ${error.message}`);
    }
  }

  /**
   * Edit completed match (change winner or game type)
   */
  async editCompletedMatch(matchId, newWinnerId, newGameType) {
    try {
      await this.authenticate();
      console.log(`[editCompletedMatch] Editing match ${matchId} with winner ${newWinnerId} and game type ${newGameType}`);

      // Get the match details - pass null to get ALL matches
      const matches = await this.getTournamentMatches(null);
      const match = matches.find(m => m.match_id === matchId);
      
      if (!match) {
        console.error(`[editCompletedMatch] Match not found: ${matchId}`);
        throw new Error(`Match not found: ${matchId}`);
      }
      
      // IMPORTANT: Find match row once at the beginning to ensure we're updating the right row
      const matchRow = await this.findMatchRow(matchId);
      if (!matchRow) {
        console.error(`[editCompletedMatch] Match row not found in spreadsheet: ${matchId}`);
        throw new Error(`Match row not found in spreadsheet: ${matchId}`);
      }
      console.log(`[editCompletedMatch] Found match at row: ${matchRow}`);
      
      if (match.status !== 'completed' && match.status !== 'approved') {
        console.error(`[editCompletedMatch] Match status invalid: ${match.status}`);
        throw new Error(`Can only edit completed matches. Current status: ${match.status}`);
      }

      // Validate newWinnerId
      if (!newWinnerId) {
        console.error(`[editCompletedMatch] Winner ID is required but not provided`);
        throw new Error('Winner ID is required');
      }

      if (newWinnerId !== match.player1_id && newWinnerId !== match.player2_id) {
        console.error(`[editCompletedMatch] Invalid winner ID: ${newWinnerId}. Must be ${match.player1_id} or ${match.player2_id}`);
        throw new Error('Winner must be one of the match participants');
      }

      // Clean up winner_id if it contains invalid values like "approved"
      let oldWinnerId = match.winner_id;
      if (oldWinnerId === 'approved' || oldWinnerId === 'completed' || oldWinnerId === 'invalidated' || oldWinnerId === '') {
        console.warn(`[editCompletedMatch] Found invalid winner_id: "${oldWinnerId}". Treating as no previous winner.`);
        oldWinnerId = null;
      }
      const gameType = newGameType || match.game_type;
      
      console.log(`[editCompletedMatch] Match data:`, {
        matchId: match.match_id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        oldWinnerId,
        newWinnerId,
        oldGameType: match.game_type,
        newGameType: gameType
      });
      
      // Get player ratings before changes
      const players = await this.getPlayers();
      const player1 = players.find(p => p.id === match.player1_id);
      const player2 = players.find(p => p.id === match.player2_id);
      
      if (!player1 || !player2) {
        console.error(`[editCompletedMatch] Players not found. Player1: ${match.player1_id}, Player2: ${match.player2_id}`);
        console.error(`[editCompletedMatch] Available players:`, players.map(p => p.id));
        throw new Error('Players not found in database');
      }

      // If winner changed, reverse old rating changes and apply new ones
      if (oldWinnerId && oldWinnerId !== newWinnerId && oldWinnerId !== 'approved' && oldWinnerId !== 'completed') {
        console.log(`[editCompletedMatch] Winner changed from ${oldWinnerId} to ${newWinnerId}`);
        
        const oldLoserId = oldWinnerId === match.player1_id ? match.player2_id : match.player1_id;
        const newLoserId = newWinnerId === match.player1_id ? match.player2_id : match.player1_id;
        
        // Reverse old rating changes
        const oldWinner = players.find(p => p.id === oldWinnerId);
        const oldLoser = players.find(p => p.id === oldLoserId);
        
        if (!oldWinner || !oldLoser) {
          console.error(`[editCompletedMatch] Old winner/loser not found. OldWinner: ${oldWinnerId}, OldLoser: ${oldLoserId}`);
          console.error(`[editCompletedMatch] Available players:`, players.map(p => ({ id: p.id, nickname: p.nickname })));
          // If old winner/loser not found, just proceed with setting new winner without reversing
          console.warn(`[editCompletedMatch] Proceeding without reversing old ratings`);
          oldWinnerId = null; // Force to treat as no previous winner
        } else {
          // Get the old rating changes from match data (handle null/undefined)
          const oldWinnerRatingChange = match.player1_id === oldWinnerId 
            ? (match.player1_rating_change || 0) 
            : (match.player2_rating_change || 0);
          const oldLoserRatingChange = match.player1_id === oldLoserId 
            ? (match.player1_rating_change || 0) 
            : (match.player2_rating_change || 0);
          
          // Restore original ratings (subtract the changes)
          const oldWinnerOriginalRating = oldWinner.current_rating - oldWinnerRatingChange;
          const oldLoserOriginalRating = oldLoser.current_rating - oldLoserRatingChange;
          
          // Calculate new rating changes with swapped winner/loser
          const K = 32;
          // New winner was the old loser, new loser was the old winner
          const expectedNewWinner = 1 / (1 + Math.pow(10, (oldWinnerOriginalRating - oldLoserOriginalRating) / 400));
          const expectedNewLoser = 1 - expectedNewWinner;
          
          const newWinnerDelta = Math.round(K * (1 - expectedNewWinner));
          const newLoserDelta = Math.round(K * (0 - expectedNewLoser));
          
          // Apply new ratings (old loser is now winner, old winner is now loser)
          const newWinnerRating = oldLoserOriginalRating + newWinnerDelta;
          const newLoserRating = oldWinnerOriginalRating + newLoserDelta;
          
          // Update player ratings
          await this.updatePlayerRating(newWinnerId, newWinnerRating);
          await this.updatePlayerRating(newLoserId, newLoserRating);
        
          // Update match with new winner and rating changes (use matchRow from beginning)
          // 正しい列の順序: H=game_type, I=status, J=winner_id, K=result_details, L=created_at, M=completed_at, N=approved_at
          const updateRange = `TournamentMatches!H${matchRow}:N${matchRow}`;
          console.log(`[editCompletedMatch] Updating match at row ${matchRow} with new winner`);
            const newRatingChanges = {
              player1: match.player1_id === newWinnerId ? newWinnerDelta : newLoserDelta,
              player2: match.player2_id === newWinnerId ? newWinnerDelta : newLoserDelta
            };
            
            // result_detailsに評価変動を記録
            const resultDetails = `P1:${newRatingChanges.player1}, P2:${newRatingChanges.player2}`;
            
            await this.sheets.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: updateRange,
              valueInputOption: 'USER_ENTERED',
              requestBody: {
                values: [[
                  gameType,                     // H: game_type
                  'approved',                   // I: status
                  newWinnerId,                  // J: winner_id
                  resultDetails,                // K: result_details (rating changes)
                  match.created_at || '',       // L: created_at (preserve original)
                  match.completed_at || new Date().toISOString(),     // M: completed_at (preserve if exists)
                  new Date().toISOString()      // N: approved_at (update to now)
                ]]
              }
          });
          console.log(`[editCompletedMatch] Updated match winner from ${oldWinnerId} to ${newWinnerId}`);
        }
      } else if (!oldWinnerId && newWinnerId) {
        // No previous winner, just setting a new winner
        console.log(`[editCompletedMatch] Setting initial winner: ${newWinnerId}`);
        
        const newLoserId = newWinnerId === match.player1_id ? match.player2_id : match.player1_id;
        const winner = players.find(p => p.id === newWinnerId);
        const loser = players.find(p => p.id === newLoserId);
        
        if (!winner || !loser) {
          throw new Error('Winner or loser not found');
        }
        
        // Calculate rating changes
        const K = 32;
        const expectedWinner = 1 / (1 + Math.pow(10, (loser.current_rating - winner.current_rating) / 400));
        const expectedLoser = 1 - expectedWinner;
        
        const winnerDelta = Math.round(K * (1 - expectedWinner));
        const loserDelta = Math.round(K * (0 - expectedLoser));
        
        // Apply new ratings
        const newWinnerRating = winner.current_rating + winnerDelta;
        const newLoserRating = loser.current_rating + loserDelta;
        
        await this.updatePlayerRating(newWinnerId, newWinnerRating);
        await this.updatePlayerRating(newLoserId, newLoserRating);
        
        // Update match (use matchRow from beginning)
        console.log(`[editCompletedMatch] Setting initial winner at row ${matchRow}`);
        const updateRange = `TournamentMatches!H${matchRow}:N${matchRow}`;
          const ratingChanges = {
            player1: match.player1_id === newWinnerId ? winnerDelta : loserDelta,
            player2: match.player2_id === newWinnerId ? winnerDelta : loserDelta
          };
          const resultDetails = `P1:${ratingChanges.player1}, P2:${ratingChanges.player2}`;
          
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                gameType,          // H: game_type
                'approved',        // I: status  
                newWinnerId,       // J: winner_id
                resultDetails,     // K: result_details
                match.created_at || '',       // L: created_at (preserve original)
                match.completed_at || new Date().toISOString(),     // M: completed_at (preserve if exists)
                new Date().toISOString()      // N: approved_at
              ]]
            }
          });
          console.log(`[editCompletedMatch] Set initial winner: ${newWinnerId}`);
      } else {
        // Game type only changed (winner unchanged)
        console.log(`[editCompletedMatch] Updating game type only at row ${matchRow}`);
          // 正しい列の順序: H=game_type, I=status, J=winner_id
          const updateRange = `TournamentMatches!H${matchRow}:J${matchRow}`;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: updateRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              gameType,                     // H: game_type
              match.status || 'approved',   // I: status (preserve current status)
              newWinnerId || oldWinnerId || match.winner_id   // J: winner_id
            ]]
          }
        });
        console.log(`[editCompletedMatch] Updated game type from ${match.game_type} to ${gameType}`);
      }

      console.log(`[editCompletedMatch] Match ${matchId} edited successfully`);
      return { 
        success: true, 
        matchId,
        newWinnerId,
        gameType
      };
    } catch (error) {
      console.error('Error editing completed match:', error);
      throw new Error(`Failed to edit completed match: ${error.message}`);
    }
  }

  /**
   * Invalidate match (cancel match without rating changes)
   */
  async invalidateMatch(matchId, reason) {
    try {
      await this.authenticate();
      console.log(`[invalidateMatch] Invalidating match ${matchId} with reason: ${reason}`);

      // Get the match details
      const matches = await this.getTournamentMatches(null);
      const match = matches.find(m => m.match_id === matchId);
      
      if (!match) {
        console.error(`[invalidateMatch] Match not found: ${matchId}`);
        throw new Error(`Match not found: ${matchId}`);
      }
      
      console.log(`[invalidateMatch] Match found:`, {
        matchId: match.match_id,
        status: match.status,
        winner_id: match.winner_id,
        player1: match.player1_id,
        player2: match.player2_id
      });

      // If match was completed with rating changes, reverse them
      if ((match.status === 'completed' || match.status === 'approved') && match.winner_id) {
        const players = await this.getPlayers();
        const player1 = players.find(p => p.id === match.player1_id);
        const player2 = players.find(p => p.id === match.player2_id);
        
        if (player1 && player2) {
          // Get rating changes from match
          const player1RatingChange = match.player1_rating_change || 0;
          const player2RatingChange = match.player2_rating_change || 0;
          
          // Reverse rating changes if they exist
          if (player1RatingChange !== 0) {
            const originalRating1 = player1.current_rating - player1RatingChange;
            await this.updatePlayerRating(match.player1_id, originalRating1);
            console.log(`[invalidateMatch] Reversed rating for ${match.player1_id}: ${player1.current_rating} -> ${originalRating1}`);
          }
          
          if (player2RatingChange !== 0) {
            const originalRating2 = player2.current_rating - player2RatingChange;
            await this.updatePlayerRating(match.player2_id, originalRating2);
            console.log(`[invalidateMatch] Reversed rating for ${match.player2_id}: ${player2.current_rating} -> ${originalRating2}`);
          }
        }
      }

      // Update match status to invalidated
      const matchRow = await this.findMatchRow(matchId);
      if (matchRow) {
        // Update status and clear winner
        const updateRange = `TournamentMatches!I${matchRow}:K${matchRow}`;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: updateRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'invalidated',  // I: status
              '',             // J: winner_id (clear)
              reason || 'Admin invalidated'  // K: result_details
            ]]
          }
        });
        console.log(`[invalidateMatch] Match ${matchId} invalidated successfully`);
      }

      return { 
        success: true, 
        matchId,
        reason
      };
    } catch (error) {
      console.error('Error invalidating match:', error);
      throw new Error(`Failed to invalidate match: ${error.message}`);
    }
  }

  /**
   * Helper function to convert column index to letter (0=A, 1=B, etc)
   */
  _columnToLetter(index) {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  /**
   * Helper function to find match row in spreadsheet
   */
  async findMatchRow(matchId) {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'TournamentMatches!A:A'
    });
    
    const matchIds = response.data.values || [];
    for (let i = 0; i < matchIds.length; i++) {
      if (matchIds[i][0] === matchId) {
        return i + 1; // Spreadsheet rows are 1-indexed
      }
    }
    return null;
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