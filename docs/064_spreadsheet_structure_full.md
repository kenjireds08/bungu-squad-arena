# 064 - BUNGU SQUADスプレッドシート完全構造仕様

## 概要
**作成日**: 2025年8月3日  
**スプレッドシートID**: `1tFa04F1Rdg5gHxPMOaky99NHM-8VORuix6MhjYipBeA`  
**総シート数**: 12シート  
**データソース**: 実際の運用中スプレッドシートから直接取得  

## 全シート構造詳細

### 1. Players シート
**目的**: プレイヤーの基本情報・レーティング・ゲーム経験管理

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | player_id | 文字列 | 一意識別子 |
| B | nickname | 文字列 | 表示名 |
| C | email | 文字列 | メールアドレス |
| D | current_rating | 数値 | 現在のELOレーティング |
| E | annual_wins | 数値 | 年間勝利数 |
| F | annual_losses | 数値 | 年間敗北数 |
| G | total_wins | 数値 | 通算勝利数 |
| H | total_losses | 数値 | 通算敗北数 |
| I | champion_badges | 文字列 | バッジ情報（🥇🥈🥉♠️➕） |
| J | trump_rule_experienced | TRUE/FALSE | トランプルール経験 |
| K | first_trump_game_date | 日付 | 初回トランプゲーム日付 |
| L | cardplus_rule_experienced | TRUE/FALSE | カード+ルール経験 |
| M | first_cardplus_game_date | 日付 | 初回カード+ゲーム日付 |
| N | registration_date | 日時 | 登録日時 |
| O | profile_image_url | 文字列 | プロフィール画像URL |
| P | is_active | TRUE/FALSE | アクティブ状態 |
| Q | last_activity_date | 日付 | 最終活動日 |
| R | player_status | 文字列 | プレイヤー状態 |
| S | notification_preferences | JSON | 通知設定 |
| T | device_tokens | 配列 | デバイストークン |
| U | last_login | 日時 | 最終ログイン日時 |
| V | profile_image_uploaded | TRUE/FALSE | 画像アップロード済み |
| W | preferred_language | 文字列 | 使用言語 |
| X | tournament_active | TRUE/FALSE | 大会参加中フラグ |

### 2. MatchResults シート
**目的**: 試合結果の詳細記録・レーティング計算ベース

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | match_id | 文字列 | 試合ID |
| B | tournament_id | 文字列 | 大会ID |
| C | player1_id | 文字列 | プレイヤー1のID |
| D | player1_name | 文字列 | プレイヤー1の名前 |
| E | player2_id | 文字列 | プレイヤー2のID |
| F | player2_name | 文字列 | プレイヤー2の名前 |
| G | game_rule | 文字列 | ゲームルール（trump/cardplus/approved） |
| H | match_date | 日付 | 試合日 |
| I | winner_id | 文字列 | 勝者ID |
| J | winner_name | 文字列 | 勝者名 |
| K | loser_id | 文字列 | 敗者ID |
| L | loser_name | 文字列 | 敗者名 |
| M | winner_old_rating | 数値 | 勝者の変更前レーティング |
| N | winner_new_rating | 数値 | 勝者の変更後レーティング |
| O | loser_old_rating | 数値 | 敗者の変更前レーティング |
| P | loser_new_rating | 数値 | 敗者の変更後レーティング |
| Q | rating_change | 数値 | レーティング変動値 |
| R | match_status | 文字列 | 試合状態 |
| S | notes | 文字列 | 備考 |
| T | created_at | 日時 | 作成日時 |
| U | updated_at | 日時 | 更新日時 |

### 3. Tournaments シート
**目的**: 大会の基本情報・スケジュール管理

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | tournament_id | 文字列 | 大会ID |
| B | name | 文字列 | 大会名 |
| C | date | 日付 | 開催日 |
| D | time | 時間 | 開催時刻 |
| E | location | 文字列 | 開催場所 |
| F | max_participants | 数値 | 最大参加者数 |
| G | current_participants | 数値 | 現在参加者数 |
| H | status | 文字列 | 大会状態（scheduled/active/completed） |
| I | qr_code_url | 文字列 | QRコードURL |
| J | description | 文字列 | 大会説明 |
| K | created_at | 日時 | 作成日時 |
| L | updated_at | 日時 | 更新日時 |

