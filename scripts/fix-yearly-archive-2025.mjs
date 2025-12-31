import { google } from 'googleapis';
import fs from 'fs';

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

// アーカイブ対象年度（JST基準）
const ARCHIVE_YEAR = 2025;

// MatchResults読み込み（試合データ集計用）
const matchCsv = fs.readFileSync('/Users/kikuchikenji/Downloads/BUNGU SQUAD ランキングシステム - データベース - MatchResults (1).csv', 'utf-8');
const matchLines = matchCsv.trim().split('\n');

// 勝敗集計（年度フィルタ付き - JST基準）
const stats = {};
let filteredCount = 0;
let totalMatches = 0;

for (let i = 1; i < matchLines.length; i++) {
  const parts = matchLines[i].split(',');
  const winner = parts[2];
  const loser = parts[3];
  const createdAt = parts[7]; // H列: created_at

  if (!winner || !loser) continue;
  totalMatches++;

  // 年度フィルタ（JST基準）
  if (createdAt && createdAt.trim() !== '') {
    const matchDate = new Date(createdAt);
    if (!isNaN(matchDate.getTime())) {
      // JSTに変換（UTC+9）して年を取得
      const matchDateJST = new Date(matchDate.getTime() + 9 * 60 * 60 * 1000);
      const matchYear = matchDateJST.getUTCFullYear();
      if (matchYear !== ARCHIVE_YEAR) {
        filteredCount++;
        continue;
      }
    }
  }

  if (!stats[winner]) stats[winner] = { wins: 0, losses: 0 };
  stats[winner].wins++;

  if (!stats[loser]) stats[loser] = { wins: 0, losses: 0 };
  stats[loser].losses++;
}

console.log(`試合データ: ${totalMatches}件中 ${totalMatches - filteredCount}件が${ARCHIVE_YEAR}年度`);

