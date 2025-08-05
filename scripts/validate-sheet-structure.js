#!/usr/bin/env node

/**
 * スプレッドシートの構造とコード側の期待値を比較検証するスクリプト
 */

require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { readSheetStructure } = require('./read-sheet-structure');

// スプレッドシートID
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// コード側で期待されるヘッダー構造
const EXPECTED_HEADERS = {
  'TournamentMatches': [
    'match_id',           // A
    'tournament_id',      // B
    'player1_id',         // C
    'player2_id',         // D
    'table_number',       // E
    'match_status',       // F
    'game_type',          // G ⭐NEW
    'created_at',         // H
    'winner_id',          // I
    'loser_id',           // J
    'match_start_time',   // K
    'match_end_time',     // L
    'reported_by',        // M
    'reported_at',        // N
    'approved_by',        // O
    'approved_at',        // P
    'player1_rating_before', // Q
    'player2_rating_before', // R
    'player1_rating_after',  // S
    'player2_rating_after',  // T
    'player1_rating_change', // U
    'player2_rating_change', // V
    'notes',              // W
    'created_by'          // X
  ],
  'Players': [
    'player_id',
    'nickname',
    'email',
    'current_rating',
    'annual_wins',
    'annual_losses',
    'total_wins',
    'total_losses',
    'champion_badges',
    'trump_rule_experienced',
    'first_trump_game_date',
    'cardplus_rule_experienced',
    'first_cardplus_game_date',
    'registration_date',
    'profile_image_url',
    'is_active',
    'last_activity_date',
    'player_status',
    'notification_preferences',
    'device_tokens',
    'last_login',
    'profile_image_uploaded',
    'preferred_language',
    'tournament_active'
  ],
  'Tournaments': [
    'tournament_id',
    'name',
    'date',
    'time',
    'location',
    'max_participants',
    'current_participants',
    'status',
    'qr_code_url',
    'description',
    'created_at',
    'updated_at'
  ],
  'MatchResults': [
    'match_id',
    'tournament_id',
    'player1_id',
    'player1_name',
    'player2_id',
    'player2_name',
    'game_rule',
    'match_date',
    'winner_id',
    'winner_name',
    'loser_id',
    'loser_name',
    'winner_old_rating',
    'winner_new_rating',
    'loser_old_rating',
    'loser_new_rating',
    'rating_change',
    'match_status',
    'notes',
    'created_at',
    'updated_at'
  ]
};

async function validateSheetStructure() {
  // 認証
  const credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
  const credentials = JSON.parse(credentialsString);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  
  console.log('🔍 スプレッドシートの構造を検証中...\n');
  
  let hasErrors = false;
  
  try {
    // 各シートを検証
    for (const [sheetName, expectedHeaders] of Object.entries(EXPECTED_HEADERS)) {
      console.log(`📋 ${sheetName}シートを検証中...`);
      
      try {
        // 実際のヘッダーを取得
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!1:1`
        });
        
        const actualHeaders = response.data.values?.[0] || [];
        
        // 差分をチェック
        const missingInSheet = expectedHeaders.filter(h => !actualHeaders.includes(h));
        const extraInSheet = actualHeaders.filter(h => !expectedHeaders.includes(h));
        const orderMismatch = [];
        
        // 順序チェック
        expectedHeaders.forEach((header, index) => {
          if (actualHeaders[index] !== header) {
            orderMismatch.push({
              position: index,
              expected: header,
              actual: actualHeaders[index] || '(empty)'
            });
          }
        });
        
        // 結果を出力
        if (missingInSheet.length === 0 && extraInSheet.length === 0 && orderMismatch.length === 0) {
          console.log('  ✅ OK - 構造が一致しています');
        } else {
          hasErrors = true;
          console.log('  ❌ エラー - 構造に差異があります:');
          
          if (missingInSheet.length > 0) {
            console.log(`    📍 コードで期待されているが、シートに存在しない列:`);
            missingInSheet.forEach(h => console.log(`       - ${h}`));
          }
          
          if (extraInSheet.length > 0) {
            console.log(`    📍 シートに存在するが、コードで期待されていない列:`);
            extraInSheet.forEach(h => console.log(`       - ${h}`));
          }
          
          if (orderMismatch.length > 0) {
            console.log(`    📍 列の順序が異なる箇所:`);
            orderMismatch.forEach(m => {
              console.log(`       - 列${String.fromCharCode(65 + m.position)}: 期待="${m.expected}", 実際="${m.actual}"`);
            });
          }
        }
        
        console.log(`  📊 期待される列数: ${expectedHeaders.length}, 実際の列数: ${actualHeaders.length}\n`);
        
      } catch (error) {
        hasErrors = true;
        console.log(`  ❌ エラー - シートの読み取りに失敗: ${error.message}\n`);
      }
    }
    
    // 結果サマリー
    console.log('\n' + '='.repeat(60));
    if (hasErrors) {
      console.log('❌ 検証失敗 - スプレッドシートとコードの構造に差異があります');
      console.log('\n対処方法:');
      console.log('1. スプレッドシートの列を手動で修正する');
      console.log('2. または、コード側の期待値（EXPECTED_HEADERS）を更新する');
      console.log('3. scripts/update-tournament-matches-structure.js を実行して自動修正する');
      process.exit(1);
    } else {
      console.log('✅ 検証成功 - すべてのシートの構造が正しいです');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ 検証中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// メイン実行
if (require.main === module) {
  validateSheetStructure();
}

module.exports = { validateSheetStructure };