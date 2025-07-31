# 試合結果報告システム実装

## 実装日時
2025-08-01

## 概要
プレイヤーが試合結果を報告し、管理者が承認するワークフローシステムを実装しました。

## 実装した機能

### 1. バックエンドAPI

#### `/api/matchResults.js`
- **POST**: プレイヤーが試合結果を報告
- **GET**: 管理者が承認待ちの結果を取得
- **PUT**: 管理者が結果を承認/却下

#### Google Sheetsの新シート: `MatchResults`
```
| result_id | match_id | player_id | opponent_id | result | timestamp | status | admin_notes |
|-----------|----------|-----------|-------------|--------|-----------|--------|-------------|
```

### 2. フロントエンドAPI統合

#### `src/lib/api.ts`に追加
- `submitMatchResult()`: 結果報告
- `getPendingMatchResults()`: 承認待ち取得
- `approveMatchResult()`: 承認処理

#### `src/hooks/useApi.ts`に追加
- `useSubmitMatchResult()`: 結果報告
- `usePendingMatchResults()`: 承認待ち監視（30秒間隔）
- `useApproveMatchResult()`: 承認処理

### 3. ワークフロー

1. **プレイヤー**: 試合終了後、勝ち/負けを報告
   - MatchResultReportコンポーネントで結果選択
   - APIで`pending_approval`状態で記録

2. **管理者通知**: 
   - `usePendingMatchResults`で30秒間隔で新しい報告を監視
   - 大会運営ページの進行状況タブに通知表示

3. **管理者承認**:
   - 承認 → レーティング更新（次に実装）
   - 却下 → 結果を無効化

## レーティング更新システム実装完了

### ELOレーティング計算アルゴリズム (`/api/lib/rating.js`)
- **K-factor**: 32 (標準的な値)
- **Base rating**: 1500 (新規プレイヤー)
- **最低レーティング**: 100

#### 計算式
```javascript
expectedScore = 1 / (1 + 10^((opponentRating - playerRating) / 400))
ratingChange = K * (actualScore - expectedScore)
newRating = max(100, currentRating + ratingChange)
```

### 自動レーティング更新機能
1. **承認時の処理**: 管理者が試合結果を承認すると自動実行
2. **両プレイヤーの更新**: 勝者と敗者の両方のレーティングを同時更新
3. **統計情報の更新**: 勝数・敗数も同時に更新

### 新しいGoogle Sheetsシート

#### `RatingHistory`シート
レーティング変更の履歴を記録
```
| history_id | player_id | opponent_id | player_old_rating | player_new_rating | opponent_old_rating | opponent_new_rating | result | timestamp |
```

### レーティング更新処理の流れ
1. 管理者が承認 → `approveMatchResult()`
2. プレイヤー情報を取得 → `getPlayers()`
3. レーティング計算 → `RatingCalculator.calculateBothPlayersRating()`
4. プレイヤー統計更新 → `updatePlayerRatingAndStats()`
5. 履歴記録 → `recordRatingHistory()`

## 次の実装予定

### PWA通知システム
- 試合開始時のプッシュ通知
- 結果承認時の通知

### 管理者手動入力機能
- 管理者が直接試合結果を入力・承認できる機能

## 技術詳細

### データフロー
```
Player → MatchResultReport → API → Google Sheets
                                      ↓
Admin ← Tournament Management ← API ← MatchResults Sheet
```

### セキュリティ
- プレイヤーIDとマッチIDの検証
- 重複報告の防止
- 管理者権限の確認

## テスト項目
- [ ] プレイヤーの結果報告
- [ ] 管理者の承認待ち一覧表示
- [ ] 管理者の承認/却下処理
- [ ] レーティング更新（実装後）