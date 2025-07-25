# 024: API移行完了 - 新スプレッドシート構造対応

## 概要
既存のAPIコードを新しい126列スプレッドシート構造に完全対応

## 更新したAPIファイル

### 1. `/api/lib/sheets.js` - 核心サービス更新
- **getPlayers()**: A2:Z1000 → 26列データ対応
- **getRankings()**: `rating` → `current_rating` に変更  
- **updatePlayerRating()**: 列位置をC→Dに修正
- **getTournaments()**: A2:L1000 → 12列データ対応
- **addMatchResult()**: 34列のMatchResults構造対応
- **getMatchHistory()**: A2:AH1000 → 34列データ取得

### 2. `/api/players.js` - リクエスト対応
- `rating` → `current_rating` パラメータ名変更

## 新しいデータ構造対応

### Players (26列)
```javascript
{
  id, nickname, email, current_rating, annual_wins, annual_losses,
  total_wins, total_losses, champion_badges, trump_rule_experienced,
  first_trump_game_date, cardplus_rule_experienced, first_cardplus_game_date,
  registration_date, profile_image_url, is_active, last_activity_date,
  player_status, notification_preferences, device_tokens,
  last_login_date, profile_image_uploaded, preferred_language
}
```

### Tournaments (12列)
```javascript
{
  id, tournament_name, date, start_time, location, qr_code_url,
  created_by, created_at, status, max_participants, 
  current_participants, tournament_type
}
```

### MatchResults (34列)
```javascript
{
  id, tournament_id, player1_id, player2_id, winner_id, loser_id,
  game_rule, match_start_time, match_end_time, match_status,
  reported_by, reported_at, approved_by, approved_at,
  player1_rating_before, player2_rating_before,
  player1_rating_after, player2_rating_after,
  player1_rating_change, player2_rating_change,
  is_proxy_input, table_number, notes, weather_condition
}
```

## 次のステップ
1. Vercelログイン (GitHub認証)
2. プロジェクト作成・デプロイ
3. 環境変数設定
4. API動作テスト