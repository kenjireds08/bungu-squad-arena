#!/usr/bin/env node

/**
 * スプレッドシートの全シートのヘッダー構造を読み取り、
 * docs/064_spreadsheet_structure_full.md を自動生成するスクリプト
 */

require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');
const { createSheetsClient } = require('../utils/googleAuth');
const fs = require('fs').promises;
const path = require('path');

// スプレッドシートID
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_ID;

// データ型の推定関数
function inferDataType(fieldName) {
  if (fieldName.includes('_id') || fieldName.includes('_by')) return '文字列';
  if (fieldName.includes('rating') || fieldName.includes('wins') || fieldName.includes('losses') || fieldName.includes('count') || fieldName.includes('number')) return '数値';
  if (fieldName.includes('_at') || fieldName.includes('_date') || fieldName.includes('_time')) return '日時';
  if (fieldName.includes('is_') || fieldName.includes('_experienced') || fieldName.includes('_active')) return 'TRUE/FALSE';
  if (fieldName.includes('url')) return 'URL';
  if (fieldName.includes('email')) return 'メールアドレス';
  if (fieldName.includes('badges')) return 'バッジ文字列';
  return '文字列';
}

// 説明の生成関数
function generateDescription(fieldName) {
  const descriptions = {
    'player_id': 'プレイヤーの一意識別子',
    'nickname': 'プレイヤーの表示名',
    'email': 'プレイヤーのメールアドレス',
    'current_rating': '現在のELOレーティング',
    'annual_wins': '年間勝利数',
    'annual_losses': '年間敗北数',
    'total_wins': '通算勝利数',
    'total_losses': '通算敗北数',
    'champion_badges': '獲得済みバッジ（🥇🥈🥉♠️➕）',
    'trump_rule_experienced': 'トランプルール経験フラグ',
    'cardplus_rule_experienced': 'カード+ルール経験フラグ',
    'tournament_active': '大会参加中フラグ',
    'match_id': '試合の一意識別子',
    'tournament_id': '大会の一意識別子',
    'game_type': 'ゲームルール（trump/cardplus）',
    'match_status': '試合状態（scheduled/in_progress/completed/invalid）',
    'winner_id': '勝者のプレイヤーID',
    'loser_id': '敗者のプレイヤーID',
    'created_at': '作成日時',
    'updated_at': '更新日時',
    'status': 'ステータス',
    'name': '名称',
    'date': '日付',
    'time': '時刻',
    'location': '場所',
    'max_participants': '最大参加者数',
    'current_participants': '現在参加者数',
    'qr_code_url': 'QRコードのURL',
    'description': '説明文',
    'table_number': 'テーブル番号',
    'player1_id': 'プレイヤー1のID',
    'player2_id': 'プレイヤー2のID',
    'player1_name': 'プレイヤー1の名前',
    'player2_name': 'プレイヤー2の名前',
    'match_start_time': '試合開始時刻',
    'match_end_time': '試合終了時刻',
    'reported_by': '報告者ID',
    'reported_at': '報告日時',
    'approved_by': '承認者ID',
    'approved_at': '承認日時',
    'player1_rating_before': 'プレイヤー1の試合前レーティング',
    'player2_rating_before': 'プレイヤー2の試合前レーティング',
    'player1_rating_after': 'プレイヤー1の試合後レーティング',
    'player2_rating_after': 'プレイヤー2の試合後レーティング',
    'player1_rating_change': 'プレイヤー1のレーティング変動',
    'player2_rating_change': 'プレイヤー2のレーティング変動',
    'notes': '備考',
    'created_by': '作成者'
  };
  
  return descriptions[fieldName] || fieldName;
}

