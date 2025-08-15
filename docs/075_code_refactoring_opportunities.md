# 075 - コードリファクタリングの機会

## 日付
2025-08-15

## 現状の課題
- 機能追加を重ねた結果、重複コードが存在
- 大きなファイル（1000行超）が存在
- API呼び出しやエラーハンドリングの重複

## リファクタリング候補

### 1. 大きなファイル（要分割検討）
- TournamentManagementView.tsx (1395行)
- TournamentMatchesView.tsx (972行)
- TournamentEntry.tsx (880行)
- TournamentMatchesEditor.tsx (832行)

### 2. 重複しているAPI呼び出し
- `fetch('/api/tournaments')` - 3箇所
- `fetch('/api/players')` - 2箇所
- `tournament_active`の処理 - 6箇所以上

### 3. 共通化できそうな処理

#### API関連
- エラーハンドリング
- ローディング状態管理
- リトライ処理

#### UI関連
- カード表示
- ローディングスピナー
- エラー表示
- 成功/失敗トースト

#### ビジネスロジック
- tournament_activeの判定
- 大会ステータスの判定
- 日付フォーマット

## 安全なリファクタリング方針

### Phase 1: 定数の一元化（低リスク）
```typescript
// src/constants/game.ts
export const GAME_TYPES = {
  TRUMP: 'trump',
  CARDPLUS: 'cardplus'
} as const;

export const TOURNAMENT_STATUS = {
  UPCOMING: 'upcoming',
  ACTIVE: 'active',
  COMPLETED: 'completed'
} as const;
```

### Phase 2: カスタムフックの強化（中リスク）
- useApi.tsに共通処理を追加
- エラーハンドリングの統一
- キャッシュ戦略の改善

### Phase 3: コンポーネント分割（高リスク）
- 大きなコンポーネントを小さく分割
- 共通UIコンポーネントの抽出
- テスト後にデプロイ

## 次のステップ
1. まずは定数の一元化から開始
2. 各変更後に必ずテスト
3. 段階的にデプロイして動作確認

## 注意点
- 本番環境への影響を最小限に
- 1度に大きな変更をしない
- バックアップとrollback計画を準備