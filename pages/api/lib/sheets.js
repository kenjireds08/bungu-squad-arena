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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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

  async createTournament(tournamentData) {
    await this.authenticate();
    
    try {
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
        tournamentData.tournament_type || 'random' // L: tournament_type
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A:L',
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
      // Get current tournament data to find the row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A:L'
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

      // Delete the row by clearing it and then removing empty rows
      const actualRowNumber = tournamentRowIndex + 1; // +1 because findIndex includes the header
      
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId: 0, // Assuming tournaments is the first sheet
                dimension: 'ROWS',
                startIndex: actualRowNumber - 1, // 0-indexed for batch update
                endIndex: actualRowNumber
              }
            }
          }]
        }
      });

      console.log(`Tournament deleted: ${tournamentId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw new Error(`Failed to delete tournament: ${error.message}`);
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

  async createTournamentMatchesSheet() {
    await this.authenticate();
    
    try {
      // Get spreadsheet metadata to check if sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      // Check if TournamentMatches sheet already exists
      const sheetExists = spreadsheet.data.sheets.some(
        sheet => sheet.properties.title === 'TournamentMatches'
      );

      if (sheetExists) {
        console.log('TournamentMatches sheet already exists');
        return { success: true, message: 'Sheet already exists' };
      }

      // Create the sheet
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: {
                title: 'TournamentMatches',
                gridProperties: {
                  rowCount: 1000,
                  columnCount: 26 // A-Z columns
                }
              }
            }
          }]
        }
      });

      // Add headers
      const headers = [
        'match_id',           // A
        'tournament_id',      // B
        'player1_id',         // C
        'player2_id',         // D
        'table_number',       // E
        'match_status',       // F
        'created_at',         // G
        'winner_id',          // H
        'loser_id',           // I
        'match_start_time',   // J
        'match_end_time',     // K
        'reported_by',        // L
        'reported_at',        // M
        'approved_by',        // N
        'approved_at',        // O
        'player1_rating_before', // P
        'player2_rating_before', // Q
        'player1_rating_after',  // R
        'player2_rating_after',  // S
        'player1_rating_change', // T
        'player2_rating_change', // U
        'notes',              // V
        'created_by'          // W
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A1:W1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });

      console.log('TournamentMatches sheet created successfully');
      return { 
        success: true, 
        message: 'TournamentMatches sheet created with headers',
        sheetName: 'TournamentMatches',
        columnCount: headers.length
      };
    } catch (error) {
      console.error('Error creating TournamentMatches sheet:', error);
      throw new Error(`Failed to create TournamentMatches sheet: ${error.message}`);
    }
  }

  async saveTournamentMatches(tournamentId, matches) {
    await this.authenticate();
    
    try {
      const timestamp = new Date().toISOString();
      
      // Create entries for each match
      const matchEntries = matches.map((match, index) => [
        `tournament_match_${tournamentId}_${Date.now()}_${index}`, // match_id
        tournamentId, // tournament_id
        match.player1.id, // player1_id
        match.player2.id, // player2_id
        match.tableNumber, // table_number
        'pending', // match_status
        timestamp, // created_at
        '', // winner_id (empty initially)
        '', // loser_id (empty initially)
        '', // match_start_time (empty initially)
        '', // match_end_time (empty initially)
        '', // reported_by (empty initially)
        '', // reported_at (empty initially)
        '', // approved_by (empty initially)
        '', // approved_at (empty initially)
        match.player1.current_rating, // player1_rating_before
        match.player2.current_rating, // player2_rating_before
        '', // player1_rating_after (empty initially)
        '', // player2_rating_after (empty initially)
        '', // player1_rating_change (empty initially)
        '', // player2_rating_change (empty initially)
        '', // notes (empty initially)
        'system' // created_by
      ]);

      // Save to TournamentMatches sheet
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:W',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: matchEntries
        }
      });

      console.log(`Saved ${matches.length} tournament matches for tournament ${tournamentId}`);
      return { 
        success: true, 
        matchCount: matches.length, 
        tournamentId 
      };
    } catch (error) {
      console.error('Error saving tournament matches:', error);
      throw new Error(`Failed to save tournament matches: ${error.message}`);
    }
  }

  async submitMatchResult(resultData) {
    await this.authenticate();
    
    try {
      const { match_id, reporter_id, result, notes, reported_at } = resultData;
      
      // First, get the match details from TournamentMatches
      const matchesResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:W'
      });

      const matchRows = matchesResponse.data.values || [];
      const matchRowIndex = matchRows.findIndex(row => row[0] === match_id);
      
      if (matchRowIndex === -1) {
        throw new Error('Match not found');
      }

      const matchRow = matchRows[matchRowIndex];
      const player1_id = matchRow[2];
      const player2_id = matchRow[3];
      
      // Determine winner and loser based on reporter and result
      let winner_id, loser_id;
      if (result === 'win') {
        winner_id = reporter_id;
        loser_id = reporter_id === player1_id ? player2_id : player1_id;
      } else {
        loser_id = reporter_id;
        winner_id = reporter_id === player1_id ? player2_id : player1_id;
      }

      // Update the match with result information
      const updateRange = `TournamentMatches!H${matchRowIndex + 1}:M${matchRowIndex + 1}`;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: updateRange,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            winner_id,     // H: winner_id
            loser_id,      // I: loser_id
            reported_at,   // J: match_start_time (using reported time as proxy)
            reported_at,   // K: match_end_time
            reporter_id,   // L: reported_by
            reported_at    // M: reported_at
          ]]
        }
      });

      // Update match status to 'pending_approval'
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `TournamentMatches!F${matchRowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['pending_approval']]
        }
      });

      // Add notes if provided
      if (notes) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `TournamentMatches!V${matchRowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[notes]]
          }
        });
      }

      console.log(`Match result submitted for match ${match_id} by ${reporter_id}`);
      return { 
        success: true, 
        match_id,
        status: 'pending_approval',
        winner_id,
        loser_id
      };
    } catch (error) {
      console.error('Error submitting match result:', error);
      throw new Error(`Failed to submit match result: ${error.message}`);
    }
  }

  async getPendingMatchResults() {
    await this.authenticate();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:W'
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return []; // No data rows (only header)

      // Filter for pending approval matches
      const pendingMatches = rows.slice(1).filter(row => row[5] === 'pending_approval');

      // Get player details for each match
      const players = await this.getPlayers();
      
      const pendingResults = pendingMatches.map(row => ({
        match_id: row[0],
        tournament_id: row[1],
        player1_id: row[2],
        player2_id: row[3],
        player1_name: players.find(p => p.id === row[2])?.nickname || 'Unknown',
        player2_name: players.find(p => p.id === row[3])?.nickname || 'Unknown',
        table_number: parseInt(row[4]) || 0,
        match_status: row[5],
        created_at: row[6],
        winner_id: row[7],
        loser_id: row[8],
        match_start_time: row[9],
        match_end_time: row[10],
        reported_by: row[11],
        reported_at: row[12],
        player1_rating_before: parseInt(row[15]) || 0,
        player2_rating_before: parseInt(row[16]) || 0,
        notes: row[21] || ''
      }));

      return pendingResults.sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at));
    } catch (error) {
      console.error('Error getting pending match results:', error);
      throw new Error(`Failed to get pending match results: ${error.message}`);
    }
  }

  async approveMatchResult(approvalData) {
    await this.authenticate();
    
    try {
      const { match_id, action, approved_by, approved_at } = approvalData;
      
      // Get the match details
      const matchesResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:W'
      });

      const matchRows = matchesResponse.data.values || [];
      const matchRowIndex = matchRows.findIndex(row => row[0] === match_id);
      
      if (matchRowIndex === -1) {
        throw new Error('Match not found');
      }

      const matchRow = matchRows[matchRowIndex];
      
      if (action === 'approve') {
        // Calculate new ratings using ELO system
        const player1_id = matchRow[2];
        const player2_id = matchRow[3];
        const winner_id = matchRow[7];
        const player1_rating_before = parseInt(matchRow[15]) || 1500;
        const player2_rating_before = parseInt(matchRow[16]) || 1500;
        
        // Determine who won for ELO calculation
        const player1Won = winner_id === player1_id;
        const eloResult = this.calculateEloRating(
          player1_rating_before,
          player2_rating_before,
          player1Won ? 'win' : 'loss'
        );

        // Update match with approval and new ratings
        const updateRange = `TournamentMatches!F${matchRowIndex + 1}:U${matchRowIndex + 1}`;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: updateRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'completed',                    // F: match_status
              matchRow[6],                    // G: created_at (keep original)
              matchRow[7],                    // H: winner_id (keep)
              matchRow[8],                    // I: loser_id (keep)
              matchRow[9],                    // J: match_start_time (keep)
              matchRow[10],                   // K: match_end_time (keep)
              matchRow[11],                   // L: reported_by (keep)
              matchRow[12],                   // M: reported_at (keep)
              approved_by,                    // N: approved_by
              approved_at,                    // O: approved_at
              player1_rating_before,          // P: player1_rating_before (keep)
              player2_rating_before,          // Q: player2_rating_before (keep)
              eloResult.player1NewRating,     // R: player1_rating_after
              eloResult.player2NewRating,     // S: player2_rating_after
              eloResult.player1,              // T: player1_rating_change
              eloResult.player2               // U: player2_rating_change
            ]]
          }
        });

        // Update player ratings in Players sheet
        await this.updatePlayerRating(player1_id, eloResult.player1NewRating);
        await this.updatePlayerRating(player2_id, eloResult.player2NewRating);

        // Add to MatchResults sheet for historical record
        await this.addMatchResult({
          tournament_id: matchRow[1],
          player1_id,
          player2_id,
          winner_id,
          loser_id: matchRow[8],
          game_rule: 'trump',
          match_end_time: approved_at,
          reported_by: matchRow[11],
          approved_by,
          approved_at,
          player1_rating_before,
          player2_rating_before,
          player1_rating_after: eloResult.player1NewRating,
          player2_rating_after: eloResult.player2NewRating,
          player1_rating_change: eloResult.player1,
          player2_rating_change: eloResult.player2,
          table_number: matchRow[4],
          notes: matchRow[21] || ''
        });

        console.log(`Match ${match_id} approved and ratings updated`);
        return { 
          success: true, 
          match_id,
          status: 'completed',
          player1_new_rating: eloResult.player1NewRating,
          player2_new_rating: eloResult.player2NewRating,
          rating_changes: {
            player1: eloResult.player1,
            player2: eloResult.player2
          }
        };

      } else if (action === 'reject') {
        // Update match status to rejected
        const updateRange = `TournamentMatches!F${matchRowIndex + 1}:O${matchRowIndex + 1}`;
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: updateRange,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'rejected',    // F: match_status
              matchRow[6],   // G: created_at (keep)
              '',            // H: winner_id (clear)
              '',            // I: loser_id (clear)
              matchRow[9],   // J: match_start_time (keep)
              matchRow[10],  // K: match_end_time (keep)
              matchRow[11],  // L: reported_by (keep)
              matchRow[12],  // M: reported_at (keep)
              approved_by,   // N: approved_by
              approved_at    // O: approved_at
            ]]
          }
        });

        console.log(`Match ${match_id} rejected`);
        return { 
          success: true, 
          match_id,
          status: 'rejected'
        };
      }
    } catch (error) {
      console.error('Error approving match result:', error);
      throw new Error(`Failed to approve match result: ${error.message}`);
    }
  }

  async addPlayer(playerData) {
    await this.authenticate();
    
    try {
      // Prepare the row data according to Players sheet structure
      const playerRow = [
        playerData.id,                           // A: id
        playerData.nickname,                     // B: nickname
        playerData.email,                        // C: email
        playerData.current_rating,               // D: current_rating
        0,                                       // E: annual_wins
        0,                                       // F: annual_losses
        0,                                       // G: total_wins
        0,                                       // H: total_losses
        '',                                      // I: champion_badges
        'FALSE',                                 // J: trump_rule_experienced
        '',                                      // K: first_trump_game_date
        'FALSE',                                 // L: cardplus_rule_experienced
        '',                                      // M: first_cardplus_game_date
        'FALSE',                                 // N: first_victory_achieved
        '',                                      // O: first_victory_date
        'FALSE',                                 // P: win_rate_50_achieved
        '',                                      // Q: win_rate_50_date
        'FALSE',                                 // R: rating_1600_achieved
        '',                                      // S: rating_1600_date
        '',                                      // T: last_match_opponent
        '',                                      // U: last_match_result
        '',                                      // V: last_match_date
        playerData.created_at,                   // W: created_at
        playerData.tournament_active ? 'TRUE' : 'FALSE'  // X: tournament_active
      ];

      // Find the next empty row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A:A'
      });

      const rows = response.data.values || [];
      const nextRow = rows.length + 1;
      const range = `Players!A${nextRow}:X${nextRow}`;

      // Add the new player
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: range,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [playerRow]
        }
      });

      console.log(`New player added: ${playerData.nickname} (${playerData.id})`);
      return { success: true, playerId: playerData.id, row: nextRow };

    } catch (error) {
      console.error('Error adding player:', error);
      throw new Error(`Failed to add player: ${error.message}`);
    }
  }

  async createTournamentDailyArchiveSheet() {
    await this.authenticate();
    
    try {
      // Check if the sheet already exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const existingSheet = spreadsheet.data.sheets.find(
        sheet => sheet.properties.title === 'TournamentDailyArchive'
      );

      if (existingSheet) {
        console.log('TournamentDailyArchive sheet already exists');
        return { success: true, message: 'Sheet already exists', sheetId: existingSheet.properties.sheetId };
      }

      // Create the new sheet
      const response = await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: 'TournamentDailyArchive',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 10
                  }
                }
              }
            }
          ]
        }
      });

      const sheetId = response.data.replies[0].addSheet.properties.sheetId;

      // Add headers
      const headers = [
        'archive_id',
        'tournament_date', 
        'player_id',
        'player_nickname',
        'entry_timestamp',
        'total_participants_that_day',
        'created_at'
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentDailyArchive!A1:G1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });

      console.log('TournamentDailyArchive sheet created successfully');
      return { success: true, message: 'Sheet created successfully', sheetId };

    } catch (error) {
      console.error('Error creating TournamentDailyArchive sheet:', error);
      throw new Error('Failed to create TournamentDailyArchive sheet: ' + error.message);
    }
  }
}

module.exports = SheetsService;