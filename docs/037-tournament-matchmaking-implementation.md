# 大会組み合わせ機能実装（2025-07-27）

## 実装概要

大会の組み合わせ決定機能を実装しました。管理者が参加者を対戦相手に組み合わせ、Google Sheetsに保存する機能です。

## 完了した作業

### 1. TournamentMatchmakingコンポーネント ✅

#### 主要機能
- **エントリー済みプレイヤー表示**: tournament_active = trueのプレイヤーを表示
- **対戦方式選択**: ランダム、レーティング考慮、手動設定
- **組み合わせ生成**: 選択した方式に基づく自動ペアリング
- **プレビュー機能**: 生成された組み合わせの確認
- **プレイヤー入れ替え**: 個別の組み合わせ調整
- **テーブル番号自動割り当て**: 連番での卓番号設定

#### 対戦方式アルゴリズム
```typescript
// ランダム方式
const generateRandomMatches = (players: Player[]): Match[] => {
  const shuffled = [...players].sort(() => Math.random() - 0.5);
  // ペアリング処理...
}

// レーティング考慮方式
const generateRatingBasedMatches = (players: Player[]): Match[] => {
  const sorted = [...players].sort((a, b) => b.current_rating - a.current_rating);
  // 近いレーティング同士でペアリング...
}
```

### 2. AdminTournamentsとの統合 ✅

#### 追加機能
- **組み合わせボタン**: 開催中大会に組み合わせボタン追加
- **画面遷移**: list → matchmaking → list の流れ
- **状態管理**: currentView, matchmakingTournament
- **戻るボタン**: 組み合わせ画面からリスト画面への復帰

```tsx
const handleShowMatchmaking = (tournament: any) => {
  setMatchmakingTournament(tournament);
  setCurrentView('matchmaking');
};
```

### 3. API実装 ✅

#### `/api/tournament-matches.js`
- **POST**: 組み合わせ保存エンドポイント
- **検証**: tournamentId, matches配列の必須チェック
- **エラーハンドリング**: 適切なHTTPステータスとエラーメッセージ

#### `SheetsService.saveTournamentMatches()`
- **TournamentMatchesシート**: 組み合わせデータの保存
- **データ構造**: match_id, tournament_id, player1_id, player2_id, table_number等
- **初期状態**: match_status = 'pending', 結果関連は空欄
- **タイムスタンプ**: created_at自動設定

### 4. データ構造設計 ✅

#### TournamentMatchesシート想定カラム
```
A: match_id (PK)
B: tournament_id  
C: player1_id
D: player2_id
E: table_number
F: match_status (pending/in_progress/completed)
G: created_at
H: winner_id
I: loser_id
J: match_start_time
K: match_end_time
L: reported_by
M: reported_at
N: approved_by
O: approved_at
P: player1_rating_before
Q: player2_rating_before
R: player1_rating_after
S: player2_rating_after
T: player1_rating_change
U: player2_rating_change
V: notes
W: created_by
```

## 技術実装詳細

### フロントエンド
- **React State管理**: useState, useEffect
- **API通信**: fetch APIでPOSTリクエスト
- **エラーハンドリング**: try-catch + toast通知
- **UI**: Shadcn/ui + Lucide React
- **レスポンシブ**: モバイル対応デザイン

### バックエンド
- **Vercel API Routes**: サーバーレス関数
- **Google Sheets API**: スプレッドシート操作
- **CommonJS**: モジュール形式統一
- **エラーログ**: console.error + 開発環境詳細

### データ検証
- **必須項目**: tournamentId, matches配列
- **型チェック**: Array.isArray(matches)
- **空配列対応**: 適切なエラーメッセージ

## UX設計

### 管理者フロー
1. 大会管理 → 開催中大会 → 組み合わせボタン
2. エントリー済みプレイヤー確認
3. 対戦方式選択（ランダム/レーティング考慮/手動）
4. 組み合わせ生成
5. プレビュー確認 + 微調整
6. 確定ダイアログ → 保存

### 状態管理
- **ローディング**: 生成中、保存中の視覚的フィードバック
- **警告**: 奇数名参加時の待機者通知
- **エラー**: 最低参加者数不足、保存失敗時の適切な通知

