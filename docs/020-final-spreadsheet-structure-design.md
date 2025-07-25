# 最終スプレッドシート構成設計（Lovable検証済み）

**作成日**: 2025年7月25日  
**作業者**: Claude Code  
**目的**: Lovableの新機能実装を完全にサポートする最終的なGoogle Spreadsheetsデータ構造設計  
**重要度**: 最高（バックエンド実装の基盤）

---

## 📊 背景・経緯

### 🔍 検証プロセス
1. **要件定義書012**で基本6シート構成を設計
2. **Lovable新機能5つ**を実装完了
   - MatchProgressManager（試合進行管理強化）
   - AdminDirectInput（代理入力機能）
   - RuleSelection（ルール選択機能）
   - ErrorHandler（エラーハンドリング強化）
   - DataExport（データ出力機能）
3. **フロントエンドコード詳細確認**による構成修正
4. **Lovableからの詳細フィードバック**を反映

### ✅ Lovableの検証結果
- 基本構成は適切だが、**追加3シート**と**詳細フィールド**が必要
- 通知システム・エラーログ・システム設定の管理機能追加
- フロントエンド機能との100%整合性を確認

---

## 🏗️ 最終構成（9シート・詳細設計）

### **シート1: Players（プレイヤー情報）- 26列**

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | player_id | TEXT | プレイヤー識別子 | player_001 |
| B | nickname | TEXT | 表示名 | 鈴木さん |
| C | email | TEXT | メールアドレス | suzuki@example.com |
| D | current_rating | NUMBER | 現在のレーティング | 1650 |
| E | annual_wins | NUMBER | 年間勝利数 | 12 |
| F | annual_losses | NUMBER | 年間敗戦数 | 8 |
| G | total_wins | NUMBER | 累積勝利数 | 45 |
| H | total_losses | NUMBER | 累積敗戦数 | 23 |
| I | champion_badges | TEXT | チャンピオンバッジ（カンマ区切り） | ★,☆ |
| J | trump_rule_experienced | BOOLEAN | トランプルール習得済み | TRUE/FALSE |
| K | first_trump_game_date | DATE | 初回トランプルール参加日 | 2024-07-15 |
| L | cardplus_rule_experienced | BOOLEAN | カードプラスルール習得済み | TRUE/FALSE |
| M | first_cardplus_game_date | DATE | 初回カードプラス参加日 | 2024-08-01 |
| N | registration_date | DATETIME | 登録日時 | 2024-01-15 10:30:00 |
| O | profile_image_url | TEXT | プロフィール画像URL | https://... |
| P | is_active | BOOLEAN | アクティブ状態 | TRUE/FALSE |
| Q | last_activity_date | DATETIME | 最終活動日時 | 2024-07-25 20:00:00 |
| R | player_status | TEXT | プレイヤー状態 | active/inactive/suspended |
| S | notification_preferences | TEXT | 通知設定（JSON） | {"match_start": true, "result_pending": true} |
| T | device_tokens | TEXT | デバイストークン（JSON配列） | ["token1", "token2"] |
| U | last_login_date | DATETIME | 最終ログイン日時 | 2024-07-25 18:45:00 |
| V | profile_image_uploaded | BOOLEAN | プロフィール画像アップロード済み | TRUE/FALSE |
| W | preferred_language | TEXT | 優先言語 | ja/en |
| X | [予備] | - | 将来拡張用 | - |
| Y | [予備] | - | 将来拡張用 | - |
| Z | [予備] | - | 将来拡張用 | - |

