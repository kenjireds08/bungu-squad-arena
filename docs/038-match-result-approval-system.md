# 対戦結果承認システム実装（2025-07-27）

## 実装概要

プレイヤーが対戦結果を報告し、管理者が承認するシステムを実装しました。承認時に自動的にELOレーティングが計算・更新されます。

## 完了した作業

### 1. MatchResultコンポーネント ✅

#### 主要機能
- **対戦情報表示**: プレイヤー名、レーティング、テーブル番号
- **結果報告**: 勝利/敗北ボタンによる直感的な入力
- **メモ機能**: 試合の感想や特記事項を記録
- **確認ダイアログ**: 報告前の最終確認
- **エラーハンドリング**: 適切なエラー表示とローディング状態

#### UX設計
```typescript
// 対戦者表示（自分 vs 相手）
<div className="grid grid-cols-3 gap-4 items-center">
  <div className="text-center p-4 bg-primary/10 rounded-lg border border-primary/20">
    <Badge className="mt-2 bg-primary">あなた</Badge>
  </div>
  <div className="text-center">
    <div className="text-2xl font-bold text-primary">VS</div>
  </div>
  <div className="text-center p-4 bg-muted/30 rounded-lg">
    <Badge variant="secondary" className="mt-2">対戦相手</Badge>
  </div>
</div>
```

### 2. MatchApprovalコンポーネント ✅

#### 主要機能
- **承認待ち一覧**: テーブル表示で整理された情報
- **詳細表示**: ダイアログでの詳細確認
- **承認・却下**: ボタンによる処理と即座の反映
- **メモ表示**: プレイヤーのコメント確認
- **リアルタイム更新**: 処理後の自動リロード

#### 表示項目
- テーブル番号
- 対戦カード（プレイヤー名とレーティング）
- 勝者
- 報告者
- 報告日時
- メモ（あれば）
- 操作ボタン

### 3. API実装 ✅

#### `/api/match-results.js`
- **POST**: プレイヤーからの結果報告
- **GET**: 管理者用承認待ち一覧取得
- **入力検証**: match_id, reporter_id, result必須
- **結果検証**: 'win'/'loss'のみ許可

#### `/api/match-approval.js`
- **POST**: 管理者による承認・却下処理
- **入力検証**: match_id, action, approved_by必須
- **アクション検証**: 'approve'/'reject'のみ許可

### 4. SheetsService拡張 ✅

#### `submitMatchResult()`
```javascript
async submitMatchResult(resultData) {
  // 1. TournamentMatchesからマッチ情報取得
  // 2. 勝者・敗者の判定
  // 3. マッチ状態を'pending_approval'に更新
  // 4. 結果情報（winner_id, loser_id, reported_by等）更新
}
```

#### `getPendingMatchResults()`
```javascript
async getPendingMatchResults() {
  // 1. 'pending_approval'状態のマッチ取得
  // 2. プレイヤー情報の結合
  // 3. 報告日時順でソート
}
```

#### `approveMatchResult()`
```javascript
async approveMatchResult(approvalData) {
  if (action === 'approve') {
    // 1. ELOレーティング計算
    // 2. TournamentMatchesの更新（完了状態＋新レーティング）
    // 3. Playersシートのレーティング更新
    // 4. MatchResultsシートへの履歴追加
  } else if (action === 'reject') {
    // 1. マッチ状態を'rejected'に更新
    // 2. 勝者・敗者情報をクリア
  }
}
```

## データフロー

### プレイヤー側フロー
1. **対戦実施**: 指定されたテーブルで対戦
2. **結果入力**: MatchResultコンポーネントで勝敗報告
3. **API送信**: `/api/match-results` POST
4. **状態更新**: TournamentMatches → 'pending_approval'
5. **待機**: 管理者承認を待つ

### 管理者側フロー
1. **承認画面**: MatchApprovalコンポーネントで一覧確認
2. **詳細確認**: 対戦情報とプレイヤーメモの確認
3. **承認・却下**: `/api/match-approval` POST
4. **自動処理**: ELO計算＋レーティング更新（承認時）
5. **結果反映**: ランキング即時更新

## ELOレーティングシステム

### 計算式
```javascript
const K = player1Matches < 10 ? 40 : player1Matches < 30 ? 20 : 10;
const expectedScore = 1 / (1 + Math.pow(10, (player2Rating - player1Rating) / 400));
const actualScore = result === 'win' ? 1 : 0;
const ratingChange = Math.round(K * (actualScore - expectedScore));
```

