# Google Sheets セットアップガイド

## 現在のデータベース状況（2025年7月29日更新）

このシステムは完全にGoogle Sheetsをデータベースとして使用しており、以下のシートが稼働中です：
- **Players** (プレイヤー情報・ランキング)
- **Tournaments** (大会管理・CRUD操作対応)
- **MatchResults** (試合結果・レーティング計算)
- **TournamentDailyArchive** (日次大会参加者アーカイブ)
- **TournamentMatches** (大会内対戦組み合わせ)

## 1. Google スプレッドシートの作成

1. [Google Sheets](https://sheets.google.com) にアクセス
2. 新しいスプレッドシートを作成
3. スプレッドシートのIDをコピー（URLの `/d/` と `/edit` の間の部分）

## 2. シート構造の設定

### Players シート（24列）
**必須シート** - プレイヤー情報とランキングシステムのコア

| 列 | フィールド名 | 説明 | 例 |
|---|---|---|---|
| A | id | プレイヤーID | player_001 |
| B | nickname | ニックネーム | あなたの名前 |
| C | email | メールアドレス | test@example.com |
| D | current_rating | 現在レーティング | 1650 |
| E | annual_wins | 年間勝利数 | 12 |
| F | annual_losses | 年間敗北数 | 8 |
| G | total_wins | 通算勝利数 | 45 |
| H | total_losses | 通算敗北数 | 32 |
| I | champion_badges | チャンピオンバッジ情報 | 2024:gold,2023:silver |
| J | trump_rule_experienced | トランプルール経験 | true |
| K | first_trump_game_date | 初回トランプゲーム日 | 2024-01-15 |
| L | cardplus_rule_experienced | カードプラス経験 | true |
| M | first_cardplus_game_date | 初回カードプラス日 | 2024-02-20 |
| N | registration_date | 登録日 | 2024-01-01 |
| O | profile_image_url | プロフィール画像URL | https://... |
| P | is_active | アクティブ状態 | true |
| Q | last_activity_date | 最終活動日 | 2024-07-29 |
| R | player_status | プレイヤー状態 | active |
| S | notification_preferences | 通知設定 | {"email":true} |
| T | device_tokens | デバイストークン | ["token1"] |
| U | last_login_date | 最終ログイン日 | 2024-07-29 |
| V | profile_image_uploaded | 画像アップロード状態 | false |
| W | preferred_language | 優先言語 | ja |
| X | tournament_active | 大会参加中フラグ | FALSE |

### Tournaments シート（12列）
**CRUD操作対応** - 管理画面から作成・編集・削除可能

| 列 | フィールド名 | 説明 | 例 |
|---|---|---|---|
| A | id | 大会ID | tournament_1690123456789 |
| B | tournament_name | 大会名 | 第8回BUNGU SQUAD大会 |
| C | date | 開催日 | 2025-08-15 |
| D | start_time | 開始時刻 | 19:00 |
| E | location | 開催場所 | ○○コミュニティセンター |
| F | qr_code_url | QRコードURL | (自動生成) |
| G | created_by | 作成者 | admin |
| H | created_at | 作成日時 | 2025-07-29T10:00:00Z |
| I | status | ステータス | upcoming/開催中/完了 |
| J | max_participants | 最大参加者数 | 20 |
| K | current_participants | 現在参加者数 | 12 |
| L | tournament_type | 大会タイプ | random/round-robin |

### MatchResults シート（34列）
**完全な試合記録システム**

| 列 | フィールド名 | 説明 |
|---|---|---|
| A | match_id | 試合ID |
| B | tournament_id | 大会ID |
| C | player1_id | プレイヤー1のID |
| D | player2_id | プレイヤー2のID |
| E | winner_id | 勝者ID |
| F | loser_id | 敗者ID |
| G | game_rule | ゲームルール |
| H | match_start_time | 試合開始時刻 |
| I | match_end_time | 試合終了時刻 |
| J | match_status | 試合状態 |
| K | reported_by | 報告者 |
| L | reported_at | 報告日時 |
| M | approved_by | 承認者 |
| N | approved_at | 承認日時 |
| O | player1_rating_before | P1試合前レーティング |
| P | player2_rating_before | P2試合前レーティング |
| Q | player1_rating_after | P1試合後レーティング |
| R | player2_rating_after | P2試合後レーティング |
| S | player1_rating_change | P1レーティング変動 |
| T | player2_rating_change | P2レーティング変動 |
| ... | ... | （他のメタデータ列） |

### TournamentDailyArchive シート（7列）
**日次参加者アーカイブ**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| archive_id | tournament_date | player_id | player_nickname | entry_timestamp | total_participants_that_day | created_at |

### TournamentMatches シート（23列）
**大会内組み合わせ管理**

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| match_id | tournament_id | player1_id | player2_id | table_number | match_status | created_at |

## 3. 現在実装済みのAPI機能

### プレイヤー管理API
- ✅ **GET /api/players** - 全プレイヤー取得
- ✅ **GET /api/players?id={id}** - 特定プレイヤー取得
- ✅ **PUT /api/players?id={id}** - プレイヤー情報更新
- ✅ **GET /api/rankings** - ランキング取得（自動ソート）

### 大会管理API（フルCRUD）
- ✅ **GET /api/tournaments** - 全大会取得
- ✅ **POST /api/tournaments** - 新規大会作成
- ✅ **PUT /api/tournaments?id={id}** - 大会情報更新
- ✅ **DELETE /api/tournaments?id={id}** - 大会削除

### 試合管理API
- ✅ **GET /api/matches** - 試合履歴取得
- ✅ **POST /api/matches** - 試合結果登録（自動レーティング計算）

### 大会参加システム
- ✅ **tournament_active** フラグによる参加管理
- ✅ 日次アーカイブ機能（参加者の自動保存）
- ✅ QRコード大会エントリー

## 4. Google Cloud Console での設定

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

## 5. Vercel 環境変数の設定

Vercel プロジェクトで以下の環境変数を設定：

```bash
GOOGLE_SHEETS_ID=あなたのスプレッドシートID
GOOGLE_SERVICE_ACCOUNT_KEY=サービスアカウントのJSONキー（文字列として）
FRONTEND_URL=https://bungu-squad-arena.vercel.app
```

## 6. 現在のシステム状況

### 完了した実装
- ✅ **モックデータ撤廃** - 全てGoogle Sheets API使用
- ✅ **AdminTournaments** - 管理画面での大会CRUD操作
- ✅ **TournamentEntryComplete** - API連携完了
- ✅ **MainDashboard** - API経由での大会表示
- ✅ **レーティングシステム** - 自動ELO計算
- ✅ **QRコード機能** - PWAカメラ問題解決済み
- ✅ **大会管理UI改善** - 「開催中の大会」→「本日の大会」への自動振り分け
- ✅ **トップページ改善** - 今日の大会と次回大会の明確な表示
- ✅ **組み合わせ管理フロー** - 管理ダッシュボードから大会管理内に適切に配置
- ✅ **通知システム改善** - 確認ボタンによる適切な通知管理
- ✅ **大会参加履歴ボタン** - ランキング横に配置、遷移先と一致するテキスト

### 実装待ちの機能
- 🔄 **残りのTournament関連コンポーネント** のAPI化
- 🔄 **大会ステータス自動管理** (開催中→完了)
- 🔄 **組み合わせ機能** (自動生成・管理者確定)
- 🔄 **プッシュ通知システム**

## 7. データベース監視・確認方法

### リアルタイム確認
```bash
# プレイヤー数確認
curl https://bungu-squad-arena.vercel.app/api/players | jq length

# 現在の大会一覧
curl https://bungu-squad-arena.vercel.app/api/tournaments | jq '.[].tournament_name'

# ランキング上位5名
curl https://bungu-squad-arena.vercel.app/api/rankings | jq '.[0:5] | .[].nickname'
```

### Google Sheets 直接確認
- **Players** シート - X列で大会参加中プレイヤー確認
- **Tournaments** シート - I列でステータス確認
- **TournamentDailyArchive** - 日次参加履歴

## 8. バッジ・レーティングシステム

### バッジシステム
- **チャンピオンバッジ**: `2024:gold,2023:silver` 形式
- **ルール経験バッジ**: trump_rule_experienced, cardplus_rule_experienced

### Eloレーティングシステム
- 新規プレイヤー（10試合未満）: K値 = 40
- 中級プレイヤー（10-30試合）: K値 = 20  
- 上級プレイヤー（30試合以上）: K値 = 10
- 初期レーティング: 1500pt

## 9. 最新UI/UX改善（2025年7月30日更新）

### 大会管理システム改善
- **日付ベース自動振り分け**: 今日の日付の大会は「本日の大会」セクションに自動表示
- **組み合わせ管理の適切な配置**: 管理ダッシュボードから削除し、大会管理内の開催中大会に統合
- **AdminTournaments**: 開催中大会カードに「組み合わせ」ボタンを配置

### メインダッシュボード改善
- **今日の大会**: 「本日の大会予定」として優先表示
- **次回大会**: 「次回大会予定」として下部に小さく表示
- **複数大会対応**: さらに次回の大会も「さらに次回の大会予定」として表示

### 通知システム改善
- **確認ボタン機能**: ×ボタンではなく「確認」ボタンで通知を管理
- **大会別通知管理**: 確認した大会の通知は表示されなくなる
- **新規大会通知**: 新しい大会作成時のみ通知表示

### ボタン・ナビゲーション改善
- **大会参加履歴ボタン**: ランキング横に配置、遷移先と一致するテキスト
- **色合い改善**: 青色を控えめにしてデザインに合った色使い
- **2列レイアウト**: ランキングと大会参加履歴を横並び配置

## 10. 緊急時・トラブルシューティング

### よくある問題
1. **API エラー** → Vercel環境変数確認
2. **データ不整合** → Google Sheets権限確認
3. **QRスキャン問題** → PWA権限・カメラ設定確認
4. **ランキング未更新** → React Query キャッシュクリア
5. **通知が消えない** → 確認ボタンを押して適切に処理