### 4. TournamentParticipants シート
**目的**: 大会参加者の登録・管理

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | participant_id | 文字列 | 参加ID |
| B | tournament_id | 文字列 | 大会ID |
| C | player_id | 文字列 | プレイヤーID |
| D | nickname | 文字列 | プレイヤー名 |
| E | current_rating | 数値 | エントリー時レーティング |
| F | entry_time | 日時 | エントリー時刻 |
| G | status | 文字列 | 参加状態 |
| H | created_at | 日時 | 作成日時 |

### 5. YearlyArchive シート
**目的**: 年間統計の保存

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | archive_id | 文字列 | アーカイブID |
| B | year | 数値 | 年 |
| C | player_id | 文字列 | プレイヤーID |
| D | player_nickname | 文字列 | プレイヤー名 |
| E | final_rating | 数値 | 年末レーティング |
| F | annual_wins | 数値 | 年間勝利数 |
| G | annual_losses | 数値 | 年間敗北数 |
| H | tournaments_participated | 数値 | 参加大会数 |
| I | champion_badges_earned | 文字列 | 獲得バッジ |
| J | archived_at | 日時 | アーカイブ日時 |

### 6. CumulativeStats シート
**目的**: 累積統計情報

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | stat_id | 文字列 | 統計ID |
| B | player_id | 文字列 | プレイヤーID |
| C | total_matches | 数値 | 総試合数 |
| D | total_wins | 数値 | 総勝利数 |
| E | total_losses | 数値 | 総敗北数 |
| F | win_rate | 数値 | 勝率 |
| G | highest_rating | 数値 | 最高レーティング |
| H | lowest_rating | 数値 | 最低レーティング |
| I | rating_variance | 数値 | レーティング分散 |
| J | last_updated | 日時 | 最終更新日時 |

### 7. Notifications シート
**目的**: 通知履歴の管理

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | notification_id | 文字列 | 通知ID |
| B | player_id | 文字列 | 対象プレイヤーID |
| C | type | 文字列 | 通知タイプ |
| D | title | 文字列 | 通知タイトル |
| E | message | 文字列 | 通知メッセージ |
| F | is_read | TRUE/FALSE | 既読状態 |
| G | priority | 文字列 | 優先度 |
| H | sent_at | 日時 | 送信日時 |
| I | read_at | 日時 | 既読日時 |

### 8. SystemSettings シート
**目的**: システム設定の管理

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | setting_key | 文字列 | 設定キー |
| B | setting_value | 文字列 | 設定値 |
| C | data_type | 文字列 | データ型 |
| D | description | 文字列 | 設定説明 |
| E | is_active | TRUE/FALSE | 有効状態 |
| F | last_modified | 日時 | 最終更新日時 |
| G | modified_by | 文字列 | 更新者 |

### 9. ErrorLogs シート
**目的**: システムエラーログ

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | error_id | 文字列 | エラーID |
| B | timestamp | 日時 | 発生日時 |
| C | error_type | 文字列 | エラータイプ |
| D | error_message | 文字列 | エラーメッセージ |
| E | stack_trace | 文字列 | スタックトレース |
| F | user_id | 文字列 | 関連ユーザーID |
| G | request_url | 文字列 | リクエストURL |
| H | user_agent | 文字列 | ユーザーエージェント |
| I | ip_address | 文字列 | IPアドレス |
| J | severity | 文字列 | 重要度 |
| K | resolved | TRUE/FALSE | 解決済み |
| L | resolved_at | 日時 | 解決日時 |

### 10. TournamentMatches シート ⭐
**目的**: 全大会の試合情報を一元管理（最重要シート）

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | match_id | 文字列 | 試合ID |
| B | tournament_id | 文字列 | 大会ID |
| C | match_number | 数値 | 試合番号 |
| D | player1_id | 文字列 | プレイヤー1ID |
| E | player1_name | 文字列 | プレイヤー1名 |
| F | player2_id | 文字列 | プレイヤー2ID |
| G | player2_name | 文字列 | プレイヤー2名 |
| H | game_type | 文字列 | ゲーム種類（trump/cardplus） |
| I | status | 文字列 | 試合状態（scheduled/in_progress/completed/approved） |
| J | winner_id | 文字列 | 勝者ID |
| K | result_details | 文字列 | 試合詳細 |
| L | created_at | 日時 | 作成日時 |
| M | completed_at | 日時 | 完了日時 |
| N | approved_at | 日時 | 承認日時 |

