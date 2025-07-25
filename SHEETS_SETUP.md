# Google Sheets セットアップガイド

## 1. Google スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com) にアクセス
2. 新しいスプレッドシートを作成
3. スプレッドシートのIDをコピー（URLの `/d/` と `/edit` の間の部分）

## 2. シート構造の設定

### Players シート
1. シート名を "Players" に変更
2. ヘッダー行（1行目）を以下のように設定：

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| ID | ニックネーム | レーティング | 試合数 | バッジ | チャンピオンバッジ |

3. サンプルデータ例：
```
player_1    あなた        1650    12    ♠️,➕    ⭐
player_2    鈴木さん      1850    25    ★,★,☆,♠️,➕    
player_3    佐藤さん      1685    18    ★,♠️    
```

### Tournaments シート
1. 新しいシートを作成し、名前を "Tournaments" に変更
2. ヘッダー行を以下のように設定：

| A | B | C | D | E |
|---|---|---|---|---|
| ID | 大会名 | 日時 | 場所 | 参加者 |

3. サンプルデータ例：
```
tournament_1    第8回BUNGU SQUAD大会    2024-08-15 19:00    ○○コミュニティセンター    player_1,player_2,player_3
tournament_2    第9回BUNGU SQUAD大会    2024-08-22 19:00    △△会議室    
```

### MatchResults シート
1. 新しいシートを作成し、名前を "MatchResults" に変更
2. ヘッダー行を以下のように設定：

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| ID | プレイヤー1ID | プレイヤー2ID | 結果 | プレイヤー1レーティング変動 | プレイヤー2レーティング変動 | 日時 |

## 3. Google Cloud Console での設定

### Service Account の作成
1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを作成（または既存のプロジェクトを選択）
3. Google Sheets API を有効化
4. 「IAM と管理」→「サービス アカウント」→「サービス アカウントを作成」
5. サービス アカウント名を入力して作成
6. 作成したサービス アカウントをクリック
7. 「キー」タブ→「キーを追加」→「新しいキーを作成」→「JSON」を選択
8. ダウンロードされたJSONファイルの内容をコピー

### スプレッドシートの共有設定
1. Google Sheets に戻る
2. 右上の「共有」ボタンをクリック
3. サービス アカウントのメールアドレス（JSON内の `client_email`）を追加
4. 権限を「編集者」に設定

## 4. Vercel 環境変数の設定

Vercel プロジェクトで以下の環境変数を設定：

```bash
GOOGLE_SHEETS_ID=あなたのスプレッドシートID
GOOGLE_SERVICE_ACCOUNT_KEY=サービスアカウントのJSONキー（文字列として）
```

## 5. バッジの説明

- **★☆⭐**: 年間チャンピオンバッジ（金・銀・銅）
- **♠️**: トランプルール習得済み
- **➕**: カードプラスルール習得済み

## 6. Eloレーティングシステム

- 新規プレイヤー（10試合未満）: K値 = 40
- 中級プレイヤー（10-30試合）: K値 = 20  
- 上級プレイヤー（30試合以上）: K値 = 10

初期レーティング: 1500pt