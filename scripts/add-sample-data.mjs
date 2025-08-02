import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

// Sample data for testing
const SAMPLE_DATA = {
  Players: [
    ['player_001', 'ちーけん', 'chiken@example.com', 1650, 12, 8, 45, 23, '⭐', true, '2024-03-15', true, '2024-06-01', '2024-01-15 10:30:00', '', true, '2024-07-25 20:00:00', 'active', '{"match_start": true, "result_pending": true}', '[]', '2024-07-25 18:45:00', true, 'ja', '', '', ''],
    ['player_002', 'ワラビサコ', 'mr.warabisako@gmail.com', 1850, 25, 15, 68, 32, '★,★,☆,♠️,➕', true, '2023-08-10', true, '2023-11-20', '2023-05-20 14:20:00', '', true, '2024-07-25 19:30:00', 'active', '{"match_start": true, "result_pending": false}', '[]', '2024-07-25 19:00:00', true, 'ja', '', '', ''],
    ['player_003', 'ヨッスィーオ', 'yosshio@example.com', 1685, 18, 12, 52, 28, '★,♠️', true, '2023-09-05', false, '', '2023-07-10 09:15:00', '', true, '2024-07-24 15:20:00', 'active', '{"match_start": false, "result_pending": true}', '[]', '2024-07-24 20:30:00', false, 'ja', '', '', ''],
    ['player_004', 'あやの', 'ayano@example.com', 1620, 15, 13, 38, 25, '♠️,➕', true, '2024-01-20', true, '2024-02-28', '2024-01-05 16:45:00', '', true, '2024-07-25 18:00:00', 'active', '{"match_start": true, "result_pending": true}', '[]', '2024-07-25 17:30:00', true, 'ja', '', '', ''],
    ['player_005', 'まなみ', 'manami@example.com', 1580, 10, 15, 28, 32, '➕', false, '', true, '2024-04-10', '2024-02-28 11:00:00', '', true, '2024-07-23 12:00:00', 'active', '{"match_start": true, "result_pending": false}', '[]', '2024-07-23 19:45:00', false, 'ja', '', '', '']
  ],
  
  Tournaments: [
    ['tournament_007', '第7回BUNGU SQUAD大会', '2024-07-18', '19:00', '○○コミュニティセンター', 'https://example.com/qr/007', 'admin_001', '2024-07-15 10:00:00', 'completed', 20, 16, 'random'],
    ['tournament_008', '第8回BUNGU SQUAD大会', '2024-07-25', '19:00', '○○コミュニティセンター', 'https://example.com/qr/008', 'admin_001', '2024-07-22 14:30:00', 'active', 20, 18, 'random'],
    ['tournament_009', '第9回BUNGU SQUAD大会', '2024-08-01', '19:00', '○○コミュニティセンター', 'https://example.com/qr/009', 'admin_001', '2024-07-25 16:00:00', 'upcoming', 20, 0, 'random']
  ],
  
  TournamentParticipants: [
    ['part_001', 'tournament_008', 'player_001', '2024-07-25 18:45:00', '卓2', 'A-1', 'qr-scan', 'exempt', 'なし', '090-1234-5678', 'train'],
    ['part_002', 'tournament_008', 'player_002', '2024-07-25 18:30:00', '卓1', 'A-2', 'qr-scan', 'paid', 'なし', '090-2345-6789', 'car'],
    ['part_003', 'tournament_008', 'player_003', '2024-07-25 18:50:00', '卓2', 'B-1', 'qr-scan', 'paid', 'なし', '090-3456-7890', 'bus'],
    ['part_004', 'tournament_008', 'player_004', '2024-07-25 19:00:00', '卓1', 'B-2', 'manual', 'paid', 'なし', '090-4567-8901', 'walk'],
    ['part_005', 'tournament_008', 'player_005', '2024-07-25 19:10:00', '卓3', 'C-1', 'qr-scan', 'unpaid', 'アレルギー: 卵', '090-5678-9012', 'train']
  ],
  
  MatchResults: [
    ['match_20240725_001', 'tournament_008', 'player_002', 'player_003', 'player_002', 'player_003', 'trump', '2024-07-25 19:30:00', '2024-07-25 19:55:00', 'completed', 'player_002', '2024-07-25 19:56:00', 'admin_001', '2024-07-25 20:00:00', 1680, 1685, 1705, 1660, 25, -25, false, '', '', '', true, false, '卓1', '2024-07-25 20:05:00', 0, '', 'elo', 'ワラビサコの勝利！', '快晴・空調良好', 'qr-scan'],
    ['match_20240725_002', 'tournament_008', 'player_001', 'player_004', 'player_001', 'player_004', 'cardplus', '2024-07-25 20:00:00', '2024-07-25 20:30:00', 'completed', 'player_001', '2024-07-25 20:31:00', 'admin_001', '2024-07-25 20:35:00', 1620, 1620, 1650, 1590, 30, -30, false, '', '', '', true, true, '卓2', '2024-07-25 20:40:00', 0, '', 'elo', 'ちーけんのカードプラス初勝利', '快晴・空調良好', 'qr-scan'],
    ['match_20240725_003', 'tournament_008', 'player_003', 'player_005', '', '', 'trump', '2024-07-25 20:35:00', '', 'result-pending', '', '', '', '', 1660, 1580, 0, 0, 0, 0, false, '', '', '', false, false, '卓3', '', 0, '', 'elo', 'ヨッスィーオ vs まなみ 対戦中', '快晴・空調良好', 'qr-scan']
  ],
  
  YearlyArchive: [
    ['2023_player_002', 2023, 'player_002', 1820, 1, '★', 42, 28, '2024-01-01 00:00:00'],
    ['2023_player_003', 2023, 'player_003', 1700, 2, '☆', 35, 25, '2024-01-01 00:00:00'],
    ['2023_player_001', 2023, 'player_001', 1580, 5, '', 28, 32, '2024-01-01 00:00:00']
  ],
  
  CumulativeStats: [
    ['player_001', '2023-03-15', 68, 40, 28, 0.588, 1720, '2024-06-15', 2, '2024-07-25 20:00:00', 15, 'cardplus', 25.5, 'player_004', 7, 3, 45.2],
    ['player_002', '2022-05-20', 100, 68, 32, 0.680, 1850, '2024-07-25', 3, '2024-07-25 19:30:00', 22, 'trump', 23.8, 'player_003', 12, 2, 38.6],
    ['player_003', '2022-07-10', 80, 52, 28, 0.650, 1720, '2024-03-10', 3, '2024-07-24 15:20:00', 18, 'trump', 27.2, 'player_002', 8, 4, 42.1],
    ['player_004', '2024-01-05', 38, 25, 13, 0.658, 1650, '2024-07-25', 1, '2024-07-25 18:00:00', 8, 'cardplus', 26.1, 'player_001', 5, 2, 35.8],
    ['player_005', '2024-02-28', 28, 15, 13, 0.536, 1620, '2024-05-12', 1, '2024-07-23 12:00:00', 6, 'cardplus', 24.9, 'player_004', 4, 5, 52.3]
  ],
  
  Notifications: [
    ['notif_001', 'player_001', 'match_start', '対戦開始のお知らせ', 'あやのとの対戦が開始されました', '2024-07-25 20:00:00', '2024-07-25 20:02:00', true, '/match/match_20240725_002', 'high'],
    ['notif_002', 'player_004', 'match_start', '対戦開始のお知らせ', 'ちーけんとの対戦が開始されました', '2024-07-25 20:00:00', '', false, '/match/match_20240725_002', 'high'],
    ['notif_003', 'player_002', 'result_pending', '試合結果待ち', 'ヨッスィーオとの試合結果をお待ちしています', '2024-07-25 19:55:00', '2024-07-25 19:57:00', true, '/match/match_20240725_001', 'normal'],
    ['notif_004', 'player_001', 'tournament_reminder', '大会開始通知', '第8回BUNGU SQUAD大会が間もなく開始されます', '2024-07-25 18:45:00', '2024-07-25 18:47:00', true, '/tournament/tournament_008', 'high']
  ],
  
  SystemSettings: [
    ['rating_calculation_k_value', '30', 'number', 'Eloレーティング計算のK値', '2024-07-25 10:00:00', 'admin_001'],
    ['max_participants_per_tournament', '20', 'number', '大会あたりの最大参加者数', '2024-07-20 15:30:00', 'admin_001'],
    ['notification_timeout_minutes', '15', 'number', '通知タイムアウト時間（分）', '2024-07-22 09:00:00', 'admin_001'],
    ['pwa_install_prompt_delay', '3000', 'number', 'PWAインストール案内表示までの遅延（ms）', '2024-07-18 14:20:00', 'admin_001'],
    ['system_maintenance_mode', 'false', 'boolean', 'システムメンテナンスモード', '2024-07-25 08:00:00', 'admin_001']
  ],
  
  ErrorLogs: [
    ['error_001', 'player_005', 'network', 'Connection timeout', 'TypeError: Failed to fetch\n  at APIService.request (api.js:45)\n  at async getUserData (hooks.js:12)', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', '2024-07-25 19:45:30', '2024-07-25 20:00:00', 'restart'],
    ['error_002', 'player_003', 'ui', 'Button click handler failed', 'ReferenceError: handleSubmit is not defined\n  at onClick (MatchReport.tsx:78)', 'Mozilla/5.0 (Android 14; Mobile)', '2024-07-25 18:20:15', '', 'cache-clear'],
    ['error_003', '', 'system', 'Database connection lost', 'Error: Google Sheets API quota exceeded\n  at SheetsService.authenticate (sheets.js:25)', 'Server Environment', '2024-07-24 22:30:00', '2024-07-24 22:35:00', 'quota-reset']
  ]
};

async function addSampleData() {
  try {
    console.log('🎯 サンプルデータ投入を開始します...\n');
    
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    
    // Add data to each sheet
    for (const [sheetName, data] of Object.entries(SAMPLE_DATA)) {
      if (data.length > 0) {
        // Calculate proper end column based on data width
        const columnCount = Math.max(...data.map(row => row.length));
        let endColumn;
        if (columnCount <= 26) {
          endColumn = String.fromCharCode(64 + columnCount);
        } else {
          const firstLetter = String.fromCharCode(64 + Math.floor((columnCount - 1) / 26));
          const secondLetter = String.fromCharCode(65 + ((columnCount - 1) % 26));
          endColumn = firstLetter + secondLetter;
        }
        
        const range = `${sheetName}!A2:${endColumn}${data.length + 1}`;
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: 'RAW',
          resource: {
            values: data
          }
        });
        console.log(`  ✅ ${sheetName}: ${data.length}行のデータを追加`);
      }
    }
    
    console.log('\n🎉 サンプルデータ投入完了！\n');
    console.log('📊 投入されたデータ:');
    console.log('  - プレイヤー: 5名');
    console.log('  - 大会: 3回（過去1回・開催中1回・予定1回）');
    console.log('  - 対戦記録: 3試合（完了2試合・進行中1試合）');
    console.log('  - 参加記録: 5名分');
    console.log('  - 年間アーカイブ: 3名分');
    console.log('  - 累積統計: 5名分');
    console.log('  - 通知履歴: 4件');
    console.log('  - システム設定: 5項目');
    console.log('  - エラーログ: 3件\n');
    
    console.log('🔗 スプレッドシートを確認:');
    console.log(`   https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit\n`);
    
    console.log('🚀 次のステップ: Vercelプロジェクト作成・API実装');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('詳細:', error);
  }
}

addSampleData();