async function main() {
  try {
    console.log(`\n=== ${ARCHIVE_YEAR}年度 年間アーカイブスクリプト ===\n`);

    // 0. 既存のYearlyArchiveエントリを確認（重複チェック）
    console.log('0. 既存のアーカイブエントリを確認中...');
    const existingArchive = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'YearlyArchive!A:B'
    });
    const existingRows = existingArchive.data.values || [];
    const existingIds = new Set(existingRows.map(row => row[0]));

    const hasExistingYear = existingRows.some(row => row[1] && parseInt(row[1]) === ARCHIVE_YEAR);
    if (hasExistingYear) {
      console.error(`\n❌ エラー: ${ARCHIVE_YEAR}年度のエントリが既に存在します。`);
      console.error('   重複を避けるため、処理を中断します。');
      console.error('   再実行する場合は、既存のYearlyArchiveデータを手動で削除してください。');
      process.exit(1);
    }
    console.log(`   -> ${ARCHIVE_YEAR}年度のエントリはありません。新規作成します。`);

    // 1. Playersシートから最新データを取得（バッジの追記に必要）
    console.log('\n1. Playersシートから最新データを取得中...');
    const playersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Players!A:Z'
    });
    const playerRows = playersResponse.data.values || [];

    // プレイヤー情報マップ（シートから最新データを取得）
    const playerInfo = {};
    for (let j = 1; j < playerRows.length; j++) {
      const row = playerRows[j];
      if (!row || !row[0]) continue;
      const id = row[0];
      const nickname = row[1];
      const rating = row[3];
      const championBadges = row[8] || ''; // I列: champion_badges（シートから最新を取得）
      playerInfo[id] = {
        nickname,
        rating: parseInt(rating) || 1200,
        row: j + 1,
        existingBadges: championBadges
      };
    }
    console.log(`   -> ${Object.keys(playerInfo).length}名のプレイヤー情報を取得`);

    // 全プレイヤーをランキング対象に（試合がない人も含む）
    const allPlayerStats = Object.keys(playerInfo).map(id => {
      const s = stats[id] || { wins: 0, losses: 0 };
      return { id, ...s };
    });

    // ランキング作成（勝利数順、同勝利数なら敗北数少ない順）
    const ranked = allPlayerStats.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

    // 2. YearlyArchiveに全員のデータを追加
    console.log('\n2. YearlyArchiveに全員のデータを追加中...');

    const archiveData = ranked.map(({ id, wins, losses }, i) => {
      const rank = i + 1;
      let badge = '';
      if (rank === 1) badge = '🥇';
      else if (rank === 2) badge = '🥈';
      else if (rank === 3) badge = '🥉';

      const info = playerInfo[id] || { nickname: 'Unknown', rating: 1200 };
      const archiveId = `archive_${ARCHIVE_YEAR}_${id}`;

      // 重複チェック（念のため）
      if (existingIds.has(archiveId)) {
        console.log(`   ⚠️ スキップ: ${archiveId} は既に存在`);
        return null;
      }

      return [
        archiveId,
        ARCHIVE_YEAR,
        id,
        info.rating,
        rank,
        badge,
        wins,
        losses,
        `${ARCHIVE_YEAR + 1}-01-01T00:00:00.000Z`
      ];
    }).filter(Boolean);

    if (archiveData.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'YearlyArchive!A:I',
        valueInputOption: 'RAW',
        requestBody: {
          values: archiveData
        }
      });
      console.log(`   -> ${archiveData.length}名のデータを追加しました`);
    } else {
      console.log('   -> 追加するデータはありません');
    }

    // 3. 上位3名のchampion_badgesを更新（追記方式・シートから最新を読んで判定）
    console.log('\n3. 上位3名のchampion_badgesを更新中...');

    const champions = ranked.slice(0, 3);
    for (let i = 0; i < champions.length; i++) {
      const { id } = champions[i];
      const info = playerInfo[id];
      if (!info) continue;

      let newBadge = '';
      if (i === 0) newBadge = `${ARCHIVE_YEAR}:🥇`;
      else if (i === 1) newBadge = `${ARCHIVE_YEAR}:🥈`;
      else if (i === 2) newBadge = `${ARCHIVE_YEAR}:🥉`;

      // 重複チェック（シートから読んだ最新バッジで判定）
      if (info.existingBadges && info.existingBadges.includes(`${ARCHIVE_YEAR}:`)) {
        console.log(`   -> ${info.nickname}（${i + 1}位）: 既に${ARCHIVE_YEAR}年度のバッジあり、スキップ`);
        continue;
      }

      // 既存のバッジがあれば追記、なければ新規
      let updatedBadges = newBadge;
      if (info.existingBadges && info.existingBadges.trim() !== '') {
        updatedBadges = `${info.existingBadges},${newBadge}`;
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Players!I${info.row}`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [[updatedBadges]]
        }
      });

      console.log(`   -> ${info.nickname}（${i + 1}位）: ${updatedBadges}`);
    }

    // 4. 全プレイヤーのcurrent_rating, annual_wins, annual_lossesをリセット
    console.log('\n4. 全プレイヤーのレーティングと年間成績をリセット中...');

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
    console.log(`\n${ARCHIVE_YEAR}年チャンピオン:`);
    if (ranked.length >= 3) {
      const p1 = playerInfo[ranked[0].id];
      const p2 = playerInfo[ranked[1].id];
      const p3 = playerInfo[ranked[2].id];
      console.log(`🥇 1位: ${p1?.nickname || ranked[0].id} (${ranked[0].wins}勝${ranked[0].losses}敗)`);
      console.log(`🥈 2位: ${p2?.nickname || ranked[1].id} (${ranked[1].wins}勝${ranked[1].losses}敗)`);
      console.log(`🥉 3位: ${p3?.nickname || ranked[2].id} (${ranked[2].wins}勝${ranked[2].losses}敗)`);
    }

  } catch (error) {
    console.error('エラーが発生しました:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

main();