### **シート2: MatchResults（対戦記録）- 34列**

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | match_id | TEXT | 対戦識別子 | match_20240725_001 |
| B | tournament_id | TEXT | 大会識別子 | tournament_008 |
| C | player1_id | TEXT | プレイヤー1ID | player_001 |
| D | player2_id | TEXT | プレイヤー2ID | player_002 |
| E | winner_id | TEXT | 勝者ID | player_001 |
| F | loser_id | TEXT | 敗者ID | player_002 |
| G | game_rule | TEXT | 使用ルール | trump/cardplus |
| H | match_start_time | DATETIME | 対戦開始時刻 | 2024-07-25 19:30:00 |
| I | match_end_time | DATETIME | 対戦終了時刻 | 2024-07-25 19:55:00 |
| J | match_status | TEXT | 対戦状態 | waiting/in-progress/result-pending/completed |
| K | reported_by | TEXT | 申告者ID | player_001 |
| L | reported_at | DATETIME | 申告日時 | 2024-07-25 19:56:00 |
| M | approved_by | TEXT | 承認者ID | admin_001 |
| N | approved_at | DATETIME | 承認日時 | 2024-07-25 20:00:00 |
| O | player1_rating_before | NUMBER | プレイヤー1変更前レート | 1620 |
| P | player2_rating_before | NUMBER | プレイヤー2変更前レート | 1680 |
| Q | player1_rating_after | NUMBER | プレイヤー1変更後レート | 1650 |
| R | player2_rating_after | NUMBER | プレイヤー2変更後レート | 1650 |
| S | player1_rating_change | NUMBER | プレイヤー1レート変動 | +30 |
| T | player2_rating_change | NUMBER | プレイヤー2レート変動 | -30 |
| U | is_proxy_input | BOOLEAN | 代理入力フラグ | TRUE/FALSE |
| V | proxy_reason | TEXT | 代理入力理由 | player-forgot/technical-issue/timeout/dispute/other |
| W | proxy_reason_detail | TEXT | 代理入力詳細理由 | Wi-Fi接続が不安定 |
| X | proxy_input_by | TEXT | 代理入力実行者 | admin_001 |
| Y | notification_sent | BOOLEAN | 通知送信済み | TRUE/FALSE |
| Z | is_first_time_rule | BOOLEAN | 初回ルール体験 | TRUE/FALSE |
| AA | table_number | TEXT | 卓番号 | 卓2 |
| BB | notification_sent_at | DATETIME | 通知送信時刻 | 2024-07-25 20:05:00 |
| CC | reminder_sent_count | NUMBER | 催促通知回数 | 2 |
| DD | last_reminder_sent_at | DATETIME | 最終催促時刻 | 2024-07-25 20:10:00 |
| EE | rating_calculation_method | TEXT | レート計算方法 | elo/swiss/custom |
| FF | notes | TEXT | 管理者メモ | 接戦でした |
| GG | weather_condition | TEXT | 会場状況記録 | 快晴・空調良好 |
| HH | device_used | TEXT | 使用デバイス | qr-scan/manual-entry/web |

### **シート3: Tournaments（大会情報）- 12列**

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | tournament_id | TEXT | 大会識別子 | tournament_008 |
| B | tournament_name | TEXT | 大会名 | 第8回BUNGU SQUAD大会 |
| C | date | DATE | 開催日 | 2024-07-25 |
| D | start_time | TIME | 開始時刻 | 19:00 |
| E | location | TEXT | 開催場所 | ○○コミュニティセンター |
| F | qr_code_url | TEXT | QRコードURL | https://... |
| G | created_by | TEXT | 作成者ID | admin_001 |
| H | created_at | DATETIME | 作成日時 | 2024-07-20 10:00:00 |
| I | status | TEXT | 大会状態 | upcoming/active/completed |
| J | max_participants | NUMBER | 最大参加者数 | 20 |
| K | current_participants | NUMBER | 現在参加者数 | 16 |
| L | tournament_type | TEXT | 大会方式 | random/round-robin/manual |

### **シート4: TournamentParticipants（大会参加記録）- 11列**

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | participation_id | TEXT | 参加識別子 | part_001 |
| B | tournament_id | TEXT | 大会識別子 | tournament_008 |
| C | player_id | TEXT | プレイヤーID | player_001 |
| D | joined_at | DATETIME | 参加日時 | 2024-07-25 18:45:00 |
| E | table_number | TEXT | 割り当て卓 | 卓2 |
| F | bracket_position | TEXT | トーナメント位置 | A-1 |
| G | entry_method | TEXT | エントリー方法 | qr-scan/manual |
| H | payment_status | TEXT | 参加費状態 | paid/unpaid/exempt |
| I | dietary_restrictions | TEXT | 食事制限・アレルギー | なし |
| J | emergency_contact | TEXT | 緊急連絡先 | 090-1234-5678 |
| K | transportation_method | TEXT | 交通手段 | car/train/bus/walk |

