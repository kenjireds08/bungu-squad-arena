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
    await this.authenticate();
    
    try {
      // Ensure the sheet has the correct structure
      await this.ensureTournamentSheetStructure();
      
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
      throw new Error(`Failed to fetch tournaments data: ${error.message}`);
    }
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
      return { success: true };
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw new Error(`Failed to delete tournament: ${error.message}`);
    }
  }

  async saveTournamentMatches(tournamentId, matches) {
    await this.authenticate();
    
    try {
      // Ensure tournament matches sheet exists
      await this.createTournamentMatchesSheet();
      
      const timestamp = new Date().toISOString();
      const values = matches.map(match => [
        `${tournamentId}_${match.id}`,    // A: match_id (tournament_id + match_id)
        tournamentId,                      // B: tournament_id
        match.id,                         // C: match_number
        match.player1.id,                 // D: player1_id
        match.player1.nickname,           // E: player1_name
        match.player2.id,                 // F: player2_id
        match.player2.nickname,           // G: player2_name
        match.gameType,                   // H: game_type
        'scheduled',                      // I: status (scheduled, in_progress, completed, approved)
        '',                              // J: winner_id
        '',                              // K: result_details
        timestamp,                       // L: created_at
        '',                              // M: completed_at
        ''                               // N: approved_at
      ]);

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:N',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values
        }
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
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A2:N1000'
      });

      const rows = response.data.values || [];
      const matches = rows
        .filter(row => row[1] === tournamentId) // Filter by tournament_id
        .map((row) => ({
          match_id: row[0] || '',
          tournament_id: row[1] || '',
          match_number: row[2] || '',
          player1_id: row[3] || '',
          player1_name: row[4] || '',
          player2_id: row[5] || '',
          player2_name: row[6] || '',
          game_type: row[7] || 'trump',
          status: row[8] || 'scheduled',
          winner_id: row[9] || '',
          result_details: row[10] || '',
          created_at: row[11] || '',
          completed_at: row[12] || '',
          approved_at: row[13] || ''
        }));

      // Get player data to populate names if missing
      const players = await this.getPlayers();
      const playerMap = new Map(players.map(p => [p.id, p.nickname]));

      // Enhance matches with correct player names
      const enhancedMatches = matches.map(match => ({
        ...match,
        player1_name: match.player1_name || playerMap.get(match.player1_id) || match.player1_id,
        player2_name: match.player2_name || playerMap.get(match.player2_id) || match.player2_id
      }));

      return enhancedMatches;
    } catch (error) {
      console.error('Error fetching tournament matches:', error);
      throw new Error(`Failed to fetch tournament matches: ${error.message}`);
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

  async updatePlayerRuleExperience(playerId, gameType) {
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

      const actualRowNumber = rowIndex + 2;
      const timestamp = new Date().toISOString();
      
      if (gameType === 'trump') {
        // Update trump_rule_experienced (column J) and first_trump_game_date (column K)
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `Players!J${actualRowNumber}`,
                values: [['TRUE']]
              },
              {
                range: `Players!K${actualRowNumber}`,
                values: [[timestamp]]
              }
            ]
          }
        });
      } else if (gameType === 'cardplus') {
        // Update cardplus_rule_experienced (column L) and first_cardplus_game_date (column M)
        await this.sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: [
              {
                range: `Players!L${actualRowNumber}`,
                values: [['TRUE']]
              },
              {
                range: `Players!M${actualRowNumber}`,
                values: [[timestamp]]
              }
            ]
          }
        });
      }

      console.log(`Updated ${gameType} rule experience for player: ${playerId}`);
      return { success: true, playerId, gameType };
    } catch (error) {
      console.error('Error updating player rule experience:', error);
      throw new Error('Failed to update player rule experience');
    }
  }

  async updateMatchResult(matchId, updateData) {
    await this.authenticate();
    
    try {
      // Find the match row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A2:N1000'
      });

      const rows = response.data.values || [];
      const matchRowIndex = rows.findIndex(row => row[0] === matchId);
      
      if (matchRowIndex === -1) {
        throw new Error('Match not found');
      }

      const actualRowNumber = matchRowIndex + 2;
      const timestamp = new Date().toISOString();
      
      // Update match status and results
      const updatePromises = [];
      
      if (updateData.winner_id !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `TournamentMatches!J${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.winner_id]] }
          })
        );
      }
      
      if (updateData.status !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `TournamentMatches!I${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.status]] }
          })
        );
      }
      
      if (updateData.result_details !== undefined) {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `TournamentMatches!K${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[updateData.result_details]] }
          })
        );
      }
      
      // Update completed_at timestamp when match is completed
      if (updateData.status === 'completed') {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `TournamentMatches!M${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[timestamp]] }
          })
        );
      }
      
      // Update approved_at timestamp when match is approved
      if (updateData.status === 'approved') {
        updatePromises.push(
          this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `TournamentMatches!N${actualRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [[timestamp]] }
          })
        );
      }

      await Promise.all(updatePromises);

      // If match is completed, update rule experience for both players
      if (updateData.status === 'completed') {
        const match = rows[matchRowIndex];
        const gameType = match[7]; // game_type column
        const player1Id = match[3];
        const player2Id = match[5];
        
        // Update rule experience for both players
        await Promise.all([
          this.updatePlayerRuleExperience(player1Id, gameType),
          this.updatePlayerRuleExperience(player2Id, gameType)
        ]);
      }

      console.log(`Match updated: ${matchId}`);
      return { success: true, matchId };
    } catch (error) {
      console.error('Error updating match result:', error);
      throw new Error(`Failed to update match result: ${error.message}`);
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
        
        // Check if this was the last match and handle tournament completion
        const tournamentProgress = await this.checkTournamentProgress(matchRow[1]);
        
        return { 
          success: true, 
          match_id,
          status: 'completed',
          player1_new_rating: eloResult.player1NewRating,
          player2_new_rating: eloResult.player2NewRating,
          rating_changes: {
            player1: eloResult.player1,
            player2: eloResult.player2
          },
          tournament_progress: tournamentProgress
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

  async checkTournamentProgress(tournamentId) {
    await this.authenticate();
    
    try {
      // Get all matches for this tournament
      const allMatches = await this.getTournamentMatches(tournamentId);
      
      if (allMatches.length === 0) {
        return { 
          status: 'no_matches',
          completed_matches: 0,
          total_matches: 0,
          next_matches: []
        };
      }

      // Count completed matches
      const completedMatches = allMatches.filter(match => match.status === 'completed').length;
      const totalMatches = allMatches.length;
      
      // Find next available matches (scheduled status)
      const nextMatches = allMatches.filter(match => match.status === 'scheduled');
      
      // Check if tournament is completed
      const isCompleted = completedMatches === totalMatches;
      
      if (isCompleted) {
        // Tournament is completed, trigger completion process
        await this.completeTournament(tournamentId);
        return {
          status: 'completed',
          completed_matches: completedMatches,
          total_matches: totalMatches,
          next_matches: []
        };
      }
      
      return {
        status: 'in_progress',
        completed_matches: completedMatches,
        total_matches: totalMatches,
        next_matches: nextMatches.slice(0, 2) // Return next 2 available matches
      };
      
    } catch (error) {
      console.error('Error checking tournament progress:', error);
      throw new Error(`Failed to check tournament progress: ${error.message}`);
    }
  }

  async completeTournament(tournamentId) {
    await this.authenticate();
    
    try {
      // Update tournament status to completed
      const tournamentsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A:M'
      });

      const tournamentRows = tournamentsResponse.data.values || [];
      const tournamentRowIndex = tournamentRows.findIndex(row => row[0] === tournamentId);
      
      if (tournamentRowIndex !== -1) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Tournaments!I${tournamentRowIndex + 1}`, // Status column
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['completed']]
          }
        });

        // Set completion timestamp
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `Tournaments!M${tournamentRowIndex + 1}`, // Completed_at column
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[new Date().toISOString()]]
          }
        });

        console.log(`Tournament ${tournamentId} marked as completed`);
      }
      
      return { success: true, tournament_id: tournamentId, status: 'completed' };
    } catch (error) {
      console.error('Error completing tournament:', error);
      throw new Error(`Failed to complete tournament: ${error.message}`);
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
        playerData.registration_date || playerData.created_at || '', // N: registration_date
        '',                                      // O: profile_image_url
        'TRUE',                                  // P: is_active
        '',                                      // Q: last_activity_date
        'active',                                // R: player_status
        '{}',                                    // S: notification_preferences
        '[]',                                    // T: device_tokens
        playerData.last_login || playerData.created_at || '', // U: last_login
        'FALSE',                                 // V: profile_image_uploaded
        'ja',                                    // W: preferred_language
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

  async deletePlayer(playerId) {
    await this.authenticate();
    
    try {
      console.log('Deleting player:', playerId);
      
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

      const actualRowNumber = rowIndex + 2; // +2 because array is 0-indexed and we skip header
      console.log('Deleting player from row:', actualRowNumber);

      // Get the Players sheet ID
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });

      const playersSheet = spreadsheet.data.sheets.find(
        sheet => sheet.properties.title === 'Players'
      );

      if (!playersSheet) {
        throw new Error('Players sheet not found');
      }

      const sheetId = playersSheet.properties.sheetId;

      // Delete the row
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

      console.log('Player deleted successfully:', playerId);
      return { success: true, playerId };
    } catch (error) {
      console.error('Error deleting player:', error);
      throw new Error('Failed to delete player: ' + error.message);
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

  async deleteMatch(matchId) {
    await this.authenticate();
    
    try {
      // First check if the match exists and hasn't started
      const matchesResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A2:Z1000'
      });

      const matches = matchesResponse.data.values || [];
      const matchIndex = matches.findIndex(row => row[0] === matchId);
      
      if (matchIndex === -1) {
        throw new Error('Match not found');
      }

      const match = matches[matchIndex];
      const matchStatus = match[9]; // status column
      
      // Only allow deletion of scheduled matches
      if (matchStatus !== 'scheduled') {
        throw new Error('Cannot delete match that has already started');
      }

      // Delete the match by clearing the row
      const rowNumber = matchIndex + 2; // +2 because of header row and 0-indexing
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.spreadsheetId,
        range: `TournamentMatches!A${rowNumber}:Z${rowNumber}`
      });

      console.log(`Match deleted: ${matchId}`);
      return { success: true, matchId };
    } catch (error) {
      console.error('Error deleting match:', error);
      throw new Error(`Failed to delete match: ${error.message}`);
    }
  }
}

module.exports = SheetsService;