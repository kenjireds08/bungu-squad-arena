require('dotenv').config({ path: '.env.local' });
const SheetsService = require('../api/lib/sheets');

async function checkSheetData() {
  try {
    const sheetsService = new SheetsService();
    await sheetsService.authenticate();
    
    console.log('Checking TournamentMatches sheet structure...\n');
    
    // Get headers
    const headersResponse = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'TournamentMatches!1:1'
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    console.log('Headers:');
    headers.forEach((header, index) => {
      const letter = String.fromCharCode(65 + index);
      console.log(`  ${letter} (${index}): ${header}`);
    });
    
    console.log('\n\nChecking problematic matches...');
    
    // Get all matches
    const matchesResponse = await sheetsService.sheets.spreadsheets.values.get({
      spreadsheetId: sheetsService.spreadsheetId,
      range: 'TournamentMatches!A:Z'
    });
    
    const rows = matchesResponse.data.values || [];
    
    // Find winner_id column index
    const winnerIdIndex = headers.indexOf('winner_id');
    console.log(`\nwinner_id column index: ${winnerIdIndex}`);
    
    // Check for matches with bad winner_id values
    for (let i = 1; i < rows.length && i < 10; i++) {
      const row = rows[i];
      const matchId = row[0];
      const winnerId = row[winnerIdIndex];
      if (winnerId === 'approved' || winnerId === 'completed') {
        console.log(`\n⚠️ Match ${matchId} has bad winner_id: "${winnerId}"`);
        console.log('  Full row data:');
        row.forEach((cell, idx) => {
          if (cell && headers[idx]) {
            console.log(`    ${headers[idx]}: ${cell}`);
          }
        });
      }
    }
    
    console.log('\n\nChecking Players sheet...');
    const players = await sheetsService.getPlayers();
    console.log(`Total players: ${players.length}`);
    
    // Find ちーけん
    const chiken = players.find(p => p.nickname === 'ちーけん');
    if (chiken) {
      console.log(`\nちーけん's data:`);
      console.log(`  ID: ${chiken.id}`);
      console.log(`  Current Rating: ${chiken.current_rating}`);
      console.log(`  Total Matches: ${chiken.total_matches}`);
      console.log(`  Wins: ${chiken.wins}`);
      console.log(`  Losses: ${chiken.losses}`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSheetData();