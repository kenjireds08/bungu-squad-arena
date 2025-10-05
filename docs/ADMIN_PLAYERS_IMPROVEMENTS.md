# AdminPlayers UI/UX改善 - Codexレビュー用ドキュメント

**対象ファイル**: `src/components/AdminPlayers.tsx`

**コミットハッシュ**: `4574cb2`

**注記**: このコミットには、以下の3つのUI/UX改善に加えて、前コミット（`1617d24`, `42b33e9`）で実装された試合統計関連のコード（`playerStats`, `isLoadingStats`, `fetchPlayerStats`）も含まれています。本ドキュメントでは、`4574cb2`で追加された3つの改善のみを記載しています。

---

## 📋 変更概要

プレイヤー管理画面の詳細モーダルにおける以下3点の改善：

1. ヘッダー名称変更（「操作」→「詳細」）
2. 削除ボタンに確認ダイアログ追加
3. アクティブ/非アクティブ切り替えボタン追加

---

## 🎯 改善1: ヘッダー名称変更

### 変更箇所: 327行目

**Before:**
```tsx
<TableHead className="text-center">操作</TableHead>
```

**After:**
```tsx
<TableHead className="text-center">詳細</TableHead>
```

### 理由
- 「操作」だと何をするのか不明瞭
- 「詳細」の方が目視アイコンとの整合性が高い
- より直感的なUI表現

---

## 🎯 改善2: 削除確認ダイアログ

### 新規state追加（25行目）

