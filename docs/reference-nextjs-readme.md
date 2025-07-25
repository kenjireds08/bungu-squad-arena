# 参考：Next.js版 README

**注意**: これは前回のNext.js版で作成されたREADMEです。  
**現在のプロジェクトはReact + Vite + Lovable UIベースです。**

---

# BUNGU SQUAD ランキングシステム

Lovableベースのフロントエンドを使用し、Google Sheets APIをバックエンドとする0円運用のランキングシステム。

## 🚀 主な機能

- **プレイヤー管理**: 登録・更新・ランキング表示
- **Eloレーティングシステム**: ゲーム数に応じたK値調整
- **トーナメント管理**: 大会作成・参加者管理
- **対戦記録**: 結果記録とレーティング自動更新
- **PWA対応**: モバイルアプリライクな操作感
- **0円運用**: Google Sheets無料枠 + Vercel無料枠

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 15 + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS (Lovableベース)
- **バックエンド**: Vercel Serverless Functions
- **データベース**: Google Sheets API v4
- **デプロイ**: Vercel

## 📋 セットアップ

### 1. Google Sheets API設定

`docs/google-sheets-setup.md` を参照してください。

### 2. 環境変数設定

`.env.local` ファイルを作成：

```env
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
```

### 3. 依存関係インストール

```bash
npm install
```

### 4. 開発サーバー起動

```bash
npm run dev
```

### 5. Vercelデプロイ

```bash
# Vercel CLIをインストール
npm i -g vercel

# デプロイ
vercel

# 環境変数をVercelダッシュボードで設定
```

## 📊 API エンドポイント

| エンドポイント | メソッド | 説明 |
|----------------|----------|------|
| `/api/players` | GET | 全プレイヤー取得 |
| `/api/players` | POST | プレイヤー作成 |
| `/api/players/[id]` | GET | 個別プレイヤー取得 |
| `/api/players/[id]` | PUT | プレイヤー更新 |
| `/api/ranking` | GET | ランキング取得 |
| `/api/tournaments` | GET/POST | トーナメント管理 |
| `/api/matches` | GET/POST | 対戦記録管理 |

## 🎯 Eloレーティング計算

- **初心者** (≤10戦): K=40
- **中級者** (11-50戦): K=20  
- **上級者** (51戦≤): K=10

計算式: `新レーティング = 現在レーティング + K × (実際の結果 - 期待勝率)`

## 🎨 デザインシステム

Lovableベースのファンタジー系デザイン：

- **カラーテーマ**: 羊皮紙風 + ゴールド + ブロンズ
- **アニメーション**: フェードイン・スライドアップ・バウンス
- **レスポンシブ**: モバイルファースト設計

## 📱 PWA機能

- ホーム画面追加
- オフライン対応
- プッシュ通知（今後実装予定）

## 🔧 開発コマンド

```bash
# 開発
npm run dev

# ビルド
npm run build

# 本番起動
npm run start

# リント
npm run lint
```

## 📄 ライセンス

MIT License