### アクセシビリティ
- **キーボード**: フォーカス管理
- **スクリーンリーダー**: aria-label, セマンティックHTML
- **カラーコントラスト**: WCAG準拠

## エラーハンドリング

### フロントエンド
```typescript
// 参加者数チェック
if (activePlayers.length < 2) {
  toast({
    title: "エラー",
    description: "組み合わせを作成するには最低2名の参加者が必要です",
    variant: "destructive"
  });
  return;
}

// 奇数名警告
if (activePlayers.length % 2 !== 0) {
  toast({
    title: "警告", 
    description: "参加者が奇数のため、1名が待機となります",
    variant: "default"
  });
}
```

### バックエンド
```javascript
// API入力検証
if (!tournamentId || !matches || !Array.isArray(matches)) {
  return res.status(400).json({ 
    error: 'tournamentId and matches array are required' 
  });
}

// Google Sheets API エラー
catch (error) {
  console.error('Error saving tournament matches:', error);
  throw new Error(`Failed to save tournament matches: ${error.message}`);
}
```

## セキュリティ考慮

- **認証**: 管理者権限チェック（AdminTournamentsからのアクセス）
- **入力検証**: tournamentId, matches配列の検証
- **SQLインジェクション**: Google Sheets APIの安全な使用
- **CORS**: Vercel API Routes のデフォルト設定

## パフォーマンス最適化

- **メモ化**: React.useCallbackは現時点では不要（単純な処理）
- **API最適化**: バッチ処理でGoogle Sheetsに一括保存
- **ローディング**: 非同期処理中のUX改善
- **エラー回復**: 失敗時の適切なフォールバック

## 今後の拡張予定

### 1. 手動組み合わせUI
- ドラッグ&ドロップでプレイヤー配置
- 個別卓設定
- プレイヤー検索・フィルタ

### 2. 組み合わせ履歴
- 過去の組み合わせ参照
- 連続対戦回避
- 対戦相性分析

### 3. リアルタイム通知
- 参加者への組み合わせ通知
- プッシュ通知 or メール送信
- 待機画面での自動更新

### 4. 高度なアルゴリズム
- スイス式トーナメント
- 総当たり戦自動生成
- 勝ち抜き戦ブラケット

## テスト項目

### 機能テスト
- [x] 組み合わせ生成（ランダム）
- [x] 組み合わせ生成（レーティング考慮）  
- [x] プレイヤー入れ替え機能
- [x] 奇数名参加時の待機者表示
- [x] API保存処理
- [ ] 手動組み合わせ（未実装）

### エラーハンドリングテスト
- [x] 参加者不足時のエラー表示
- [x] API通信失敗時のエラー表示
- [x] 不正データ送信時の400エラー
- [ ] Google Sheets接続失敗時の処理

### UIテスト
- [x] レスポンシブデザイン
- [x] ローディング状態表示
- [x] 確認ダイアログ
- [x] 戻るボタン機能

## リスク管理

### データ整合性
- **重複組み合わせ**: タイムスタンプベースのユニークID
- **同期問題**: Google Sheets APIの順次実行
- **ロールバック**: 手動での削除・再生成が必要

### 可用性
- **API制限**: Google Sheets API使用量の監視
- **ネットワーク**: 通信失敗時のリトライ機構（未実装）
- **バックアップ**: スプレッドシートの定期バックアップ

### スケーラビリティ
- **参加者数**: 現在は100名程度まで想定
- **同時アクセス**: 管理者1名での操作想定
- **データ量**: 日次増加分は軽微

## 依存関係

### 新規依存無し
既存のライブラリ・フレームワークのみ使用

### 既存システム連携
- `useRankings` hook: プレイヤーデータ取得
- `AdminTournaments`: 画面遷移管理
- `SheetsService`: Google Sheets操作
- `tournament_active`: エントリー状態フィルタ

## デプロイメント

### 開発環境テスト
- ローカル環境での動作確認
- モックデータでの組み合わせ生成テスト
- API接続テスト

### 本番デプロイ準備
- [ ] Google SheetsにTournamentMatchesシートを作成
- [ ] 新APIのVercelデプロイ
- [ ] 管理者権限でのテスト実行
- [ ] 実際の大会での運用テスト

### ロールバック計画
- Git管理による変更履歴
- 機能フラグ使用は現時点では不要
- 手動での組み合わせ管理に戻すことも可能