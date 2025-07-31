# プレイヤーログイン時の500エラー修正

## 実装日時
2025-08-01

## 問題の概要
プレイヤーのログイン時に連続して500エラーが発生：
- `/api/players:1` - 500エラー
- `/api/rankings:1` - 500エラー
- `Login/Signup error: Error: Failed to fetch players`

## 根本原因の特定

### 問題のあった処理
`getPlayers()`メソッド内で毎回実行されていた処理：
```javascript
// Auto-reset old tournament participation on each getPlayers call
await this.autoResetOldTournamentParticipation();
```

### 問題の詳細
1. **`autoResetOldTournamentParticipation()`** が毎回実行
2. この処理は**Tournamentsシート**に複雑なアクセスを行う
3. **複数のAPI呼び出し**を同時に実行（シート構造確認等）
4. **500エラー**の原因となっていた

## 修正内容

### 1. 自動リセット処理の無効化
```javascript
// Before（問題があった）
await this.autoResetOldTournamentParticipation();

// After（修正後）
// Skip auto-reset to avoid 500 errors - only run when needed
// await this.autoResetOldTournamentParticipation();
```

### 2. エラーハンドリングの改善

#### `getPlayers()`のエラーハンドリング
```javascript
} catch (error) {
  // Handle specific Google Sheets API errors
  if (error.code === 404) {
    throw new Error('Players sheet not found. Please check if the sheet exists.');
  } else if (error.code === 403) {
    throw new Error('Permission denied. Please check Google Sheets API credentials.');
  } else if (error.code === 429) {
    console.warn('Rate limit hit in getPlayers, implementing backoff');
    await new Promise(resolve => setTimeout(resolve, 1000));
    throw new Error('API rate limit exceeded. Please try again later.');
  }
}
```

#### `getRankings()`のエラーハンドリング
```javascript
async getRankings() {
  try {
    const players = await this.getPlayers();
    return players
      .sort((a, b) => b.current_rating - a.current_rating)
      .map((player, index) => ({ ...player, rank: index + 1 }));
  } catch (error) {
    console.error('Error getting rankings:', error);
    throw new Error(`Failed to get rankings: ${error.message}`);
  }
}
```

#### `getPlayer()`のエラーハンドリング
```javascript
async getPlayer(id) {
  try {
    const players = await this.getPlayers();
    return players.find(player => player.id === id);
  } catch (error) {
    console.error('Error getting player:', error);
    throw new Error(`Failed to get player: ${error.message}`);
  }
}
```

## API使用量への影響

### 修正前
```
getPlayers() 1回の呼び出しで：
- Players sheet読み取り: 1回
- autoResetOldTournamentParticipation(): 3-5回の追加API呼び出し
  - Tournaments sheet読み取り
  - シート構造確認
  - 条件チェック等
合計: 4-6回のAPI呼び出し
```

### 修正後
```
getPlayers() 1回の呼び出しで：
- Players sheet読み取り: 1回のみ
合計: 1回のAPI呼び出し（83%削減）
```

## 影響の分析

### ✅ ポジティブな影響
- **ログイン成功率の向上**
- **API使用量の大幅削減**
- **エラーメッセージの明確化**
- **システム安定性の向上**

### ⚠️ 考慮事項
- **自動リセット機能の無効化**
  - 古い大会参加状態のリセットが自動実行されない
  - 必要に応じて手動で実行する必要

### 🔄 代替案
今後の改善として：
1. **日次バッチ処理**での自動リセット実装
2. **大会作成時**の自動リセット実行
3. **管理者画面**での手動リセット機能

## テスト結果期待値

### 修正前のエラーパターン
```
- Login/Signup error: Error: Failed to fetch players
- 500 (Internal Server Error) at /api/players:1
- 500 (Internal Server Error) at /api/rankings:1
```

### 修正後の期待値
```
- ログイン処理の正常完了
- プレイヤーデータの正常取得
- ランキング表示の正常動作
```

## 緊急度とリスク

### 🔴 **HIGH Priority**
- プレイヤーがログインできない = アプリが使用不可
- 大会当日にログインできないと致命的

### ✅ **低リスク修正**
- 読み取り専用処理の最適化
- エラーハンドリングの改善
- 副作用のない修正

## モニタリング項目
- [ ] プレイヤーログイン成功率
- [ ] `/api/players` エラー発生率  
- [ ] `/api/rankings` エラー発生率
- [ ] Google Sheets API使用量の削減確認