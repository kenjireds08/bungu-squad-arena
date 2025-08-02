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

  async autoResetOldTournamentParticipation() {
    try {
      // Check if there are any active tournament players from previous days
      const today = new Date().toLocaleDateString('sv-SE'); // Use local date YYYY-MM-DD
      
      // Get current tournament data to check if there are any tournaments today
      const tournamentsResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Tournaments!A2:Z1000'
      });
      
      const tournamentRows = tournamentsResponse.data.values || [];
      
      // Check if we have any active players first
      let activePlayers = [];
      try {
        activePlayers = await this.getActiveTournamentPlayers();
        if (activePlayers.length === 0) {
          console.log('No active tournament players, skipping reset');
          return;
        }
      } catch (activePlayersError) {
        console.warn('Failed to get active players, skipping reset:', activePlayersError.message);
        return;
      }
      
      // Find the most recent tournament with active players
      const lastActiveTournament = tournamentRows
        .filter(row => row[2]) // Has date
        .sort((a, b) => new Date(b[2]).getTime() - new Date(a[2]).getTime()) // Sort by date descending
        .find(row => {
          // Check if any active player participated in this tournament
          return true; // For now, assume the last tournament is where they participated
        });
      
      if (lastActiveTournament && lastActiveTournament[2] !== today) {
        // The last tournament was not today, so reset all tournament_active flags
        console.log(`Last tournament was on ${lastActiveTournament[2]}, today is ${today}. Resetting all tournament_active flags`);
        await this.resetAllTournamentActive();
      } else if (!lastActiveTournament) {
        // No tournament found but players are active, reset them
        console.log('No tournament found but players are active, resetting all tournament_active flags');
        await this.resetAllTournamentActive();
      }
    } catch (error) {
      console.warn('Failed to auto-reset old tournament participation:', error.message);
      // Don't throw error, just log warning to prevent breaking getPlayers
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
      
      // Auto-reset tournament participation flags for new day
      // Temporarily disabled to prevent login issues
      // try {
      //   await this.autoResetOldTournamentParticipation();
      // } catch (resetError) {
      //   console.warn('Auto-reset failed, continuing with getPlayers:', resetError.message);
      //   // Continue with getPlayers even if reset fails
      // }
      
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
        tournament_active: row[23] === 'TRUE'
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        throw new Error('API rate limit exceeded. Please try again later.');
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
  }

  async getRankings() {
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
        throw new Error('API rate limit exceeded. Please try again later.');
      } else {
        throw new Error(`Failed to fetch tournaments data: ${error.message}`);
      }
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

  async deleteTournamentMatches(tournamentId) {
    await this.authenticate();
    
    try {
      // Get all data from TournamentMatches sheet
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:N'
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
        range: 'TournamentMatches!A:N'
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
    
    try {
      // Ensure tournament matches sheet exists
      await this.createTournamentMatchesSheet();
      
      // Try to delete existing matches for this tournament
      // If deletion fails, we'll continue with append (backward compatibility)
      try {
        await this.deleteTournamentMatches(tournamentId);
        console.log(`Existing matches deleted for tournament ${tournamentId}`);
      } catch (deleteError) {
        console.warn(`Failed to delete existing matches for ${tournamentId}, continuing with append:`, deleteError.message);
      }
      
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
      let response, matches = [];
      
      // Try TournamentMatches first
      try {
        response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentMatches!A2:N1000'
        });

        const rows = response.data.values || [];
        matches = rows
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
      } catch (tournamentError) {
        console.log('TournamentMatches not found, trying Matches sheet');
      }
      
      // If no matches found in TournamentMatches, try Matches sheet
      if (matches.length === 0) {
        try {
          response = await this.sheets.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: 'Matches!A:K'
          });

          const rows = response.data.values || [];
          if (rows.length > 1) {
            matches = rows
              .slice(1) // Skip header
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
                created_at: row[10] || ''
              }));
          }
        } catch (matchError) {
          console.error('Error fetching from Matches sheet:', matchError);
        }
      }

      // Get players for name resolution
      const players = await this.getPlayers();
      const playerMap = new Map(players.map(p => [p.id, p.nickname]));

      // Resolve player names if they are missing or show as IDs
      matches = matches.map(match => ({
        ...match,
        player1_name: playerMap.get(match.player1_id) || match.player1_name || match.player1_id,
        player2_name: playerMap.get(match.player2_id) || match.player2_name || match.player2_id,
      }));

      // Get rating changes for completed/approved matches
      for (let match of matches) {
        if (match.status === 'approved' || match.status === 'completed') {
          try {
            const ratingChanges = await this.getRatingHistoryForMatch(match.match_id);
            if (ratingChanges) {
              match.winner_rating_change = ratingChanges.winner_rating_change;
              match.loser_rating_change = ratingChanges.loser_rating_change;
            }
          } catch (error) {
            console.warn(`Failed to get rating changes for match ${match.match_id}:`, error.message);
          }
        }
      }

      return matches;
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

      // Only update ratings if this is not an invalid match
      const isInvalidMatch = matchData.player1_rating_change === 0 && matchData.player2_rating_change === 0 && 
                            matchData.player1_rating_after === matchData.player1_rating_before && 
                            matchData.player2_rating_after === matchData.player2_rating_before;
      
      if (!isInvalidMatch) {
        if (matchData.player1_rating_after) {
          await this.updatePlayerRating(matchData.player1_id, matchData.player1_rating_after);
        }
        if (matchData.player2_rating_after) {
          await this.updatePlayerRating(matchData.player2_id, matchData.player2_rating_after);
        }
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
        range: 'TournamentMatches!A2:N1000'
      });

      const rows = response.data.values || [];
      let matches = rows.map(row => {
        try {
          return {
            id: row[0] || '',                    // match_id
            tournament_id: row[1] || '',         // tournament_id  
            match_number: row[2] || '',          // match_number
            player1_id: row[3] || '',            // player1_id
            player1_name: row[4] || '',          // player1_name
            player2_id: row[5] || '',            // player2_id
            player2_name: row[6] || '',          // player2_name
            game_rule: row[7] || '',             // game_type
            match_status: row[8] || '',          // status
            winner_id: row[9] || '',             // winner_id
            result_details: row[10] || '',       // result_details
            match_start_time: row[11] || '',     // created_at
            match_end_time: row[12] || '',       // completed_at
            approved_at: row[13] || ''           // approved_at
          };
        } catch (error) {
          console.error('Error processing match row:', error, row);
          return null;
        }
      }).filter(match => match !== null);

      if (playerId) {
        matches = matches.filter(match => 
          match && (match.player1_id === playerId || match.player2_id === playerId)
        );
      }

      return matches.sort((a, b) => new Date(b.match_start_time) - new Date(a.match_start_time));
    } catch (error) {
      console.error('Error fetching match history:', error);
      throw new Error('Failed to fetch match history');
    }
  }

  async getAllMatches() {
    return this.getMatchHistory();
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

  // Match Results Management
  async submitMatchResult(resultData) {
    await this.authenticate();
    
    try {
      const resultId = `result_${Date.now()}_${resultData.playerId}`;
      
      // Ensure MatchResults sheet exists
      await this.createMatchResultsSheet();
      
      // Add match result record
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            resultId,
            resultData.matchId,
            resultData.playerId,
            resultData.opponentId,
            resultData.result,
            resultData.timestamp,
            resultData.status,
            '' // admin_notes
          ]]
        }
      });
      
      return resultId;
    } catch (error) {
      console.error('Error submitting match result:', error);
      throw new Error('Failed to submit match result');
    }
  }

  async getPendingMatchResults() {
    await this.authenticate();
    
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A2:H1000'
      });
      
      const rows = response.data.values || [];
      const pendingResults = rows
        .filter(row => row[6] === 'pending_approval') // status column
        .map(row => ({
          resultId: row[0],
          matchId: row[1],
          playerId: row[2],
          opponentId: row[3],
          result: row[4],
          timestamp: row[5],
          status: row[6],
          adminNotes: row[7] || ''
        }));
      
      // Skip player name resolution to avoid recursive API calls and 500 errors
      // Player names should be resolved on the frontend side
      
      // Return raw results without player name resolution
      return pendingResults;
    } catch (error) {
      console.error('Error getting pending match results:', error);
      throw new Error('Failed to get pending match results');
    }
  }

  async approveMatchResult(resultId, approved) {
    await this.authenticate();
    
    try {
      // Find the result row
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A2:H1000'
      });
      
      const rows = response.data.values || [];
      const resultRowIndex = rows.findIndex(row => row[0] === resultId);
      
      if (resultRowIndex === -1) {
        throw new Error('Match result not found');
      }
      
      const resultRow = rows[resultRowIndex];
      const actualRowNumber = resultRowIndex + 2; // +2 because array is 0-indexed and we skip header
      const newStatus = approved ? 'approved' : 'rejected';
      
      let ratingUpdateResult = null;
      
      if (approved) {
        // Update player ratings based on match result
        const playerId = resultRow[2];
        const opponentId = resultRow[3];
        const result = resultRow[4]; // 'win' or 'lose'
        
        ratingUpdateResult = await this.updatePlayersRating(playerId, opponentId, result);
      }
      
      // Update status
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `MatchResults!G${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[newStatus]] }
      });
      
      return {
        success: true,
        resultId,
        status: newStatus,
        message: approved ? '試合結果を承認しました' : '試合結果を却下しました',
        ratingUpdate: ratingUpdateResult
      };
    } catch (error) {
      console.error('Error approving match result:', error);
      throw new Error('Failed to approve match result');
    }
  }

  async updatePlayersRating(playerId, opponentId, result) {
    const RatingCalculator = require('./rating');
    const calculator = new RatingCalculator();
    
    try {
      // Get both players' current ratings
      const players = await this.getPlayers();
      const player = players.find(p => p.id === playerId);
      const opponent = players.find(p => p.id === opponentId);
      
      if (!player || !opponent) {
        throw new Error('Player not found');
      }
      
      // Determine winner and loser
      const isPlayerWinner = result === 'win';
      const winnerRating = isPlayerWinner ? player.current_rating : opponent.current_rating;
      const loserRating = isPlayerWinner ? opponent.current_rating : player.current_rating;
      
      // Calculate new ratings
      const ratingChanges = calculator.calculateBothPlayersRating(winnerRating, loserRating);
      
      // Prepare rating updates
      const playerNewRating = isPlayerWinner ? ratingChanges.winner.newRating : ratingChanges.loser.newRating;
      const opponentNewRating = isPlayerWinner ? ratingChanges.loser.newRating : ratingChanges.winner.newRating;
      
      // Update both players' ratings
      await this.updatePlayerRatingAndStats(playerId, playerNewRating, result === 'win');
      await this.updatePlayerRatingAndStats(opponentId, opponentNewRating, result === 'lose');
      
      // Record rating history
      await this.recordRatingHistory({
        playerId,
        opponentId,
        playerOldRating: player.current_rating,
        playerNewRating,
        opponentOldRating: opponent.current_rating,
        opponentNewRating,
        result,
        timestamp: new Date().toISOString()
      });
      
      return {
        player: {
          id: playerId,
          name: player.nickname,
          oldRating: player.current_rating,
          newRating: playerNewRating,
          ratingChange: playerNewRating - player.current_rating
        },
        opponent: {
          id: opponentId,
          name: opponent.nickname,
          oldRating: opponent.current_rating,
          newRating: opponentNewRating,
          ratingChange: opponentNewRating - opponent.current_rating
        }
      };
    } catch (error) {
      console.error('Error updating players rating:', error);
      throw new Error('Failed to update players rating');
    }
  }

  async updatePlayerRatingAndStats(playerId, newRating, isWin) {
    await this.authenticate();
    
    try {
      // Get players data
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:Z1000'
      });
      
      const rows = response.data.values || [];
      const playerRowIndex = rows.findIndex(row => row[0] === playerId);
      
      if (playerRowIndex === -1) {
        throw new Error('Player not found');
      }
      
      const actualRowNumber = playerRowIndex + 2;
      const playerRow = rows[playerRowIndex];
      
      // Current stats
      const currentWins = parseInt(playerRow[4]) || 0;
      const currentLosses = parseInt(playerRow[5]) || 0;
      const totalWins = parseInt(playerRow[6]) || 0;
      const totalLosses = parseInt(playerRow[7]) || 0;
      
      // New stats
      const newAnnualWins = isWin ? currentWins + 1 : currentWins;
      const newAnnualLosses = isWin ? currentLosses : currentLosses + 1;
      const newTotalWins = isWin ? totalWins + 1 : totalWins;
      const newTotalLosses = isWin ? totalLosses : totalLosses + 1;
      
      // Update multiple fields
      const updates = [
        {
          range: `Players!D${actualRowNumber}`, // current_rating
          values: [[newRating]]
        },
        {
          range: `Players!E${actualRowNumber}`, // annual_wins
          values: [[newAnnualWins]]
        },
        {
          range: `Players!F${actualRowNumber}`, // annual_losses
          values: [[newAnnualLosses]]
        },
        {
          range: `Players!G${actualRowNumber}`, // total_wins
          values: [[newTotalWins]]
        },
        {
          range: `Players!H${actualRowNumber}`, // total_losses
          values: [[newTotalLosses]]
        },
        {
          range: `Players!Q${actualRowNumber}`, // last_activity_date
          values: [[new Date().toLocaleDateString('sv-SE')]]
        }
      ];
      
      // Execute all updates
      await Promise.all(updates.map(update => 
        this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: update.range,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: update.values }
        })
      ));
      
      return { success: true };
    } catch (error) {
      console.error('Error updating player rating and stats:', error);
      throw new Error('Failed to update player rating and stats');
    }
  }

  async recordRatingHistory(historyData) {
    await this.authenticate();
    
    try {
      // Ensure RatingHistory sheet exists
      await this.createRatingHistorySheet();
      
      // Record the rating change
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'RatingHistory!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            `history_${Date.now()}`,
            historyData.playerId,
            historyData.opponentId,
            historyData.playerOldRating,
            historyData.playerNewRating,
            historyData.opponentOldRating,
            historyData.opponentNewRating,
            historyData.result,
            historyData.timestamp
          ]]
        }
      });
    } catch (error) {
      console.error('Error recording rating history:', error);
      // Don't throw error here - rating history is not critical
    }
  }

  async createRatingHistorySheet() {
    await this.authenticate();
    
    try {
      // Check if RatingHistory sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheetExists = spreadsheet.data.sheets.some(sheet => 
        sheet.properties.title === 'RatingHistory'
      );
      
      if (!sheetExists) {
        // Create RatingHistory sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'RatingHistory',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 9
                  }
                }
              }
            }]
          }
        });
        
        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'RatingHistory!A1:I1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'history_id',
              'player_id',
              'opponent_id',
              'player_old_rating',
              'player_new_rating',
              'opponent_old_rating',
              'opponent_new_rating',
              'result',
              'timestamp'
            ]]
          }
        });
      }
    } catch (error) {
      console.error('Error creating RatingHistory sheet:', error);
      throw new Error('Failed to create RatingHistory sheet');
    }
  }

  async adminDirectMatchResult(resultData) {
    await this.authenticate();
    
    try {
      const { matchId, winnerId, loserId, timestamp } = resultData;
      
      // Get player names for proper updates
      const players = await this.getPlayers();
      const playerMap = new Map(players.map(p => [p.id, p.nickname]));
      const winnerName = playerMap.get(winnerId) || winnerId;
      const loserName = playerMap.get(loserId) || loserId;
      
      // First update the TournamentMatches sheet with correct player names
      try {
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentMatches!A2:N1000'
        });
        
        const rows = response.data.values || [];
        const matchRowIndex = rows.findIndex(row => row[0] === matchId);
        
        if (matchRowIndex !== -1) {
          const actualRowNumber = matchRowIndex + 2;
          
          // Determine which player is player1 and which is player2
          const player1Id = rows[matchRowIndex][3];
          const player2Id = rows[matchRowIndex][5];
          
          if (player1Id !== winnerId && player1Id !== loserId) {
            // Update player1 info if it's incorrect
            await this.sheets.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `TournamentMatches!D${actualRowNumber}:E${actualRowNumber}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [[winnerId, winnerName]] }
            });
          }
          
          if (player2Id !== winnerId && player2Id !== loserId) {
            // Update player2 info if it's incorrect
            await this.sheets.spreadsheets.values.update({
              spreadsheetId: this.spreadsheetId,
              range: `TournamentMatches!F${actualRowNumber}:G${actualRowNumber}`,
              valueInputOption: 'USER_ENTERED',
              requestBody: { values: [[loserId, loserName]] }
            });
          }
        }
      } catch (updateError) {
        console.warn('Could not update player names in TournamentMatches:', updateError);
      }
      
      // Create result records for both players (already approved)
      const winnerResultId = `admin_${Date.now()}_${winnerId}`;
      const loserResultId = `admin_${Date.now()}_${loserId}`;
      
      // Ensure MatchResults sheet exists
      await this.createMatchResultsSheet();
      
      // Add both result records as approved
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'MatchResults!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [
            [
              winnerResultId,
              matchId,
              winnerId,
              loserId,
              'win',
              timestamp,
              'approved',
              'Admin direct input'
            ],
            [
              loserResultId,
              matchId,
              loserId,
              winnerId,
              'lose',
              timestamp,
              'approved',
              'Admin direct input'
            ]
          ]
        }
      });
      
      // Get match details to know the game type
      const matchResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A2:N1000'
      });
      const matchRows = matchResponse.data.values || [];
      const matchRow = matchRows.find(row => row[0] === matchId);
      const gameType = matchRow ? matchRow[6] : null; // game_type is in column G
      
      // Update game rule experience for both players
      if (gameType) {
        console.log(`Updating game experience: Winner ${winnerId}, Loser ${loserId}, GameType: ${gameType}`);
        await this.updatePlayerGameExperience(winnerId, gameType);
        await this.updatePlayerGameExperience(loserId, gameType);
      } else {
        console.warn(`No game type found for match ${matchId}`);
      }
      
      // Update player ratings immediately
      const ratingUpdateResult = await this.updatePlayersRating(winnerId, loserId, 'win');
      
      // Update match status to approved (admin direct input is immediately approved)
      await this.updateMatchStatus(matchId, 'approved', winnerId);
      
      return {
        success: true,
        winnerResultId,
        loserResultId,
        ratingUpdate: ratingUpdateResult
      };
    } catch (error) {
      console.error('Error with admin direct match result:', error);
      throw new Error('Failed to process admin direct match result');
    }
  }

  async updateMatchStatus(matchId, status, winnerId = null) {
    await this.authenticate();
    
    try {
      // Try TournamentMatches first, then fallback to Matches sheet
      let response, sheetName, statusColumn, winnerColumn, timestampColumn;
      
      try {
        response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'TournamentMatches!A2:Z1000'
        });
        
        const rows = response.data.values || [];
        const matchRowIndex = rows.findIndex(row => row[0] === matchId);
        
        if (matchRowIndex !== -1) {
          sheetName = 'TournamentMatches';
          statusColumn = 'I';  // match_status is actually in column I
          winnerColumn = 'J';  // winner_id is actually in column J
          timestampColumn = 'L'; // assuming completed_at is in column L
        } else {
          throw new Error('Match not found in TournamentMatches');
        }
      } catch (tournamentError) {
        // Fallback to Matches sheet
        response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: 'Matches!A:K'
        });
        
        const rows = response.data.values || [];
        const matchRowIndex = rows.findIndex((row, index) => 
          index > 0 && row[0] === matchId
        );
        
        if (matchRowIndex === -1) {
          throw new Error('Match not found in either TournamentMatches or Matches sheet');
        }
        
        sheetName = 'Matches';
        statusColumn = 'I'; // Status column in Matches sheet
        winnerColumn = 'J'; // Winner column in Matches sheet  
        timestampColumn = 'K'; // Timestamp column in Matches sheet
      }
      
      const rows = response.data.values || [];
      const matchRowIndex = rows.findIndex((row, index) => {
        if (sheetName === 'TournamentMatches') {
          return row[0] === matchId;
        } else {
          return index > 0 && row[0] === matchId;
        }
      });
      
      const actualRowNumber = sheetName === 'TournamentMatches' ? matchRowIndex + 2 : matchRowIndex + 1;
      
      // Update status
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!${statusColumn}${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[status]] }
      });
      
      // Update winner if provided
      if (winnerId) {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!${winnerColumn}${actualRowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[winnerId]] }
        });
      }
      
      // Update completed timestamp
      if (status === 'completed' || status === 'approved') {
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!${timestampColumn}${actualRowNumber}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[new Date().toISOString()]] }
        });
      }
      
      console.log(`Updated match ${matchId} status to '${status}' in ${sheetName} sheet`);
      return { success: true };
    } catch (error) {
      console.error('Error updating match status:', error);
      throw new Error('Failed to update match status');
    }
  }

  async createMatchResultsSheet() {
    await this.authenticate();
    
    try {
      // Check if MatchResults sheet exists
      const spreadsheet = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      const sheetExists = spreadsheet.data.sheets.some(sheet => 
        sheet.properties.title === 'MatchResults'
      );
      
      if (!sheetExists) {
        // Create MatchResults sheet
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{
              addSheet: {
                properties: {
                  title: 'MatchResults',
                  gridProperties: {
                    rowCount: 1000,
                    columnCount: 8
                  }
                }
              }
            }]
          }
        });
        
        // Add headers
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'MatchResults!A1:H1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              'result_id',
              'match_id', 
              'player_id',
              'opponent_id',
              'result',
              'timestamp',
              'status',
              'admin_notes'
            ]]
          }
        });
      }
    } catch (error) {
      console.error('Error creating MatchResults sheet:', error);
      throw new Error('Failed to create MatchResults sheet');
    }
  }

  async getRatingHistoryForMatch(matchId) {
    await this.authenticate();
    
    try {
      // Get match details to find the players involved
      const matchesResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A2:N1000'
      });
      
      const matchRows = matchesResponse.data.values || [];
      const matchRow = matchRows.find(row => row[0] === matchId);
      
      if (!matchRow) {
        throw new Error('Match not found');
      }
      
      const player1Id = matchRow[3];
      const player2Id = matchRow[5];
      const winnerId = matchRow[7];
      
      // Get rating history for this match
      const historyResponse = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'RatingHistory!A2:I1000'
      });
      
      const historyRows = historyResponse.data.values || [];
      
      // Find rating changes for both players related to this match
      // We'll look for entries with matching player IDs and approximate timestamp
      const matchTimestamp = matchRow[12] || matchRow[13]; // completed_at or approved_at
      
      let winnerRatingChange = null;
      let loserRatingChange = null;
      
      for (const row of historyRows) {
        const historyPlayerId = row[1];
        const historyOpponentId = row[2];
        const playerOldRating = parseInt(row[3]);
        const playerNewRating = parseInt(row[4]);
        const opponentOldRating = parseInt(row[5]);
        const opponentNewRating = parseInt(row[6]);
        const result = row[7];
        const timestamp = row[8];
        
        // Check if this history entry matches our match
        if ((historyPlayerId === player1Id && historyOpponentId === player2Id) ||
            (historyPlayerId === player2Id && historyOpponentId === player1Id)) {
          
          // Determine winner and loser rating changes
          if (historyPlayerId === winnerId) {
            // This player is the winner
            winnerRatingChange = playerNewRating - playerOldRating;
            loserRatingChange = opponentNewRating - opponentOldRating;
          } else {
            // The opponent is the winner
            winnerRatingChange = opponentNewRating - opponentOldRating;
            loserRatingChange = playerNewRating - playerOldRating;
          }
          break;
        }
      }
      
      return {
        match_id: matchId,
        winner_rating_change: winnerRatingChange,
        loser_rating_change: loserRatingChange
      };
      
    } catch (error) {
      console.error('Error getting rating history for match:', error);
      throw new Error('Failed to get rating history');
    }
  }

  async updatePlayerGameExperience(playerId, gameType) {
    await this.authenticate();
    
    console.log(`updatePlayerGameExperience called: playerId=${playerId}, gameType=${gameType}`);
    
    try {
      // Get all players to find the target player
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Players!A2:Z1000'
      });
      
      const rows = response.data.values || [];
      const playerRowIndex = rows.findIndex(row => row[0] === playerId);
      
      if (playerRowIndex === -1) {
        console.warn(`Player ${playerId} not found for game experience update. Available players:`, rows.map(row => row[0]).filter(Boolean));
        return;
      }
      
      const actualRowNumber = playerRowIndex + 2;
      const currentDate = new Date().toISOString().split('T')[0];
      
      if (gameType === 'trump') {
        // Check if already experienced
        const isExperienced = rows[playerRowIndex][9] === 'TRUE';
        if (!isExperienced) {
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
                  values: [[currentDate]]
                }
              ]
            }
          });
          console.log(`Updated trump experience for player ${playerId}`);
        }
      } else if (gameType === 'cardplus') {
        // Check if already experienced
        const isExperienced = rows[playerRowIndex][11] === 'TRUE';
        if (!isExperienced) {
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
                  values: [[currentDate]]
                }
              ]
            }
          });
          console.log(`Updated cardplus experience for player ${playerId}`);
        }
      }
    } catch (error) {
      console.error('Error updating player game experience:', error);
      // Don't throw error to prevent blocking the match result process
    }
  }

  async addSingleTournamentMatch(tournamentId, matchData) {
    await this.authenticate();
    
    try {
      // Ensure tournament matches sheet exists
      await this.createTournamentMatchesSheet();
      
      // Get existing matches to determine the next match number
      const existingMatches = await this.getTournamentMatches(tournamentId);
      const nextMatchNumber = existingMatches.length + 1;
      
      const timestamp = new Date().toISOString();
      const matchId = `${tournamentId}_${nextMatchNumber}`;
      
      const values = [[
        matchId,                          // A: match_id
        tournamentId,                     // B: tournament_id
        nextMatchNumber.toString(),       // C: match_number
        matchData.player1_id,             // D: player1_id
        matchData.player1_name,           // E: player1_name
        matchData.player2_id,             // F: player2_id
        matchData.player2_name,           // G: player2_name
        matchData.game_type,              // H: game_type
        'scheduled',                      // I: status
        '',                               // J: winner_id
        '',                               // K: result_details
        timestamp,                        // L: created_at
        '',                               // M: completed_at
        ''                                // N: approved_at
      ]];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'TournamentMatches!A:N',
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
}

module.exports = SheetsService;