### 11. TournamentDailyArchive シート
**目的**: 日別大会参加履歴の保存

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | archive_id | 文字列 | アーカイブID |
| B | tournament_date | 日付 | 大会日付 |
| C | player_id | 文字列 | 参加者ID |
| D | player_nickname | 文字列 | 参加者名 |
| E | entry_timestamp | 日時 | エントリー時刻 |
| F | total_participants_that_day | 数値 | その日の総参加者数 |
| G | created_at | 日時 | 作成日時 |

### 12. RatingHistory シート ⭐
**目的**: レーティング変更履歴の詳細記録

| 列 | フィールド名 | データ型 | 説明 |
|---|---|---|---|
| A | history_id | 文字列 | 履歴ID |
| B | player_id | 文字列 | プレイヤーID |
| C | opponent_id | 文字列 | 対戦相手ID |
| D | player_old_rating | 数値 | 変更前レーティング |
| E | player_new_rating | 数値 | 変更後レーティング |
| F | opponent_old_rating | 数値 | 相手変更前レーティング |
| G | opponent_new_rating | 数値 | 相手変更後レーティング |
| H | result | 文字列 | 試合結果（win/loss） |
| I | timestamp | 日時 | 記録日時 |

## 重要な技術仕様

### データ型統一規則
- **Boolean値**: `TRUE`/`FALSE`（大文字統一）
- **日付**: `YYYY-MM-DD`形式
- **日時**: `YYYY-MM-DD HH:MM:SS`形式
- **ID**: 英数字文字列（例：`player_001`、`tournament_20250803_1420`）
- **JSON**: 文字列形式で保存

### 重要な制約・注意事項
1. **列順序変更禁止**: APIの列マッピングが破綻するため
2. **必須フィールド**: 各シートの`A`列（ID列）は必須
3. **外部キー整合性**: player_id、tournament_id、match_idの紐付け必須
4. **データ型統一**: 同一列内でのデータ型混在禁止

### 現在判明している問題
1. **MatchResults.game_rule列**: 「approved」が保存される問題（修正済み）
2. **バッジ表示問題**: 過去の試合参加者にゲームバッジが表示されない問題

## データフロー概要

### 新規プレイヤー登録
```
登録フォーム → メール認証 → Players シート追加 → player_id生成
```

### 大会エントリー
```
QRスキャン → Tournaments参加者数更新 → TournamentParticipants追加 → tournament_active=TRUE
```

### 試合結果入力
```
管理者入力 → TournamentMatches更新 → ELOレーティング計算 → Players更新 → RatingHistory追加 → バッジ自動付与
```

### 日次自動処理
```
日付変更 → tournament_active=FALSE → TournamentDailyArchive保存 → 統計更新
```

## パフォーマンス特性

### データ容量見積もり
- **年間運用**: 約2,600試合記録（週1回×20名）
- **10年間運用**: 約26,000試合記録
- **Google Sheets制限**: 1シート1000万セル（実質無制限）

### API応答性能目標
- プレイヤー一覧取得: 100ms以下
- ランキング計算: 200ms以下
- 試合結果入力: 500ms以下

## セキュリティ考慮事項

### アクセス制御
- 読み取り専用APIと更新APIの分離
- 管理者権限の適切な管理
- メール認証による不正登録防止

### データ保護
- 個人情報（メールアドレス）の適切な取り扱い
- 試合結果改ざん防止のための履歴保持
- バックアップとリストア機能

## 今後の拡張計画

### 短期（1-2ヶ月）
- バッジシステムの完全修正
- 複数試合同時進行対応
- 独自ドメイン移行

### 中期（3-6ヶ月）
- 統計機能の大幅拡張
- モバイル最適化
- 通知システム強化

### 長期（6ヶ月以上）
- 外部システム連携
- AI予測機能
- 国際化対応

---

**作成者**: Claude Code  
**プロジェクト**: BUNGU SQUADランキングシステム  
**最終更新**: 2025年8月3日  
**バージョン**: v1.0  
**参照元**: 実際の運用中スプレッドシート直接調査結果