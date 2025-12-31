import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// .env.local.vercel から環境変数を手動で読み込み
const envContent = fs.readFileSync('.env.local.vercel', 'utf-8');

// GOOGLE_SHEETS_IDを抽出
const sheetIdMatch = envContent.match(/GOOGLE_SHEETS_ID="([^"]+)"/);
const spreadsheetId = sheetIdMatch ? sheetIdMatch[1] : null;

// 各フィールドを直接抽出
const clientEmailMatch = envContent.match(/"client_email":\s*"([^"]+)"/);
const privateKeyMatch = envContent.match(/"private_key":\s*"(-----BEGIN PRIVATE KEY-----.*?-----END PRIVATE KEY-----\\n)"/);

const clientEmail = clientEmailMatch ? clientEmailMatch[1] : null;
let privateKey = privateKeyMatch ? privateKeyMatch[1] : null;

if (!clientEmail || !privateKey || !spreadsheetId) {
  console.error('Missing required environment variables');
  console.error('clientEmail:', !!clientEmail);
  console.error('privateKey:', !!privateKey);
  console.error('spreadsheetId:', !!spreadsheetId);
  process.exit(1);
}

// \\n を実際の改行に変換
privateKey = privateKey.split('\\n').join('\n');

// 認証情報オブジェクトを構築
const credentials = {
  client_email: clientEmail,
  private_key: privateKey
};

// Google Sheets API認証
const auth = new google.auth.JWT(
  credentials.client_email,
  null,
  credentials.private_key,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

// MatchResults読み込み
const matchCsv = fs.readFileSync('/Users/kikuchikenji/Downloads/BUNGU SQUAD ランキングシステム - データベース - MatchResults (1).csv', 'utf-8');
const matchLines = matchCsv.trim().split('\n');

// Players読み込み
const playerCsv = fs.readFileSync('/Users/kikuchikenji/Downloads/BUNGU SQUAD ランキングシステム - データベース - Players (1).csv', 'utf-8');
const playerLines = playerCsv.trim().split('\n');

// プレイヤー情報マップ
const playerInfo = {};
for (let i = 1; i < playerLines.length; i++) {
  const parts = playerLines[i].split(',');
  const id = parts[0];
  const nickname = parts[1];
  const rating = parts[3];
  playerInfo[id] = { nickname, rating: parseInt(rating) || 1200, row: i + 1 };
}

// 勝敗集計
const stats = {};
for (let i = 1; i < matchLines.length; i++) {
  const parts = matchLines[i].split(',');
  const winner = parts[2];
  const loser = parts[3];

  if (!winner || !loser) continue;

  if (!stats[winner]) stats[winner] = { wins: 0, losses: 0 };
  stats[winner].wins++;

  if (!stats[loser]) stats[loser] = { wins: 0, losses: 0 };
  stats[loser].losses++;
}

// ランキング作成（勝利数順）
const ranked = Object.entries(stats)
  .sort((a, b) => b[1].wins - a[1].wins || a[1].losses - b[1].losses);

async function main() {
  try {
    console.log('=== 2025年度 年間アーカイブ修正スクリプト ===\n');

    // 1. YearlyArchiveにデータを追加
    console.log('1. YearlyArchiveに全員のデータを追加中...');

    const archiveData = ranked.map(([id, s], i) => {
      const rank = i + 1;
      let badge = '';
      if (rank === 1) badge = '🥇';
      else if (rank === 2) badge = '🥈';
      else if (rank === 3) badge = '🥉';

      const info = playerInfo[id] || { nickname: 'Unknown', rating: 1200 };
      return [
        `archive_2025_${id}`,
        2025,
        id,
        info.rating,
        rank,
        badge,
        s.wins,
        s.losses,
        '2026-01-01T00:00:00.000Z'
      ];
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'YearlyArchive!A:I',
      valueInputOption: 'RAW',
      requestBody: {
        values: archiveData
      }
    });

    console.log(`   -> ${archiveData.length}名のデータを追加しました`);

    // 2. 上位3名のchampion_badgesを更新
    console.log('\n2. 上位3名のchampion_badgesを更新中...');

    const champions = ranked.slice(0, 3);
    for (let i = 0; i < champions.length; i++) {
      const [id] = champions[i];
      const info = playerInfo[id];
      if (!info) continue;

      let badge = '';
      if (i === 0) badge = '2025:🥇';
      else if (i === 1) badge = '2025:🥈';
      else if (i === 2) badge = '2025:🥉';

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Players!I${info.row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[badge]]
        }
      });

      console.log(`   -> ${info.nickname}（${i + 1}位）: ${badge}`);
    }

    // 3. 全プレイヤーのcurrent_rating, annual_wins, annual_lossesをリセット
    console.log('\n3. 全プレイヤーのレーティングと年間成績をリセット中...');

    // Players全行取得
    const playersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:Z'
    });
    const playerRows = playersResponse.data.values || [];

    const updates = [];
    for (let j = 1; j < playerRows.length; j++) {
      const row = playerRows[j];
      if (!row || !row[0]) continue;

      const sheetRow = j + 1;

      // D列: current_rating → 1200
      updates.push({
        range: `Players!D${sheetRow}`,
        values: [[1200]]
      });

      // E列: annual_wins → 0
      updates.push({
        range: `Players!E${sheetRow}`,
        values: [[0]]
      });

      // F列: annual_losses → 0
      updates.push({
        range: `Players!F${sheetRow}`,
        values: [[0]]
      });
    }

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        requestBody: {
          valueInputOption: 'RAW',
          data: updates
        }
      });
    }

    console.log(`   -> ${playerRows.length - 1}名のデータをリセットしました`);
    console.log('      - current_rating: 1200');
    console.log('      - annual_wins: 0');
    console.log('      - annual_losses: 0');

    console.log('\n=== 完了 ===');
    console.log('\n2025年チャンピオン:');
    console.log('🥇 1位: ヨッスィーオ (15勝6敗)');
    console.log('🥈 2位: ワラビサコ (13勝5敗)');
    console.log('🥉 3位: ヒカリマル (12勝6敗)');

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