### **シート5: YearlyArchive（年間実績）- 9列**

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | archive_id | TEXT | アーカイブ識別子 | 2024_player_001 |
| B | year | NUMBER | 年度 | 2024 |
| C | player_id | TEXT | プレイヤーID | player_001 |
| D | final_rating | NUMBER | 年末レーティング | 1650 |
| E | annual_rank | NUMBER | 年間順位 | 3 |
| F | champion_badge | TEXT | チャンピオンバッジ | ★/☆/⭐ |
| G | annual_wins | NUMBER | 年間勝利数 | 25 |
| H | annual_losses | NUMBER | 年間敗戦数 | 15 |
| I | archived_at | DATETIME | アーカイブ日時 | 2025-01-01 00:00:00 |

### **シート6: CumulativeStats（累積統計）- 17列**

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | player_id | TEXT | プレイヤーID | player_001 |
| B | first_participation_date | DATE | 初回参加日 | 2023-03-15 |
| C | total_matches | NUMBER | 総対戦数 | 68 |
| D | career_wins | NUMBER | 通算勝利数 | 40 |
| E | career_losses | NUMBER | 通算敗戦数 | 28 |
| F | win_rate | NUMBER | 勝率 | 0.588 |
| G | highest_rating | NUMBER | 最高レーティング | 1720 |
| H | highest_rating_date | DATE | 最高レート達成日 | 2024-06-15 |
| I | participation_years | NUMBER | 参加年数 | 2 |
| J | last_active_date | DATETIME | 最終活動日 | 2024-07-25 20:00:00 |
| K | total_tournaments | NUMBER | 参加大会数 | 15 |
| L | favorite_rule | TEXT | 好みルール | trump/cardplus |
| M | average_match_duration | NUMBER | 平均対戦時間（分） | 25.5 |
| N | most_played_opponent_id | TEXT | 最多対戦相手ID | player_005 |
| O | longest_winning_streak | NUMBER | 最長連勝 | 7 |
| P | longest_losing_streak | NUMBER | 最長連敗 | 3 |
| Q | rating_volatility | NUMBER | レート変動標準偏差 | 45.2 |

### **シート7: Notifications（通知履歴）- 10列** ★新規

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | notification_id | TEXT | 通知識別子 | notif_001 |
| B | recipient_player_id | TEXT | 受信者プレイヤーID | player_001 |
| C | notification_type | TEXT | 通知種別 | match_start/result_pending/tournament_reminder/system |
| D | title | TEXT | 通知タイトル | 対戦開始のお知らせ |
| E | message | TEXT | 通知本文 | 田中さんとの対戦が開始されました |
| F | sent_at | DATETIME | 送信日時 | 2024-07-25 19:30:00 |
| G | read_at | DATETIME | 既読日時 | 2024-07-25 19:32:00 |
| H | is_read | BOOLEAN | 既読フラグ | TRUE/FALSE |
| I | action_url | TEXT | タップ時遷移先 | /match/123 |
| J | priority | TEXT | 優先度 | high/normal/low |

### **シート8: SystemSettings（システム設定）- 6列** ★新規

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | setting_key | TEXT | 設定キー | rating_calculation_k_value |
| B | setting_value | TEXT | 設定値 | 30 |
| C | setting_type | TEXT | 設定データ型 | string/number/boolean/json |
| D | description | TEXT | 設定説明 | Eloレーティング計算のK値 |
| E | updated_at | DATETIME | 更新日時 | 2024-07-25 10:00:00 |
| F | updated_by | TEXT | 更新者ID | admin_001 |

### **シート9: ErrorLogs（エラーログ）- 9列** ★新規

| 列 | フィールド名 | データ型 | 説明 | 例 |
|---|---|---|---|---|
| A | error_id | TEXT | エラー識別子 | error_001 |
| B | player_id | TEXT | 関連プレイヤーID | player_001 |
| C | error_type | TEXT | エラー種別 | network/data/ui/system |
| D | error_message | TEXT | エラーメッセージ | Connection timeout |
| E | stack_trace | TEXT | スタックトレース | at function... |
| F | user_agent | TEXT | ユーザーエージェント | Mozilla/5.0... |
| G | timestamp | DATETIME | 発生日時 | 2024-07-25 19:45:30 |
| H | resolved_at | DATETIME | 解決日時 | 2024-07-25 20:00:00 |
| I | resolution_method | TEXT | 解決方法 | restart/cache-clear/update |

