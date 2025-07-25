# 参考：Next.js版 Google Sheets セットアップガイド

**注意**: これは前回のNext.js版で作成されたセットアップガイドです。  
**現在は `SHEETS_SETUP.md` を使用してください。**

---

# Google Sheets API セットアップガイド

## 1. Google Cloud Console設定

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成、または既存のプロジェクトを選択
3. **API & Services** > **Library** から「Google Sheets API」を有効化
4. **API & Services** > **Credentials** > **Create Credentials** > **Service Account**
5. サービスアカウントを作成し、JSONキーをダウンロード

## 2. Google Spreadsheet作成

以下の3つのシートを含むスプレッドシートを作成：

### playersシート
| A (id) | B (nickname) | C (rating) | D (gamesPlayed) | E (wins) | F (losses) | G (badges) | H (championBadges) | I (createdAt) | J (updatedAt) |
|---------|--------------|------------|-----------------|----------|------------|------------|-------------------|---------------|---------------|
| 1 | 田中太郎 | 1650 | 15 | 8 | 7 | ["♠️","➕"] | ["⭐"] | 2024-07-25T10:00:00Z | 2024-07-25T10:00:00Z |

### tournamentsシート  
| A (id) | B (name) | C (date) | D (time) | E (location) | F (status) | G (participants) | H (createdAt) | I (updatedAt) |
|---------|----------|----------|----------|--------------|------------|------------------|---------------|---------------|
| 1 | 第8回BUNGU SQUAD大会 | 8/15(木) | 19:00〜 | ○○コミュニティセンター | upcoming | ["1","2","3"] | 2024-07-25T10:00:00Z | 2024-07-25T10:00:00Z |

### matchesシート
| A (id) | B (tournamentId) | C (player1Id) | D (player2Id) | E (player1Rating) | F (player2Rating) | G (result) | H (ratingChanges) | I (createdAt) | J (completedAt) |
|---------|------------------|---------------|---------------|-------------------|-------------------|------------|-------------------|---------------|-----------------|
| 1 | 1 | 1 | 2 | 1650 | 1580 | player1 | {"player1":15,"player2":-15} | 2024-07-25T10:00:00Z | 2024-07-25T11:00:00Z |

## 3. 環境変数設定

`.env.local`ファイルを作成し、以下を設定：

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"

# Optional: Sheet names (default values)
PLAYERS_SHEET_NAME=players
TOURNAMENTS_SHEET_NAME=tournaments  
MATCHES_SHEET_NAME=matches
```

## 4. スプレッドシート共有設定

作成したスプレッドシートをサービスアカウントのメールアドレスと共有（編集権限）

## 5. Vercel環境変数設定

Vercelダッシュボードで以下の環境変数を設定：

- `GOOGLE_SHEETS_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`  
- `GOOGLE_PRIVATE_KEY`
- `PLAYERS_SHEET_NAME` (optional)
- `TOURNAMENTS_SHEET_NAME` (optional)
- `MATCHES_SHEET_NAME` (optional)

## API エンドポイント

- `GET /api/players` - 全プレイヤー取得
- `POST /api/players` - プレイヤー作成
- `GET /api/players/[id]` - 個別プレイヤー取得
- `PUT /api/players/[id]` - プレイヤー更新
- `GET /api/ranking` - ランキング取得
- `GET /api/tournaments` - 全トーナメント取得
- `POST /api/tournaments` - トーナメント作成
- `GET /api/matches` - 全対戦記録取得
- `POST /api/matches` - 対戦記録作成（Eloレーティング自動計算）