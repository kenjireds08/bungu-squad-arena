# 技術スタック・開発コマンド

## 開発環境
- Node.js 22.x
- React 18.3.1 + TypeScript
- Vite (ビルドツール)
- ESLint (コード品質)

## 重要なコマンド
```bash
# 開発サーバー起動
npm run dev

# 本番ビルド
npm run build

# 開発用ビルド
npm run build:dev

# コード品質チェック
npm run lint

# プレビュー
npm run preview

# Vercelデプロイ用ビルド
npm run vercel-build
```

## API構成（Vercel Serverless Functions）
- `/api/auth.js` - メール認証システム
- `/api/players.js` - プレイヤー管理
- `/api/tournaments.js` - 大会管理
- `/api/matches.js` - 試合管理
- `/api/matchResults.js` - 試合結果管理
- `/api/rankings.js` - ランキング取得
- `/api/rating-history.js` - レーティング履歴
- `/api/tournament-system.js` - 大会システム
- `/api/admin.js` - 管理者機能
- `/api/fix-badges.js` - バッジ修正スクリプト
- `/api/directFix.js` - 直接修正機能

## データベース構成
Google Spreadsheet（12シート）：
1. Players - プレイヤー基本情報
2. MatchResults - 試合結果詳細
3. Tournaments - 大会情報
4. TournamentParticipants - 大会参加者
5. YearlyArchive - 年間統計
6. CumulativeStats - 累積統計
7. Notifications - 通知履歴
8. SystemSettings - システム設定
9. ErrorLogs - エラーログ
10. TournamentMatches - 大会試合管理（重要）
11. TournamentDailyArchive - 日別履歴
12. RatingHistory - レーティング変更履歴（重要）