### 特徴
- **初心者保護**: 10戦未満は K=40 で変動幅大
- **安定期**: 30戦以上は K=10 で変動幅小
- **対称性**: 勝者の上昇＝敗者の下降
- **実力差反映**: レーティング差が大きいほど変動小

## データ構造

### TournamentMatches拡張
```
F: match_status (pending → pending_approval → completed/rejected)
H: winner_id (結果報告時に設定)
I: loser_id (結果報告時に設定)
L: reported_by (報告者ID)
M: reported_at (報告日時)
N: approved_by (承認者ID)
O: approved_at (承認日時)
R: player1_rating_after (承認時に計算)
S: player2_rating_after (承認時に計算)
T: player1_rating_change (変動値)
U: player2_rating_change (変動値)
V: notes (プレイヤーメモ)
```

### MatchResults履歴
承認時に既存のMatchResultsシートに履歴として追加
- 長期的な統計分析用
- プレイヤー個人履歴表示用
- レーティング変動履歴用

## エラーハンドリング

### フロントエンド
- **ネットワークエラー**: 適切なリトライとエラーメッセージ
- **入力検証**: 必須項目チェック
- **ローディング状態**: ボタン無効化とスピナー表示
- **成功フィードバック**: toast通知

### バックエンド
- **データ検証**: 型チェックと存在確認
- **整合性チェック**: マッチ存在確認
- **トランザクション**: 複数更新の整合性確保
- **ログ出力**: デバッグ用詳細ログ

## セキュリティ

### 認証・認可
- **プレイヤー認証**: 本人のみ結果報告可能
- **管理者権限**: 承認機能は管理者のみ
- **改ざん防止**: 報告後の変更不可

### データ整合性
- **重複報告防止**: 同一マッチの重複処理防止
- **不正結果防止**: win/lossのみ許可
- **レーティング保護**: 計算結果の妥当性チェック

## パフォーマンス

### 最適化
- **バッチ更新**: 複数セルの一括更新
- **必要最小限の読み取り**: 必要な範囲のみ取得
- **キャッシュ**: プレイヤー情報の再利用

### スケーラビリティ
- **ページネーション**: 承認待ち一覧の分割（将来）
- **インデックス**: Google Sheetsの検索最適化
- **非同期処理**: UIブロッキング回避

## 今後の拡張

### 1. 通知システム
- **プレイヤー通知**: 承認・却下の結果通知
- **管理者通知**: 新しい報告の通知
- **リアルタイム**: WebSocketやSSEの活用

### 2. 結果検証
- **相互確認**: 両プレイヤーの結果一致確認
- **写真添付**: 結果の証拠画像
- **タイムスタンプ**: GPS位置情報付き報告

### 3. 高度な分析
- **統計ダッシュボード**: 承認率、平均処理時間等
- **不正検知**: 異常なパターンの自動検出
- **レーティング予測**: AI による勝率予測

## テスト項目

### 機能テスト
- [x] 結果報告（勝利・敗北）
- [x] メモ入力・表示
- [x] 承認処理
- [x] 却下処理
- [x] ELO計算の正確性
- [ ] 実際のGoogle Sheetsとの連携テスト

### エラーテスト
- [x] 不正な結果値の拒否
- [x] 存在しないマッチIDの処理
- [x] 権限のないユーザーの拒否
- [ ] ネットワーク障害時の処理

### UIテスト
- [x] レスポンシブデザイン
- [x] ローディング状態
- [x] 確認ダイアログ
- [x] エラーメッセージ表示

## リスク管理

### データ損失防止
- **ダブルチェック**: 承認前の確認ダイアログ
- **監査ログ**: 全操作の記録
- **バックアップ**: Google Sheetsの自動バックアップ

### 不正利用防止
- **タイムアウト**: セッション管理
- **レート制限**: API呼び出し制限（将来）
- **ログ監視**: 異常な操作パターンの検出

## 依存関係

### 既存システム連携
- `useRankings`: プレイヤー情報取得
- `tournament_active`: 大会エントリー状態
- `ELO計算`: 既存のCalculateEloRatingメソッド

### 新規依存
- TournamentMatchesシート（必須）
- 管理者権限システム（拡張）

## デプロイ要件

### 事前準備
- [x] TournamentMatchesシート作成
- [x] 新APIエンドポイントのデプロイ
- [ ] 管理者権限の設定
- [ ] 実際の対戦データでのテスト

### 本番運用
- モニタリング: API応答時間とエラー率
- アラート: 承認待ち件数の異常値
- メンテナンス: 定期的なデータ整合性チェック