async function readSheetStructure() {
  console.log('📊 スプレッドシートの構造を読み取り中...');
  
  // 共通ユーティリティを使用して認証
  const sheets = await createSheetsClient(true); // 読み取り専用
  
  try {
    
    // スプレッドシートのメタデータを取得
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    
    const sheetNames = spreadsheet.data.sheets.map(sheet => sheet.properties.title);
    console.log(`✅ ${sheetNames.length}個のシートを検出しました`);
    
    // 各シートのヘッダーを取得
    const sheetStructures = [];
    
    for (const sheetName of sheetNames) {
      console.log(`📋 ${sheetName}シートを読み取り中...`);
      
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${sheetName}!1:1`
        });
        
        const headers = response.data.values?.[0] || [];
        
        sheetStructures.push({
          name: sheetName,
          headers: headers.map((header, index) => ({
            column: String.fromCharCode(65 + index), // A, B, C...
            fieldName: header,
            dataType: inferDataType(header),
            description: generateDescription(header)
          }))
        });
        
        console.log(`  ✅ ${headers.length}列のヘッダーを取得`);
      } catch (error) {
        console.error(`  ❌ ${sheetName}シートの読み取りエラー:`, error.message);
      }
    }
    
    // Markdownドキュメントを生成
    console.log('\n📝 Markdownドキュメントを生成中...');
    
    let markdown = `# 064 - BUNGU SQUADスプレッドシート完全構造仕様

## 概要
**作成日**: ${new Date().toISOString().slice(0, 10)}  
**スプレッドシートID**: \`${SPREADSHEET_ID}\`  
**総シート数**: ${sheetStructures.length}シート  
**データソース**: Google Sheets APIから自動取得  

## 全シート構造詳細

`;
    
    // 各シートの構造を出力
    sheetStructures.forEach((sheet, index) => {
      markdown += `### ${index + 1}. ${sheet.name} シート${sheet.name.includes('Match') || sheet.name === 'Players' ? ' ⭐' : ''}
**目的**: ${getSheetPurpose(sheet.name)}

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
`;
      
      sheet.headers.forEach(header => {
        markdown += `| ${header.column} | ${header.fieldName} | ${header.dataType} | ${header.description} |\n`;
      });
      
      markdown += '\n';
    });
    
    // 技術仕様セクションを追加
    markdown += `## 重要な技術仕様

### データ型統一規則
- **Boolean値**: \`TRUE\`/\`FALSE\`（大文字統一）
- **日付**: \`YYYY-MM-DD\`形式
- **日時**: \`YYYY-MM-DD HH:MM:SS\`形式
- **ID**: 英数字文字列（例：\`player_001\`、\`tournament_20250803_1420\`）
- **JSON**: 文字列形式で保存

### 重要な制約・注意事項
1. **列順序変更禁止**: APIの列マッピングが破綻するため
2. **必須フィールド**: 各シートの\`A\`列（ID列）は必須
3. **外部キー整合性**: player_id、tournament_id、match_idの紐付け必須
4. **データ型統一**: 同一列内でのデータ型混在禁止

### 最終更新情報
- **更新日時**: ${new Date().toISOString()}
- **更新方法**: scripts/read-sheet-structure.js による自動生成
- **game_type列**: TournamentMatchesシートのG列に追加済み

## 自動生成情報
このドキュメントは \`scripts/read-sheet-structure.js\` により自動生成されました。
手動での編集は避け、スプレッドシートの構造を変更した場合は再度スクリプトを実行してください。
`;
    
    // ファイルに書き込み
    const outputPath = path.join(__dirname, '..', 'docs', '064_spreadsheet_structure_full.md');
    await fs.writeFile(outputPath, markdown, 'utf8');
    
    console.log(`\n✅ ドキュメントを生成しました: ${outputPath}`);
    
    return sheetStructures;
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

// シートの目的を返す関数
function getSheetPurpose(sheetName) {
  const purposes = {
    'Players': 'プレイヤーの基本情報・レーティング・ゲーム経験管理',
    'MatchResults': '試合結果の詳細記録・レーティング計算ベース',
    'Tournaments': '大会の基本情報・スケジュール管理',
    'TournamentParticipants': '大会参加者の登録・管理',
    'TournamentMatches': '全大会の試合情報を一元管理（最重要シート）',
    'TournamentDailyArchive': '日別大会参加履歴の保存',
    'RatingHistory': 'レーティング変更履歴の詳細記録',
    'YearlyArchive': '年間統計の保存',
    'CumulativeStats': '累積統計情報',
    'Notifications': '通知履歴の管理',
    'SystemSettings': 'システム設定の管理',
    'ErrorLogs': 'システムエラーログ'
  };
  
  return purposes[sheetName] || `${sheetName}の管理`;
}

// メイン実行
if (require.main === module) {
  readSheetStructure()
    .then(() => {
      console.log('\n✨ 完了しました！');
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ エラー:', err);
      process.exit(1);
    });
}

module.exports = { readSheetStructure };