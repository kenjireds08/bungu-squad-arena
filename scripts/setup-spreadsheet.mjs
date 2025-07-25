import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Sheet configurations based on docs/020
const SHEET_CONFIGS = [
  {
    name: 'Players',
    headers: [
      'player_id', 'nickname', 'email', 'current_rating',
      'annual_wins', 'annual_losses', 'total_wins', 'total_losses',
      'champion_badges', 'trump_rule_experienced', 'first_trump_game_date',
      'cardplus_rule_experienced', 'first_cardplus_game_date', 'registration_date',
      'profile_image_url', 'is_active', 'last_activity_date',
      'player_status', 'notification_preferences', 'device_tokens',
      'last_login_date', 'profile_image_uploaded', 'preferred_language',
      'reserved_1', 'reserved_2', 'reserved_3'
    ]
  },
  {
    name: 'MatchResults',
    headers: [
      'match_id', 'tournament_id', 'player1_id', 'player2_id',
      'winner_id', 'loser_id', 'game_rule', 'match_start_time',
      'match_end_time', 'match_status', 'reported_by', 'reported_at',
      'approved_by', 'approved_at', 'player1_rating_before', 'player2_rating_before',
      'player1_rating_after', 'player2_rating_after', 'player1_rating_change', 'player2_rating_change',
      'is_proxy_input', 'proxy_reason', 'proxy_reason_detail', 'proxy_input_by',
      'notification_sent', 'is_first_time_rule', 'table_number',
      'notification_sent_at', 'reminder_sent_count', 'last_reminder_sent_at',
      'rating_calculation_method', 'notes', 'weather_condition', 'device_used'
    ]
  },
  {
    name: 'Tournaments',
    headers: [
      'tournament_id', 'tournament_name', 'date', 'start_time',
      'location', 'qr_code_url', 'created_by', 'created_at',
      'status', 'max_participants', 'current_participants', 'tournament_type'
    ]
  },
  {
    name: 'TournamentParticipants',
    headers: [
      'participation_id', 'tournament_id', 'player_id', 'joined_at',
      'table_number', 'bracket_position', 'entry_method',
      'payment_status', 'dietary_restrictions', 'emergency_contact', 'transportation_method'
    ]
  },
  {
    name: 'YearlyArchive',
    headers: [
      'archive_id', 'year', 'player_id', 'final_rating',
      'annual_rank', 'champion_badge', 'annual_wins', 'annual_losses', 'archived_at'
    ]
  },
  {
    name: 'CumulativeStats',
    headers: [
      'player_id', 'first_participation_date', 'total_matches', 'career_wins',
      'career_losses', 'win_rate', 'highest_rating', 'highest_rating_date',
      'participation_years', 'last_active_date', 'total_tournaments',
      'favorite_rule', 'average_match_duration', 'most_played_opponent_id',
      'longest_winning_streak', 'longest_losing_streak', 'rating_volatility'
    ]
  },
  {
    name: 'Notifications',
    headers: [
      'notification_id', 'recipient_player_id', 'notification_type', 'title',
      'message', 'sent_at', 'read_at', 'is_read',
      'action_url', 'priority'
    ]
  },
  {
    name: 'SystemSettings',
    headers: [
      'setting_key', 'setting_value', 'setting_type',
      'description', 'updated_at', 'updated_by'
    ]
  },
  {
    name: 'ErrorLogs',
    headers: [
      'error_id', 'player_id', 'error_type', 'error_message',
      'stack_trace', 'user_agent', 'timestamp', 'resolved_at', 'resolution_method'
    ]
  }
];

async function setupSpreadsheet() {
  try {
    console.log('🚀 スプレッドシート自動構築開始...\n');
    
    // Initialize auth
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Get current spreadsheet info
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    console.log('📊 現在のスプレッドシート:', spreadsheet.data.properties.title);
    
    // Delete existing sheets except the first one
    const existingSheets = spreadsheet.data.sheets;
    const firstSheetId = existingSheets[0].properties.sheetId;
    
    console.log('🗑️  既存シートをクリア中...');
    
    // Create batch update requests
    const requests = [];
    
    // Add all new sheets first
    SHEET_CONFIGS.forEach((config, index) => {
      requests.push({
        addSheet: {
          properties: {
            title: config.name,
            index: index,
            gridProperties: {
              rowCount: 1000,
              columnCount: config.headers.length,
              frozenRowCount: 1
            }
          }
        }
      });
    });
    
    // Delete the original sheet at the end
    requests.push({
      deleteSheet: {
        sheetId: firstSheetId
      }
    });
    
    // Execute batch update
    console.log('📝 9シートを作成中...');
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests }
    });
    
    console.log('✅ シート作成完了\n');
    
    // Add headers to each sheet
    console.log('📋 各シートにヘッダーを設定中...');
    
    for (const config of SHEET_CONFIGS) {
      // Handle columns beyond Z
      let endColumn;
      if (config.headers.length <= 26) {
        endColumn = String.fromCharCode(64 + config.headers.length);
      } else {
        const firstLetter = String.fromCharCode(64 + Math.floor((config.headers.length - 1) / 26));
        const secondLetter = String.fromCharCode(65 + ((config.headers.length - 1) % 26));
        endColumn = firstLetter + secondLetter;
      }
      
      const range = `${config.name}!A1:${endColumn}1`;
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values: [config.headers]
        }
      });
      console.log(`  ✅ ${config.name}: ${config.headers.length}列`);
    }
    
    // Format headers (bold, background color)
    console.log('\n🎨 ヘッダーのフォーマット設定中...');
    const formatRequests = [];
    
    const updatedSpreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    updatedSpreadsheet.data.sheets.forEach(sheet => {
      formatRequests.push({
        repeatCell: {
          range: {
            sheetId: sheet.properties.sheetId,
            startRowIndex: 0,
            endRowIndex: 1
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
              textFormat: { bold: true },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      });
    });
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: { requests: formatRequests }
    });
    
    console.log('✅ フォーマット設定完了\n');
    
    // Summary
    console.log('🎉 スプレッドシート構築完了！\n');
    console.log('📊 作成されたシート:');
    console.log('  - 基本データシート: 6シート');
    console.log('  - 運用支援シート: 3シート');
    console.log('  - 合計: 9シート・126列\n');
    console.log('🔗 スプレッドシートURL:');
    console.log(`   https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit\n`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('詳細:', error);
  }
}

// Execute
setupSpreadsheet();