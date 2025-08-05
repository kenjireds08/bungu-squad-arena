#!/usr/bin/env node

/**
 * TournamentMatchesシートの構造を更新するスクリプト
 * - G列にgame_type列を追加
 * - 既存のデータを新しい構造に移行
 * - バックアップを作成
 */

require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const readline = require('readline');

// スプレッドシートID
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// 新しい列構造
const NEW_HEADERS = [
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
];

async function updateTournamentMatchesStructure() {
  // 認証
  const credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n');
  const credentials = JSON.parse(credentialsString);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  
  try {
    console.log('📋 現在のTournamentMatchesシートのデータを取得中...');
    
    // 現在のデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TournamentMatches!A:Z'
    });
    
    const currentData = response.data.values || [];
    if (currentData.length === 0) {
      console.log('❌ TournamentMatchesシートが空です');
      return;
    }
    
    console.log(`✅ ${currentData.length}行のデータを取得しました`);
    
    // バックアップシートを作成
    const backupSheetName = `TournamentMatches_Backup_${new Date().toISOString().slice(0, 10)}`;
    console.log(`📦 バックアップシート「${backupSheetName}」を作成中...`);
    
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          duplicateSheet: {
            sourceSheetId: await getSheetId(sheets, SPREADSHEET_ID, 'TournamentMatches'),
            insertSheetIndex: 0,
            newSheetName: backupSheetName
          }
        }]
      }
    });
    
    console.log('✅ バックアップシートを作成しました');
    
    // 新しいデータ構造を作成
    console.log('🔧 データを新しい構造に変換中...');
    const newData = [NEW_HEADERS]; // ヘッダー行
    
    // 既存のデータを新しい構造に変換（ヘッダー行をスキップ）
    for (let i = 1; i < currentData.length; i++) {
      const oldRow = currentData[i];
      if (!oldRow || oldRow.length === 0) continue;
      
      const newRow = [
        oldRow[0] || '',  // A: match_id
        oldRow[1] || '',  // B: tournament_id
        oldRow[2] || '',  // C: player1_id (旧: player1_id)
        oldRow[3] || '',  // D: player2_id (旧: player2_id)
        oldRow[4] || '',  // E: table_number
        oldRow[5] || '',  // F: match_status
        'trump',          // G: game_type (新規追加・デフォルト値)
        oldRow[6] || '',  // H: created_at (旧: G列)
        oldRow[7] || '',  // I: winner_id (旧: H列)
        oldRow[8] || '',  // J: loser_id (旧: I列)
        oldRow[9] || '',  // K: match_start_time (旧: J列)
        oldRow[10] || '', // L: match_end_time (旧: K列)
        oldRow[11] || '', // M: reported_by (旧: L列)
        oldRow[12] || '', // N: reported_at (旧: M列)
        oldRow[13] || '', // O: approved_by (旧: N列)
        oldRow[14] || '', // P: approved_at (旧: O列)
        oldRow[15] || '', // Q: player1_rating_before (旧: P列)
        oldRow[16] || '', // R: player2_rating_before (旧: Q列)
        oldRow[17] || '', // S: player1_rating_after (旧: R列)
        oldRow[18] || '', // T: player2_rating_after (旧: S列)
        oldRow[19] || '', // U: player1_rating_change (旧: T列)
        oldRow[20] || '', // V: player2_rating_change (旧: U列)
        oldRow[21] || '', // W: notes (旧: V列)
        oldRow[22] || ''  // X: created_by (旧: W列)
      ];
      
      newData.push(newRow);
    }
    
    console.log(`✅ ${newData.length - 1}行のデータを変換しました`);
    
    // TournamentMatchesシートをクリアして新しいデータを書き込み
    console.log('📝 新しい構造でデータを書き込み中...');
    
    // シートをクリア
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TournamentMatches!A:Z'
    });
    
    // 新しいデータを書き込み
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'TournamentMatches!A1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: newData
      }
    });
    
    console.log('✅ 更新が完了しました！');
    console.log(`📋 バックアップは「${backupSheetName}」シートに保存されています`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

// シートIDを取得するヘルパー関数
async function getSheetId(sheets, spreadsheetId, sheetName) {
  const response = await sheets.spreadsheets.get({
    spreadsheetId: spreadsheetId
  });
  
  const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }
  
  return sheet.properties.sheetId;
}

// 実行確認
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  警告: このスクリプトはTournamentMatchesシートの構造を変更します');
console.log('📦 バックアップは自動的に作成されます');
console.log('');

rl.question('続行しますか？ (y/N): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    updateTournamentMatchesStructure()
      .then(() => {
        console.log('✨ 完了しました！');
        process.exit(0);
      })
      .catch(err => {
        console.error('❌ エラー:', err);
        process.exit(1);
      });
  } else {
    console.log('キャンセルしました');
    process.exit(0);
  }
  rl.close();
});