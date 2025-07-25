# Webアプリ版 技術仕様書

## 🏗️ システムアーキテクチャ

### 技術スタック
- **フロントエンド**: HTML/CSS/JavaScript
- **バックエンド**: Google Apps Script (GAS)
- **データベース**: Google Spreadsheet
- **ホスティング**: GAS Web App（無料）
- **認証**: 簡易PIN認証

## 📊 データベース設計

### スプレッドシート構成

#### 参加者マスターシート
```
A列: 参加者名 (例: 田中太郎)
B列: PIN (例: 1234)
C列: 現在レート (例: 1500)
D列: 現在順位 (例: 3)
E列: 次の対戦相手 (例: 佐藤花子)
F列: 参加大会履歴
```

#### 大会別シート（例: 第1回大会_2024-07-20）
```
A列: 試合ID
B列: プレイヤー1
C列: プレイヤー2
D列: 勝者
E列: プレイヤー1レート変動
F列: プレイヤー2レート変動
G列: 試合状況 (待機/進行中/完了)
H列: 卓番号
I列: 開始時刻
J列: 終了時刻
```

#### 進行管理シート
```
A列: 卓番号
B列: 現在の対戦
C列: 状況 (🔵進行中/🟢完了/⏸️待機)
D列: 開始時刻
E列: 予想終了時刻
```

## 🎮 主要機能仕様

### 1. 大会作成機能

#### 画面構成
- 大会名入力フィールド
- 日付選択
- 参加者追加フォーム
- 大会形式選択（ランダム/総当たり/手動）

#### 処理フロー
1. 新しい大会シート自動作成
2. 参加者データの登録
3. 初期レート設定（新規: 1500pt、既存: 前回レート）

### 2. 対戦組み合わせ生成

#### ランダム方式
```javascript
// 疑似コード
function generateRandomMatches(players) {
  shuffleArray(players);
  return createPairs(players);
}
```

#### 総当たり方式
```javascript
// 疑似コード
function generateRoundRobin(players) {
  const matches = [];
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push([players[i], players[j]]);
    }
  }
  return matches;
}
```

#### 手動設定
- ドラッグ&ドロップインターフェース
- プレイヤー選択プルダウン
- 対戦カード編集機能

### 3. 進行状況管理

#### 卓管理機能
- 複数卓の同時進行対応
- 各卓の状況表示：
  - 🟢 完了
  - 🔵 進行中  
  - ⏸️ 待機

#### 操作フロー
1. **試合開始**: 「開始」ボタン → 状況を「進行中」に更新
2. **結果入力**: 勝者選択 → Elo計算実行 → 状況を「完了」に更新
3. **次の試合**: 自動的に次の組み合わせを「待機」から「進行中」に

### 4. Eloレーティング計算

#### 計算式実装
```javascript
function calculateEloRating(playerRating, opponentRating, result, kFactor = 20) {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  const newRating = playerRating + kFactor * (result - expectedScore);
  return Math.round(newRating);
}
```

#### パラメータ
- **K値**: 20（標準）
- **初期レート**: 1500pt
- **勝利**: 1点
- **敗北**: 0点

### 5. 個人認証システム

#### 簡易PIN認証
```javascript
function authenticatePlayer(name, pin) {
  const playerData = getPlayerData(name);
  return playerData.pin === pin;
}
```

#### 個人ダッシュボード表示項目
- 現在の順位・レート
- 前回からの変動
- 次の対戦相手
- 待ち時間（推定）
- 対戦履歴

### 6. リアルタイム表示

#### 順位表示
```
🏆 リアルタイム順位表
🥇 田中太郎  1520pt (▲+15pt)
🥈 佐藤花子  1485pt (▼-8pt)  
🥉 山田次郎  1456pt (▲+12pt)
```

#### 進行状況表示
```
📊 大会進行状況
完了: 15/28試合 (53.6%)
卓1: 🟢 完了  卓2: 🔵 進行中  卓3: ⏸️ 待機
予想終了時刻: 15:30
```

## 🔧 技術実装詳細

### GAS関数構成

#### メイン関数
```javascript
// Webアプリのメインエントリーポイント
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

// フロントエンドからの呼び出し処理
function doPost(e) {
  const action = e.parameter.action;
  switch(action) {
    case 'createTournament': return createTournament(e.parameter);
    case 'generateMatches': return generateMatches(e.parameter);
    case 'updateMatchResult': return updateMatchResult(e.parameter);
    case 'getPlayerData': return getPlayerData(e.parameter);
  }
}
```

#### データ操作関数
```javascript
// 大会作成
function createTournament(params) {
  // 新しいシート作成
  // 参加者登録
  // 初期設定
}

// 対戦結果更新
function updateMatchResult(params) {
  // Elo計算
  // レート更新
  // 順位再計算
  // 進行状況更新
}
```

### セキュリティ考慮事項

#### アクセス制御
- GAS Webアプリの公開範囲制限
- 簡易PIN認証での個人データ保護
- スプレッドシートの編集権限管理

#### データ保護
- 個人情報の最小化
- PIN暗号化（可能であれば）
- 定期的なバックアップ

## 📱 UI/UX設計

### レスポンシブ対応
- スマートフォン優先設計
- タッチ操作に最適化
- 大きなボタンサイズ
- 見やすいフォントサイズ

### 画面遷移
```
トップページ
├── 大会管理（管理者）
│   ├── 大会作成
│   ├── 組み合わせ生成
│   ├── 進行管理
│   └── 結果確認
├── 個人ページ（参加者）
│   ├── ログイン
│   ├── 順位確認
│   └── 対戦履歴
└── 順位表示（公開）
```

## 🚀 開発・展開計画

### Phase 1: 基本機能（1週間）
- 大会作成機能
- 基本的な対戦管理
- Elo計算実装

### Phase 2: 高度機能（1週間）
- 複数卓対応
- 個人認証システム
- リアルタイム表示強化

### Phase 3: 最適化（数日）
- UI/UX改善
- バグ修正
- パフォーマンス最適化

---
**作成日**: 2024年7月20日  
**最終更新**: 2024年7月20日  
**作成者**: kikuchiさん