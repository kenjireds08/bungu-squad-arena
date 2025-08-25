# QRエントリー完全修正

## 修正日時
2025-08-24 21:45

## 修正した問題

### 1. パソコンでエントリー後に画面が真っ白になる問題
- **原因**: window.location.replaceによるSPAルーティングの破壊
- **解決**: React Routerのnavigateを使用するように修正

### 2. エントリーが実際にデータベースに保存されない問題
- **原因**: 既存ユーザーのtournament_activeフラグが更新されない
- **解決**: API側とフロントエンドの両方で適切に更新

### 3. 自動エントリーのタイミング問題
- **原因**: useEffectとイベントリスナーの非同期処理の競合
- **解決**: sessionStorageを使用した状態管理とuseCallbackによる最適化

## 技術的詳細

### フロントエンド修正（TournamentEntry.tsx）
```javascript
// 1. useCallbackを使用してhandleEntryをメモ化
const handleEntry = useCallback(async () => {
  // エントリー処理
}, [tournament, isFromQR, nickname, email, navigate, toast, updateTournamentActive]);

// 2. 自動エントリーの改善
useEffect(() => {
  const autoEntryPending = sessionStorage.getItem('autoEntryPending');
  if (autoEntryPending === 'true' && 条件) {
    sessionStorage.removeItem('autoEntryPending');
    setTimeout(() => handleEntry(), 100);
  }
}, [依存配列]);

// 3. navigateを使用（SPAルーティング維持）
navigate(`/tournament-waiting${queryParams}`);
```

### バックエンド修正（admin.js）
```javascript
// 既存ユーザーのtournament_activeも更新
await sheetsService.updatePlayer(userId, { tournament_active: true });
console.log(`Updated tournament_active flag for player ${userId}`);
```

## 動作確認項目

✅ パソコンでQRスキャン → 既存ユーザーは自動エントリー → 待機画面へ遷移
✅ iPhone PWAでQRスキャン → エントリー成功 → データベースに保存
✅ 新規ユーザーの登録 → 正常動作
✅ 既存ユーザーのtournament_activeフラグ → 正しく更新

## API変更点

### /api/admin?action=tournament-entry
- 既存ユーザーのtournament_activeフラグを確実に更新
- TournamentParticipantsシートへの追加と同期
- エラーハンドリングの強化

## 関連ファイル
- `/src/components/TournamentEntry.tsx`
- `/src/components/QRScanner.tsx`
- `/api/admin.js`

## 今後の課題
- Service Workerのキャッシュ戦略の最適化
- PWAでのカメラ権限管理の改善
- オフライン時の動作改善