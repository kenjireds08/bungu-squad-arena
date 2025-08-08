# 069 Player History and Rating Fixes Session (2025-08-08)

## 概要
プレイヤー履歴画面の複数の問題を修正し、レーティング変動の自動計算・表示機能を実装しました。

## 修正前の問題点

1. **試合数の問題**
   - ワラビサコさんの試合が3試合しか表示されない（実際は4試合）
   - 原因：TournamentMatchesシートから最初の2試合が削除されていた

2. **勝敗記録の問題**
   - 0勝3敗と表示される（実際は4勝0敗）
   - 原因：勝敗判定ロジックの誤り

3. **参加者数の問題**
   - 20名と表示される（実際は5名）
   - 原因：`max_participants`を使用していた

4. **レーティング変動の問題**
   - 全ての試合で0と表示される
   - 原因：レーティング変動が計算・保存されていなかった

## 実装した修正

### 1. データ優先順位の修正
```javascript
// MatchResultsシートを優先し、重複を排除
const processedMatchIds = new Set();

// Priority 1: MatchResults（完了済み試合）
// Priority 2: TournamentMatches（未完了試合のみ）
```

### 2. 勝敗判定の修正
```javascript
// statusチェックを削除し、winner_idのみで判定
if (match.winner_id) {
  if (match.winner_id === playerId) {
    result = 'win';
  } else if (match.winner_id === opponent.id) {
    result = 'lose';
  }
}
```

### 3. 参加者数の修正
```javascript
// max_participantsではなくcurrent_participantsを使用
total_participants_that_day: actualParticipants || tournament.current_participants || 0
```

### 4. 自動レーティング計算の実装
```javascript
// 試合完了時に自動的にELOレーティングを計算
const ratingCalculator = new RatingCalculator();
const ratingResult = ratingCalculator.calculateBothPlayersRating(
  winner.current_rating || 1200,
  loser.current_rating || 1200
);

// TournamentMatchesシートに保存
if (idx('player1_rating_change') >= 0) rows[hit][idx('player1_rating_change')] = ratingResult.winner.ratingChange;
if (idx('player2_rating_change') >= 0) rows[hit][idx('player2_rating_change')] = ratingResult.loser.ratingChange;
```

### 5. 既存試合のレーティング再計算機能
```javascript
// デバッグエンドポイント
GET /api/matches?action=debugRatings

// レーティング再計算エンドポイント
POST /api/matches { action: 'recalculateRatings' }
```

## 技術的な変更点

### API層（api/lib/sheets.js）
1. RatingCalculatorクラスをインポート
2. `updateMatchStatus`メソッドにレーティング計算を追加
3. `getTournamentMatches`に`player1_rating_change`/`player2_rating_change`フィールドを追加
4. `getMatchHistory`でレーティング変動データの読み取りロジックを改善

### API層（api/matches.js）
1. `debugRatings`エンドポイントを追加（診断用）
2. `recalculateRatings`エンドポイントを追加（既存試合の再計算用）

### フロントエンド（src/components/PlayerHistory.tsx）
1. 参加者数計算ロジックの修正
2. `current_participants`の優先使用

## 最終結果

ワラビサコさんの履歴表示：
- ✅ **4試合全て表示**
- ✅ **4勝0敗**の正しい成績
- ✅ **5名**の正しい参加者数
- ✅ **「勝利」**バッジの表示
- ✅ **実際のレーティング変動**:
  - vs パンダさん: +13
  - vs としピン: +13
  - vs さこちゃん: +11
  - vs ヨッスィーオ: +13

## 今後の動作

新しい試合では：
1. 試合結果確定時に自動的にELOレーティングを計算
2. TournamentMatchesシートにレーティング変動を保存
3. プレイヤーの現在レーティングを更新
4. 履歴画面で実際のポイント変動を表示

## 作業ログ

1. データ構造の問題を特定（MatchResults vs TournamentMatches）
2. データ優先順位を修正（MatchResultsを優先）
3. 勝敗判定ロジックを簡素化
4. 参加者数の取得元を修正
5. レーティング計算機能を実装
6. 既存試合のレーティングを再計算（9試合）
7. 動作確認完了

---

実装者: Claude Code + @kikuchikenji
日付: 2025年8月8日