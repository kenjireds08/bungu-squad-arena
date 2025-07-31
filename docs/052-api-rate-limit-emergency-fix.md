# APIレート制限エラーの緊急修正

## 実装日時
2025-08-01

## 緊急事象
Google Sheets APIのレート制限エラーが400件以上発生し、コンソールログが大量のエラーで埋まる状況。10秒間隔のリアルタイム更新がAPIクォータを超過。

## 修正内容

### 1. リアルタイム更新間隔の調整

#### Before（問題のあった設定）
- TournamentMatchesView: 10秒間隔
- TournamentManagementView: 10秒間隔
- useRankings: 30秒間隔
- useTournaments: 45秒間隔
- usePendingMatchResults: 30秒間隔

#### After（修正後の設定）
```typescript
// Component level intervals
fetchMatches: 60秒間隔 (10秒→60秒)

// React Query intervals
useRankings: 120秒間隔 (30秒→120秒)
useTournaments: 180秒間隔 (45秒→180秒)
usePendingMatchResults: 120秒間隔 (30秒→120秒)
```

### 2. エラーハンドリングの改善

#### 429エラー（レート制限）の適切な処理
```typescript
} else if (response.status === 429) {
  console.warn('API rate limit exceeded. Reducing request frequency.');
} else {
  console.error('API Error:', response.status, response.statusText);
}
```

#### ネットワークエラーの静かな処理
```typescript
} catch (error) {
  // Network error or other issues - fail silently to avoid console spam
  console.warn('Network error fetching matches, will retry later:', error.message);
}
```

### 3. 手動更新機能の追加

#### ユーザー制御による更新
- ヘッダーに「更新」ボタンを追加
- ユーザーが必要な時だけデータを更新可能
- スピナーアニメーションで更新状態を表示

```typescript
const handleManualRefresh = async () => {
  setIsRefreshing(true);
  await fetchMatches();
  setIsRefreshing(false);
};
```

### 4. React Queryの最適化

#### リトライ回数の削減
```typescript
retry: 1, // 2回→1回に削減
```

#### Stale Timeの延長
データの有効期間を延長してAPIコール頻度を削減

## APIクォータ使用量の削減効果

### 修正前の推定使用量（1時間あたり）
- TournamentMatchesView: 360回 (10秒×6回/分×60分)
- TournamentManagementView: 360回
- useRankings: 120回 (30秒×2回/分×60分)
- 合計: 約840回/時間

### 修正後の推定使用量（1時間あたり）
- TournamentMatchesView: 60回 (60秒×1回/分×60分)
- TournamentManagementView: 60回
- useRankings: 30回 (120秒×0.5回/分×60分)
- 合計: 約150回/時間

**削減率: 約82%の削減**

## ユーザー体験への影響

### ポジティブな影響 ✅
- コンソールエラーの大幅削減
- アプリの安定性向上
- 手動更新によるユーザー制御

### 考慮事項 ⚠️
- リアルタイム性の若干の低下（10秒→60秒）
- ユーザーが手動で更新する必要がある場合

## 今後の改善案

### 1. WebSocket実装
- リアルタイム通信でAPIコールを削減
- より効率的な双方向通信

### 2. Server-Sent Events (SSE)
- サーバー側からの変更通知
- 必要な時だけクライアント更新

### 3. 差分更新機能
- 変更があった部分のみ取得
- 無駄なデータ転送を削減

## モニタリング項目

- [ ] 修正後のAPIエラー発生率
- [ ] Google Sheets APIクォータ使用量
- [ ] ユーザーの手動更新頻度
- [ ] アプリの応答性とパフォーマンス

## 緊急度
🔴 **HIGH** - 本番環境での継続的なAPIエラーが発生していたため緊急修正を実施