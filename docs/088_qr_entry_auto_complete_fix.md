# QRエントリー自動化とiOS PWAカメラ問題の修正

## 修正日時
2025-08-24 21:15

## 修正内容

### 1. 既存ユーザーのQRエントリー自動化

#### 問題
- 既にログイン済みのユーザーがQRコードをスキャンすると「大会エントリー完了」と表示されるが、その後新規登録画面に遷移してしまう
- 本来は自動的に大会待機画面に遷移すべき

#### 解決策
`TournamentEntry.tsx`に以下の修正を実装：
- QRコードからアクセスした既存ユーザーを検出
- 自動的にエントリー処理を開始
- エントリー完了後、待機画面へ自動遷移

#### 修正箇所
- `TournamentEntry.tsx` 320-340行目: 自動エントリー処理の追加
- `TournamentEntry.tsx` 341-356行目: 自動エントリーイベントリスナーの追加

### 2. iPhone PWAでのカメラ起動問題

#### 問題
- iPhoneのPWAアプリからQRスキャンを開始すると「カメラを起動中...」のまま進まない
- iOS PWAの制限によりカメラアクセスが制限される場合がある

#### 解決策
`QRScanner.tsx`に以下の修正を実装：
- iOS PWA環境を検出
- カメラが使用できない場合は自動的に「写真から読み取る」オプションを表示
- ファイル入力によるQRコード読み取りを提供

#### 修正箇所
- `QRScanner.tsx` 84-96行目: iOS PWAチェックとフォールバック処理
- `QRScanner.tsx` 106-124行目: iOS PWA用のカメラ制約設定
- `QRScanner.tsx` 493-524行目: ファイル入力UIの追加

## 動作確認事項

### 既存ユーザーのQRエントリー
1. ログイン済みアカウントでQRコードをスキャン
2. 自動的にエントリー処理が開始される
3. エントリー完了後、待機画面に自動遷移

### iPhone PWAカメラ
1. iOS PWAでQRスキャン開始
2. カメラが起動しない場合、「写真から読み取る」ボタンが表示される
3. カメラアプリで撮影したQRコード画像を選択して読み取り可能

## 技術的詳細

### 自動エントリーのフロー
```javascript
1. QRコードスキャン
2. URLパラメータにuser_id付与
3. TournamentEntryコンポーネントでuser_id検出
4. 既存ユーザーの場合、500ms後に自動エントリー開始
5. エントリー完了後、2秒で待機画面へ遷移
```

### iOS PWA対応
```javascript
// iOS PWA検出
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = window.navigator.standalone === true;
const isPWA = window.matchMedia('(display-mode: standalone)').matches;

// カメラ制約の調整
const constraints = isIOSPWA ? {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }
} : {
  video: true
};
```

## 関連ファイル
- `/src/components/TournamentEntry.tsx`
- `/src/components/QRScanner.tsx`