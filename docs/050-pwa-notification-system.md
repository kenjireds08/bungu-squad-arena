# PWA通知システム実装

## 実装日時
2025-08-01

## 概要
プレイヤーの試合開始、結果承認、大会開始時にPWA通知を送信するシステムを実装しました。

## 実装した機能

### 1. 通知管理クラス (`src/lib/notifications.ts`)

#### `NotificationManager`
- シングルトンパターンで実装
- 通知権限の要求・管理
- 様々な種類の通知送信

#### 実装済み通知タイプ
1. **試合開始通知**: `notifyMatchStart()`
   - 対戦相手名と試合番号を表示
   - 「試合開始」「後で」のアクションボタン

2. **試合結果承認通知**: `notifyMatchApproved()`  
   - レーティング変動と新レーティングを表示
   - ポジティブ/ネガティブで絵文字を変更

3. **大会開始通知**: `notifyTournamentStart()`
   - 大会名を表示
   - 組み合わせ確認を促す

4. **順番待ち通知**: `notifyTurnComing()`
   - 試合番号と推定待ち時間を表示

### 2. Service Worker拡張 (`public/sw.js`)

#### 追加機能
- **Push通知処理**: `push`イベントリスナー
- **通知クリック処理**: `notificationclick`イベントリスナー
- **バックグラウンド同期**: オフライン時の通知キュー

#### 通知クリック時のナビゲーション
```javascript
switch (data.type) {
  case 'match_start': url = '/#/match-waiting'; break;
  case 'match_approved': url = '/#/dashboard'; break;
  case 'tournament_start': url = '/#/tournament-waiting'; break;
}
```

### 3. React Hook (`src/hooks/useNotifications.ts`)

#### `useNotifications`
- 通知機能をReactコンポーネントで簡単に使用
- Service Workerとの通信処理
- 各種通知メソッドをラップ

### 4. MainDashboard統合

#### 自動通知権限要求
- 初回ロード時に2秒後に権限要求
- ローカルストレージで重複要求を防止

```typescript
useEffect(() => {
  const hasRequestedNotifications = localStorage.getItem('notification-permission-requested');
  if (!hasRequestedNotifications) {
    setTimeout(async () => {
      await requestPermission();
      localStorage.setItem('notification-permission-requested', 'true');
    }, 2000);
  }
}, [requestPermission]);
```

## 通知の特徴

### デザイン
- **アイコン**: `/favicon.ico`
- **バッジ**: `/favicon.ico` 
- **タグ**: `bungu-squad`
- **自動削除**: 10秒後に自動で閉じる
- **相互作用**: `requireInteraction: true`

### アクション処理
- 通知クリック時にアプリにフォーカス
- 適切な画面に自動ナビゲーション
- アプリが閉じている場合は新しいウィンドウで開く

## 使用例

### プレイヤー画面での試合開始通知
```typescript
const { notifyMatchStart } = useNotifications();

// 試合開始時
await notifyMatchStart('田中さん', 1); // 1試合目 vs 田中さん
```

### 管理者承認時の通知
```typescript
const { notifyMatchApproved } = useNotifications();

// レーティング更新時
await notifyMatchApproved(+18, 1618); // +18pt, 新レーティング1618pt
```

## セキュリティとプライバシー

### 通知権限
- ユーザーの明示的な許可が必要
- 拒否された場合は静かに失敗
- 権限状態をローカルストレージで管理

### データ最小化
- 通知に含める情報は必要最小限
- 個人識別情報は含めない

## 今後の拡張予定

### プッシュ通知サーバー
- バックエンドからのプッシュ通知送信
- 試合相手マッチング完了時の通知
- 管理者からのお知らせ通知

### 通知設定
- ユーザーが通知種別を選択可能
- 通知音の設定
- 通知頻度の調整

## テスト項目
- [ ] 通知権限要求の動作確認
- [ ] 各種通知の表示テスト
- [ ] 通知クリック時のナビゲーション
- [ ] オフライン時の通知キュー
- [ ] Service Worker更新時の通知処理