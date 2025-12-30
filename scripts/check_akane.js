#!/usr/bin/env node
/**
 * あかねアカウントのデータ確認スクリプト
 */

require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

async function main() {
  console.log('📊 あかねアカウントのデータを確認中...\n');

  // 環境変数からJSONキーを取得し、パース
  let jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  
  // 文字列としての \n を実際の改行に変換
  jsonKey = jsonKey.replace(/\\n/g, '\n');
  
  const credentials = JSON.parse(jsonKey);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: authClient });

  // プレイヤーデータを取得
  const playersRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Players!A:Z',
  });

  const players = playersRes.data.values || [];
  const headers = players[0];
  console.log('=== Players Headers ===');
  console.log(headers.join(' | '));

  // あかね関連のプレイヤーを検索
  console.log('\n=== あかね関連のプレイヤー ===');
  const oldAkaneId = 'temp_user_1759492172247_r6m6a6qpl';
  const newAkaneId = 'temp_user_1763288933748_zxl92tb55';

  let oldAkaneRow = -1;
  let newAkaneRow = -1;
  let oldAkaneRating = 0;
  let newAkaneRating = 0;

  const ratingIdx = headers.indexOf('current_rating');
  const winsIdx = headers.indexOf('annual_wins');
  const lossesIdx = headers.indexOf('annual_losses');

  for (let i = 1; i < players.length; i++) {
    const row = players[i];
    const id = row[0] || '';
    const name = row[1] || '';
    if (name.includes('あかね') || id === oldAkaneId || id === newAkaneId) {
      console.log('Row', i + 1, '(sheet row number):');
      headers.forEach((h, idx) => {
        if (row[idx]) console.log('  ' + h + ': ' + row[idx]);
      });
      console.log('---');

      if (id === oldAkaneId) {
        oldAkaneRow = i + 1;
        oldAkaneRating = parseInt(row[ratingIdx]) || 1200;
      }
      if (id === newAkaneId) {
        newAkaneRow = i + 1;
        newAkaneRating = parseInt(row[ratingIdx]) || 1200;
      }
    }
  }

  console.log('\n📍 シート行番号:');
  console.log('  旧あかね: Row', oldAkaneRow, '(Rating:', oldAkaneRating, ')');
  console.log('  新あかね: Row', newAkaneRow, '(Rating:', newAkaneRating, ')');

  // TournamentMatchesから試合データを取得
  const matchesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'TournamentMatches!A:Z',
  });

  const matches = matchesRes.data.values || [];
  const matchHeaders = matches[0];
  console.log('\n=== TournamentMatches Headers ===');
  console.log(matchHeaders.join(' | '));

  // あかね関連の試合を検索
  console.log('\n=== あかね関連の試合（詳細） ===');
  let oldWins = 0, oldLosses = 0, newWins = 0, newLosses = 0;

  const winnerIdIdx = matchHeaders.indexOf('winner_id');
  const player1IdIdx = matchHeaders.indexOf('player1_id');
  const player2IdIdx = matchHeaders.indexOf('player2_id');
  const statusIdx = matchHeaders.indexOf('match_status');
  const tournamentIdIdx = matchHeaders.indexOf('tournament_id');

  for (let i = 1; i < matches.length; i++) {
    const row = matches[i];
    const rowStr = JSON.stringify(row);
    if (rowStr.includes(oldAkaneId) || rowStr.includes(newAkaneId)) {
      console.log('Match Row', i + 1, '(sheet row):');
      matchHeaders.forEach((h, idx) => {
        if (row[idx]) console.log('  ' + h + ': ' + row[idx]);
      });

      // 勝敗をカウント
      const winnerId = row[winnerIdIdx];
      const player1Id = row[player1IdIdx];
      const player2Id = row[player2IdIdx];
      const status = row[statusIdx];

      if (status === 'completed') {
        if (player1Id === oldAkaneId || player2Id === oldAkaneId) {
          if (winnerId === oldAkaneId) {
            oldWins++;
            console.log('  → 旧あかね WIN');
          } else {
            oldLosses++;
            console.log('  → 旧あかね LOSE');
          }
        }
        if (player1Id === newAkaneId || player2Id === newAkaneId) {
          if (winnerId === newAkaneId) {
            newWins++;
            console.log('  → 新あかね WIN');
          } else {
            newLosses++;
            console.log('  → 新あかね LOSE');
          }
        }
      }
      console.log('---');
    }
  }

  console.log('\n=== 集計結果 ===');
  console.log('旧あかね: ' + oldWins + '勝 ' + oldLosses + '敗 (Rating: ' + oldAkaneRating + ')');
  console.log('新あかね: ' + newWins + '勝 ' + newLosses + '敗 (Rating: ' + newAkaneRating + ')');
  console.log('合計: ' + (oldWins + newWins) + '勝 ' + (oldLosses + newLosses) + '敗');

  // 推奨アクション
  console.log('\n=== 推奨アクション ===');
  console.log('1. 旧あかね（Row ' + oldAkaneRow + '）を削除');
  console.log('2. 新あかね（Row ' + newAkaneRow + '）のレーティングを調整');
  
  // 単純な推定: 旧の変動分を新に加算
  const oldChange = oldAkaneRating - 1200; // -39
  const currentNewRating = newAkaneRating;
  const suggestedRating = currentNewRating + oldChange;
  
  console.log('\n💡 レーティング調整案:');
  console.log('   旧あかね変動: 1200 → ' + oldAkaneRating + ' (変動: ' + oldChange + ')');
  console.log('   新あかね現在: ' + currentNewRating);
  console.log('   → 調整後: ' + suggestedRating + ' pt');
  console.log('\n※ ワラビサコさんの要望「ざっくりでOK」に基づく単純加算');
}

main()
  .then(() => {
    console.log('\n✨ 完了しました！');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ エラー:', err);
    process.exit(1);
  });
