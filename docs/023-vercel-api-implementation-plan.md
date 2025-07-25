# 023: Vercel API実装計画

## 概要
Google SheetsをバックエンドとしたServerless Functions API実装

## 実装する API エンドポイント

### 基本CRUD操作
```
GET  /api/players          - プレイヤー一覧取得
GET  /api/players/[id]     - 特定プレイヤー取得
POST /api/players          - 新規プレイヤー登録
PUT  /api/players/[id]     - プレイヤー情報更新

GET  /api/tournaments      - 大会一覧取得
GET  /api/tournaments/[id] - 特定大会取得
POST /api/tournaments      - 新規大会作成

GET  /api/matches          - 対戦記録取得
POST /api/matches          - 対戦結果登録
PUT  /api/matches/[id]     - 対戦結果更新

GET  /api/rankings         - ランキング取得
GET  /api/stats/[playerId] - プレイヤー統計取得
```

### 必要な設定
1. `vercel.json` - 環境変数とルーティング設定
2. `/api` フォルダ - Serverless Functions
3. Google Sheets API認証情報の設定

## 技術構成
- **Runtime**: Node.js 18
- **Database**: Google Sheets API v4  
- **Authentication**: Google Service Account
- **Deployment**: Vercel
- **Environment**: Production環境でのAPI提供

## 次の作業
1. Vercelプロジェクト作成
2. 環境変数設定
3. 基本API実装
4. フロントエンド連携テスト