---

## 🎯 実装上の重要ポイント

### 🔧 **技術的考慮事項**

#### 1. **JSON形式フィールドの扱い**
- `notification_preferences`、`device_tokens`はJSON文字列として保存
- バックエンドAPIでパース・シリアライズ処理が必要

#### 2. **BOOLEAN値の統一**
- Google SheetsではTRUE/FALSEで統一
- APIレスポンスではboolean型に変換

#### 3. **ID生成規則**
```javascript
// 推奨ID生成パターン
player_id: `player_${timestamp}_${random}`
match_id: `match_${yyyymmdd}_${sequence}`
tournament_id: `tournament_${sequence}`
```

#### 4. **日時フォーマット統一**
- 全てISO 8601形式（YYYY-MM-DD HH:MM:SS）
- タイムゾーンはJST固定

### 📊 **データ整合性**

#### 1. **必須フィールド**
- 各シートのID系フィールド（A列）は必須
- プレイヤー情報の基本フィールド（A-D列）は必須

#### 2. **外部キー制約**
- MatchResults.player1_id/player2_id → Players.player_id
- TournamentParticipants.tournament_id → Tournaments.tournament_id
- 削除時の整合性チェックが必要

#### 3. **デフォルト値**
```javascript
// 新規プレイヤー作成時のデフォルト
current_rating: 1500
trump_rule_experienced: false
cardplus_rule_experienced: false
is_active: true
player_status: 'active'
```

### 🚀 **パフォーマンス最適化**

#### 1. **インデックス設計**
- プレイヤーID・大会ID・日付での検索が頻繁
- Google Sheetsの制約内での最適化が必要

#### 2. **データ分割**
- 年間アーカイブでの履歴データ分離
- エラーログの定期的なクリーンアップ

#### 3. **キャッシュ戦略**
- ランキングデータの5分キャッシュ
- 大会情報の1時間キャッシュ

---

## 📋 次のステップ

### 🏗️ **実装順序**
1. **基本6シート作成** - Players, MatchResults, Tournaments, TournamentParticipants, YearlyArchive, CumulativeStats
2. **拡張3シート作成** - Notifications, SystemSettings, ErrorLogs  
3. **サンプルデータ投入** - テスト用ダミーデータ
4. **バックエンドAPI実装** - Google Sheets APIクライアント
5. **フロントエンド接続テスト** - Lovable新機能とのAPI連携

### 🧪 **テストデータ設計**
- プレイヤー5名程度
- 大会1-2回分
- 対戦記録10-20件
- 各種状態のサンプルデータ

---

## 💡 重要な決定事項

### ✅ **確定事項**
1. **9シート構成** - Lovable新機能を完全サポート
2. **34列の対戦記録** - 詳細な進行管理・代理入力対応
3. **通知・エラーログシステム** - 運用監視・デバッグ支援
4. **JSON形式設定** - 柔軟な設定管理

### 🔄 **今後の調整可能項目**
1. フィールド追加・削除
2. データ型の変更
3. インデックス・パフォーマンス調整
4. 新機能追加時の拡張

---

**作成者**: Claude Code  
**検証者**: Lovable AI（フロントエンド実装チーム）  
**重要度**: 最高（プロジェクト基盤）  
**次回参照必須**: スプレッドシート作成・バックエンドAPI実装時  
**関連ファイル**: 
- `012-system-requirements-specification.md`
- `019-requirements-vs-implementation-gap-analysis.md`

**最終更新**: 2025年7月25日

---

## 📞 次回セッション引き継ぎ事項

### 🔄 **再起動時の重要確認項目**
1. この記録（020）を最初に読み込む
2. 9シート構成の詳細フィールド確認
3. Lovable新機能との整合性理解
4. バックエンドAPI実装の準備状況確認

### 📋 **作業継続時の注意点**
- この構成はLovable検証済み（変更時は再確認必要）
- JSON形式フィールドの処理実装が重要
- エラーログ・通知システムの運用設計も同時進行
- テストデータの設計も並行して検討

**次回作業**: スプレッドシート実際作成 → バックエンドAPI実装開始