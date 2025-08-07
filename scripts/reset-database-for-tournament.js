const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// IMPORTANT: This script will reset the database for the tournament
// Only preserving player_001, player_002, player_003 with reset stats

async function resetDatabase() {
  try {
    // Parse the service account key
    const keyString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.VITE_GOOGLE_SERVICE_ACCOUNT_KEY;
    if (!keyString) {
      throw new Error('Service account key not found in environment variables');
    }
    
    // Handle escaped newlines in the JSON string
    const cleanedKey = keyString.replace(/\\n/g, '\n');
    const serviceAccountKey = JSON.parse(cleanedKey);
    
    // Set up authentication
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || process.env.VITE_GOOGLE_SHEETS_ID;
    
    console.log('Starting database reset for tournament...');
    
    // 1. Reset Players sheet - Keep only 3 admins with reset stats
    console.log('1. Resetting Players sheet...');
    
    const adminPlayers = [
      ['player_001', 'ちーけん', 'kenji.reds08@gmail.com', '1200', '0', '0', '0', '0', '', 'FALSE', '', 'FALSE', '', '2024-01-15 10:30:00', '', 'true', '2025-08-08', 'active', '{}', '[]', '2025-08-08', 'false', 'ja', 'FALSE', 'TRUE'],
      ['player_002', 'ワラビサコ', 'mr.warabisako@gmail.com', '1200', '0', '0', '0', '0', '', 'FALSE', '', 'FALSE', '', '2023-05-20 14:20:00', '', 'true', '2025-08-08', 'active', '{}', '[]', '2025-08-08', 'false', 'ja', 'FALSE', 'TRUE'],
      ['player_003', 'ヨッスィーオ', 'yosshio@example.com', '1200', '0', '0', '0', '0', '', 'FALSE', '', 'FALSE', '', '2023-07-10 9:15:00', '', 'true', '2025-08-08', 'active', '{}', '[]', '2025-08-08', 'false', 'ja', 'FALSE', 'TRUE']
    ];
    
    // Get header row
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!1:1',
    });
    
    const headers = headerResponse.data.values[0];
    
    // Clear existing data (keep headers)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Players!A2:Z1000',
    });
    
    // Write admin players
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Players!A2:Y4',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: adminPlayers
      }
    });
    
    console.log('✓ Players sheet reset with 3 admin accounts');
    
    // 2. Clear Tournament History
    console.log('2. Clearing Tournament History...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Tournaments!A2:Z1000',
    });
    console.log('✓ Tournament history cleared');
    
    // 3. Clear Tournament Participants
    console.log('3. Clearing Tournament Participants...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'TournamentParticipants!A2:Z1000',
    });
    console.log('✓ Tournament participants cleared');
    
    // 4. Clear Tournament Matches
    console.log('4. Clearing Tournament Matches...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'TournamentMatches!A2:Z1000',
    });
    console.log('✓ Tournament matches cleared');
    
    // 5. Clear Match Results
    console.log('5. Clearing Match Results...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'MatchResults!A2:Z1000',
    });
    console.log('✓ Match results cleared');
    
    // 6. Clear Yearly Archive
    console.log('6. Clearing Yearly Archive...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'YearlyArchive!A2:Z1000',
    });
    console.log('✓ Yearly archive cleared');
    
    // 7. Clear Cumulative Stats
    console.log('7. Clearing Cumulative Stats...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'CumulativeStats!A2:Z1000',
    });
    console.log('✓ Cumulative stats cleared');
    
    // 8. Clear Tournament Daily Archive
    console.log('8. Clearing Tournament Daily Archive...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'TournamentDailyArchive!A2:Z1000',
    });
    console.log('✓ Tournament daily archive cleared');
    
    console.log('\n========================================');
    console.log('✅ DATABASE RESET COMPLETE!');
    console.log('========================================');
    console.log('Preserved accounts:');
    console.log('- player_001: ちーけん (Rating: 1200)');
    console.log('- player_002: ワラビサコ (Rating: 1200)');
    console.log('- player_003: ヨッスィーオ (Rating: 1200)');
    console.log('\nAll histories and badges have been cleared.');
    console.log('Ready for the tournament!');
    
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will reset the entire database!');
console.log('Only player_001, player_002, player_003 will be preserved with reset stats.');
console.log('All tournament history, match history, and badges will be cleared.');
console.log('');

rl.question('Are you sure you want to continue? Type "YES" to confirm: ', (answer) => {
  if (answer === 'YES') {
    resetDatabase().then(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('Reset cancelled.');
    rl.close();
    process.exit(0);
  }
});