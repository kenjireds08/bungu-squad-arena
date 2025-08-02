# 057_player_history_and_rating_fixes.md

## 概要
プレイヤー履歴画面の大会参加履歴表示とレーティング変更表示の重要なバグを修正

## 修正した問題

### 1. 大会参加履歴が表示されない問題
**症状**: 履歴画面で「大会参加履歴がありません」と表示される

**原因**:
- 非同期処理の順序問題：マッチデータの取得前に大会データをフィルタリング
- 大会APIは正常に動作していたが、処理タイミングが間違っていた

**修正内容**:
- `loadTournamentHistory`関数を独立して作成
- マッチデータ取得完了後に大会データを処理するよう順序を修正
- tournament_idで一致しない場合は日付でマッチングするフォールバック機能追加

### 2. レーティング変更の表示バグ（重要）
**症状**: 勝った試合でも「-2」と表示される

**根本原因**:
- `/api/rating-history`が逆の値を返していた
- 勝者に`winner_rating_change: -2`、敗者に`loser_rating_change: +2`

**デバッグ過程**:
1. 最初は`getPlayerRatingChange`関数の論理エラーと判断
2. アラートでAPIレスポンスを確認してAPI側の問題と判明
3. データ例：
   ```
   Winner ID: player_001 (ちーけん)
   API winner_rating_change: -2  ← 本来は+2であるべき
   API loser_rating_change: 2    ← 本来は-2であるべき
   ```

**修正内容**:
```javascript
// HOTFIX: APIが逆の値を返しているため値を入れ替え
const actualWinnerChange = ratingData.loser_rating_change;
const actualLoserChange = ratingData.winner_rating_change;
```

### 3. TournamentResultsViewの参加者数修正
**症状**: 0名と表示される

**修正内容**:
- 実際のマッチデータから参加者数を計算
- `actualParticipants`をstate管理して正しく表示

## 技術的詳細

### 修正されたファイル
- `src/components/PlayerHistory.tsx`: 大会履歴とレーティング表示の修正
- `src/components/TournamentResultsView.tsx`: 参加者数表示の修正

### 非同期処理の改善
```javascript
// 修正前：マッチデータが準備される前に大会フィルタリング
// 修正後：マッチデータ取得後に大会履歴を読み込み
await loadTournamentHistory(matchesWithRating);
```

### APIレスポンス処理の修正
```javascript
// rating-history APIの逆転値に対するホットフィックス
if (match.winner_id === match.player1_id) {
  player1_rating_change = actualWinnerChange; // 正の値
  player2_rating_change = actualLoserChange;  // 負の値
}
```

## 結果
✅ **大会参加履歴が正しく表示される**
- 第四回BUNGU SQUAD大会（2025-08-01）
- 参加者：5名、対戦数：2試合、成績：1勝1敗

✅ **レーティング変更が正しく表示される**
- 勝った試合：+2ポイント（緑色、上向き矢印）
- 負けた試合：-2ポイント（赤色、下向き矢印）

✅ **大会結果の参加者数が正しく表示される**

## 今後のタスク

### 高優先度
- [ ] アイコンとキャラクターデザインを提供されたものに差し替え
- [ ] 独自ドメインでの公開設定
- [ ] 新規参加者のバッジ自動付与テスト

### 中優先度  
- [ ] 統計ページのハードコーディングをデータベース連動に変更
- [ ] 実績ページのハードコーディングをデータベース連動に変更
- [ ] プロフィールの通知設定機能を実装
- [ ] 大会参加者数の計算ロジック修正（エントリーのみ参加者も含む）

### 低優先度
- [ ] 試合の完了時刻が「未記録」になる問題を修正

## 技術的メモ
- `rating-history` APIの根本修正は今後検討（現在はフロントエンド側でホットフィックス対応）
- 大会データとマッチデータの関連付けは日付ベースのフォールバック機能で安定化

---
**作業完了日**: 2025-08-02  
**次回継続**: ワラビサコさんとの打ち合わせ後