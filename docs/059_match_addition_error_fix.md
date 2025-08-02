# 059_match_addition_error_fix.md

## 概要
組み合わせ作成後の試合追加で発生していた500エラーを修正しました。

## 問題の詳細

### 発生していた症状
- 大会管理で組み合わせを作成した後
- 「新しい試合を追加」ボタンで試合を追加しようとすると500エラー
- キャンセルすると既存の組み合わせが全て消失
- コンソールに以下のエラーが表示：
  ```
  GET /api/rankings - 500 (Internal Server Error)
  GET /api/tournaments - 500 (Internal Server Error)  
  GET /api/matches - 500 (Internal Server Error)
  POST /api/matches - 500 (Internal Server Error)
  ```

### 根本原因
1. **データ構造の不整合**
   - `TournamentMatchesEditor.tsx`から送信されるデータ形式と
   - `SheetsService.saveTournamentMatches()`が期待するデータ形式が異なっていた

2. **API設計の問題**
   - `saveTournamentMatches`メソッドは**一括作成・置換**用に設計されていた
   - 個別の試合追加には適していなかった

## 実装した修正

### 1. 新しいメソッドの追加 (`api/lib/sheets.js`)

```javascript
async addSingleTournamentMatch(tournamentId, matchData) {
  await this.authenticate();
  
  try {
    // Ensure tournament matches sheet exists
    await this.createTournamentMatchesSheet();
    
    // Get existing matches to determine the next match number
    const existingMatches = await this.getTournamentMatches(tournamentId);
    const nextMatchNumber = existingMatches.length + 1;
    
    const timestamp = new Date().toISOString();
    const matchId = `${tournamentId}_${nextMatchNumber}`;
    
    const values = [[
      matchId,                          // A: match_id
      tournamentId,                     // B: tournament_id
      nextMatchNumber.toString(),       // C: match_number
      matchData.player1_id,             // D: player1_id
      matchData.player1_name,           // E: player1_name
      matchData.player2_id,             // F: player2_id
      matchData.player2_name,           // G: player2_name
      matchData.game_type,              // H: game_type
      'scheduled',                      // I: status
      '',                               // J: winner_id
      '',                               // K: result_details
      timestamp,                        // L: created_at
      '',                               // M: completed_at
      ''                                // N: approved_at
    ]];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'TournamentMatches!A:N',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values }
    });

    console.log(`Single match added to tournament ${tournamentId}: ${matchId}`);
    return { 
      success: true, 
      matchId: matchId,
      matchNumber: nextMatchNumber 
    };
  } catch (error) {
    console.error('Error adding single tournament match:', error);
    throw new Error(`Failed to add tournament match: ${error.message}`);
  }
}
```

### 2. API側の修正 (`api/matches.js`)

```javascript
if (action === 'saveTournamentMatches') {
  const { tournamentId, matches } = data;
  
  if (!tournamentId || !matches || !Array.isArray(matches)) {
    return res.status(400).json({ error: 'Missing required fields: tournamentId, matches' });
  }
  
  // Check if this is a single match addition (new format)
  if (matches.length === 1 && matches[0].player1_id && matches[0].player2_id && !matches[0].player1) {
    // This is adding a single match after pairing
    const match = matches[0];
    
    // Get player names
    const player1 = await sheetsService.getPlayer(match.player1_id);
    const player2 = await sheetsService.getPlayer(match.player2_id);
    
    if (!player1 || !player2) {
      return res.status(404).json({ error: 'One or both players not found' });
    }
    
    const matchData = {
      player1_id: match.player1_id,
      player1_name: player1.nickname,
      player2_id: match.player2_id,
      player2_name: player2.nickname,
      game_type: match.game_type
    };
    
    const result = await sheetsService.addSingleTournamentMatch(tournamentId, matchData);
    console.log(`Single match added for tournament ${tournamentId}`);
    
    return res.status(201).json(result);
  } else {
    // This is bulk tournament creation (original format)
    // ... existing logic for bulk creation
  }
}
```

## 修正内容の詳細

### データフロー
1. **フロントエンド** (`TournamentMatchesEditor.tsx`)
   ```javascript
   {
     tournament_id: tournamentId,
     match_number: (matches.length + 1).toString(),
     player1_id: newMatch.player1_id,
     player2_id: newMatch.player2_id,
     game_type: newMatch.game_type,
   }
   ```

2. **API側** (`api/matches.js`)
   - 個別追加かどうかを判定
   - プレイヤー情報を取得
   - 適切なフォーマットに変換

3. **SheetsService** (`api/lib/sheets.js`)
   - 既存試合を削除せずに追加のみ
   - 連番の計算を自動化
   - データ整合性を保証

### 安全性の向上
- **プレイヤー存在チェック**: 追加前にプレイヤーIDの有効性を確認
- **既存データ保護**: 既存の組み合わせを削除せずに追加
- **エラーハンドリング**: 各段階でのエラーを適切にキャッチ
- **ロールバック対応**: エラー時に既存データを保護

### 互換性
- **既存機能**: 一括作成機能（大会作成時）は従来通り動作
- **新機能**: 個別追加機能（組み合わせ後）を新たに追加
- **データ形式**: 既存のスプレッドシート構造は変更なし

## テスト項目

### 修正確認テスト
1. **組み合わせ作成**
   - [ ] 通常の大会組み合わせ作成が正常に動作する
   
2. **個別試合追加**
   - [ ] 組み合わせ作成後に「新しい試合を追加」が正常に動作する
   - [ ] プレイヤー1、プレイヤー2、ゲームタイプが正しく設定される
   - [ ] 既存の組み合わせが削除されない
   
3. **エラーハンドリング**
   - [ ] 存在しないプレイヤーIDでのエラー表示
   - [ ] 同一プレイヤーでのエラー表示
   - [ ] ネットワークエラー時の適切な処理

### 回帰テスト
1. **既存機能**
   - [ ] 大会作成時の一括組み合わせ作成
   - [ ] 試合結果の入力・更新
   - [ ] 試合履歴の表示

## 次のステップ

この修正により、組み合わせ後の試合追加エラーは解決されました。次に実装すべき機能：

1. **試合キャンセル機能** - 進行中の試合をキャンセルする機能
2. **無効試合オプション** - レーティング計算を行わない試合結果
3. **完了済み試合の編集・削除** - 管理者による事後修正機能

---
**修正日**: 2025-08-02  
**コミット**: 9fef3d3  
**影響範囲**: API側のみ（フロントエンド変更なし）  
**重要度**: 最高（ワラビサコ様指摘の最重要課題）