```tsx
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

### handleDeletePlayer関数の変更（85-113行目）

**Before:**
```tsx
const handleDeletePlayer = async (playerId: string, playerName: string) => {
  if (!confirm(`${playerName}を削除しますか？この操作は取り消せません。`)) {
    return;
  }
  // ... 削除処理
}
```

**After:**
```tsx
const handleDeletePlayer = async () => {
  if (!selectedPlayer) return;

  setIsDeleting(true);
  setShowDeleteConfirm(false);  // ダイアログを閉じる

  try {
    const response = await fetch(`/api/players?id=${selectedPlayer.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    // ... エラーハンドリング
    await refetch();
    setSelectedPlayer(null);
  } catch (error) {
    alert(`プレイヤーの削除に失敗しました: ${error.message}`);
  } finally {
    setIsDeleting(false);
  }
};
```

### 削除ボタンの変更（513-520行目）

**Before:**
```tsx
<Button
  variant="outline"
  className="w-32 text-destructive hover:text-destructive hover:bg-destructive/10"
  onClick={() => handleDeletePlayer(selectedPlayer.id, selectedPlayer.nickname)}
  disabled={isDeleting}
>
  {isDeleting ? '削除中...' : '削除'}
</Button>
```

**After:**
```tsx
<Button
  variant="outline"
  className="w-32 text-destructive hover:text-destructive hover:bg-destructive/10"
  onClick={() => setShowDeleteConfirm(true)}  // ダイアログ表示
  disabled={isDeleting}
>
  削除
</Button>
```

### AlertDialog追加（528-560行目）

```tsx
<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>プレイヤーを削除しますか？</AlertDialogTitle>
      <AlertDialogDescription>
        {selectedPlayer && (
          <>
            <span className="font-semibold">{selectedPlayer.nickname}</span> を削除しようとしています。
            <br />
            この操作は取り消せません。本当に削除しますか？
          </>
        )}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>キャンセル</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleDeletePlayer}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeleting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            削除中...
          </>
        ) : (
          '削除する'
        )}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 理由
- 古い`window.confirm()`から shadcn/ui の AlertDialog へ移行
- プレイヤー名を明示して誤削除を防止
- モダンなUI/UXに統一

---

## 🎯 改善3: アクティブ/非アクティブ切り替え

### 新規state追加（26行目）

```tsx
const [isTogglingActive, setIsTogglingActive] = useState(false);
```

### handleToggleActive関数の追加（115-149行目）

```tsx
const handleToggleActive = async () => {
  if (!selectedPlayer) return;

  setIsTogglingActive(true);
  try {
    const response = await fetch(`/api/players?id=${selectedPlayer.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tournament_active: !selectedPlayer.tournament_active
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to toggle active status');
    }

    // Success - refresh data
    await refetch();
    // Update selected player state
    setSelectedPlayer({
      ...selectedPlayer,
      tournament_active: !selectedPlayer.tournament_active
    });

    console.log(`Player ${selectedPlayer.nickname} active status toggled`);
  } catch (error) {
    console.error('Failed to toggle active status:', error);
    alert(`ステータス変更に失敗しました: ${error.message}`);
  } finally {
    setIsTogglingActive(false);
  }
};
```

### UI追加（495-521行目）

**Before:**
```tsx
<div className="flex justify-center pt-4">
  <Button>削除</Button>
</div>
```

**After:**
```tsx
<div className="flex justify-center gap-3 pt-4">
  <Button
    variant="outline"
    onClick={handleToggleActive}
    disabled={isTogglingActive}
    className="w-40"
  >
    {isTogglingActive ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        変更中...
      </>
    ) : selectedPlayer.tournament_active ? (
      '非アクティブにする'
    ) : (
      'アクティブにする'
    )}
  </Button>
  <Button>削除</Button>
</div>
```

### API仕様

- **エンドポイント**: `PATCH /api/players?id={playerId}`
- **リクエストボディ**:
  ```json
  {
    "tournament_active": true / false
  }
  ```
- **レスポンス**: 更新後のプレイヤーデータ

### 理由
- 個別にエントリー状態を変更できるニーズに対応
- アクティブな状態を即座に切り替え可能
- 大会終了後の一括リセット以外の運用に対応

---

## 📊 影響範囲

### 変更ファイル
- `src/components/AdminPlayers.tsx`

### 新規インポート
```tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
```

### 新規state（3つ）
1. `showDeleteConfirm: boolean` - 削除確認ダイアログ表示フラグ
2. `isTogglingActive: boolean` - アクティブ切り替え中フラグ
3. 既存の`isDeleting`を再利用

### 新規関数（1つ）
- `handleToggleActive()` - アクティブ状態切り替え処理

### 変更関数（1つ）
- `handleDeletePlayer()` - 引数削除、ダイアログフロー対応

---

## 🧪 テスト項目

### 手動テスト必須項目

1. **削除確認ダイアログ**
   - [ ] 削除ボタンクリックでAlertDialog表示
   - [ ] プレイヤー名が正しく表示される
   - [ ] キャンセルでモーダルが閉じる
   - [ ] 削除するで実際に削除される
   - [ ] 削除中はスピナー表示

2. **アクティブ切り替え**
   - [ ] アクティブプレイヤーで「非アクティブにする」表示
   - [ ] 非アクティブプレイヤーで「アクティブにする」表示
   - [ ] クリックで状態が切り替わる
   - [ ] 切り替え中はスピナー表示
   - [ ] refetch後、一覧画面も更新される

3. **エラーハンドリング**
   - [ ] API失敗時にalertでエラー表示
   - [ ] ネットワークエラー時の挙動確認

---

## ⚠️ 注意点・懸念事項

### 1. API仕様の確認が必要
- `/api/players?id={id}` の `PATCH` メソッドが実装されているか要確認
- `tournament_active` フィールドのみ更新可能か確認

### 2. 同時実行制御
- 削除中にアクティブ切り替えボタンをdisableにするか検討
- 現状は`isDeleting`と`isTogglingActive`が独立

### 3. UX改善の余地
- アクティブ切り替え成功時にtoast通知を追加してもよい
- 削除成功時もtoast通知があると親切

---

## 📝 まとめ

### ビフォー・アフター

| 項目 | Before | After |
|------|--------|-------|
| ヘッダー | 「操作」 | 「詳細」 |
| 削除確認 | `window.confirm()` | AlertDialog（モダンUI） |
| エントリー状態変更 | ❌ 不可能 | ✅ 個別切り替え可能 |
| プレイヤー名表示 | ❌ なし | ✅ 削除確認に表示 |
| ローディング表示 | 文字のみ | スピナー付き |

### 主要な改善
- **誤削除防止**: AlertDialogによる明確な確認UI
- **運用柔軟性**: 個別のアクティブ状態管理が可能
- **UI/UX統一**: shadcn/uiコンポーネントに統一
- **視認性向上**: スピナー・プレイヤー名表示

---

**作成日**: 2025-10-05
**作成者**: Claude Code
**レビュー依頼先**: Codex
