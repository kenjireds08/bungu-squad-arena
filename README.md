# BUNGU SQUAD Arena - ボードゲーム大会管理システム

## 概要

BUNGU SQUAD Arenaは、文房具を使ったボードゲーム大会の運営を効率化するWebアプリケーションです。
QRコードによる簡単エントリー、リアルタイムランキング、ELOレーティングシステムなど、プレイヤーと運営者双方に便利な機能を提供します。

### 主な特徴

- 🎮 **リアルタイム大会管理** - 試合の進行状況を即座に反映
- 📊 **ELOレーティングシステム** - 公平な実力評価システム
- 📱 **PWA対応** - スマートフォンアプリとして動作
- 💰 **ゼロコスト運用** - Google スプレッドシートをデータベースとして活用
- 🔄 **自動更新** - 30秒ごとに最新情報を取得

## 技術スタック

### フロントエンド
- **React 18** - UIライブラリ
- **TypeScript** - 型安全な開発
- **Vite** - 高速なビルドツール
- **Tailwind CSS** - ユーティリティファーストCSS
- **shadcn/ui** - 再利用可能なUIコンポーネント

### バックエンド
- **Next.js API Routes** - サーバーレスAPI
- **Google Sheets API** - データストレージ
- **Vercel** - ホスティング＆デプロイメント

### その他
- **PWA (Progressive Web App)** - オフライン対応
- **Web Push Notifications** - プッシュ通知
- **QR Code Scanner** - カメラを使った大会エントリー

## アーキテクチャ

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   Client    │────▶│  API Routes  │────▶│ Google Sheets   │
│  (React)    │◀────│  (Next.js)   │◀────│   Database      │
└─────────────┘     └──────────────┘     └─────────────────┘
       │                    │
       │                    ▼
       │            ┌──────────────┐
       └───────────▶│    Vercel    │
                    │   (Hosting)  │
                    └──────────────┘
```

## 主要機能

### プレイヤー向け機能
- QRコードスキャンによる大会エントリー
- リアルタイムランキング表示
- 個人成績・対戦履歴の閲覧
- レーティング推移グラフ
- プッシュ通知による試合開始通知

### 管理者向け機能
- 大会の作成・管理
- 試合組み合わせの自動生成
- 勝敗記録とレーティング自動計算
- 参加者管理
- QRコード生成

## データ構造

### Google スプレッドシート構成
```
players/         # プレイヤー情報
├── id
├── nickname
├── current_rating
├── games_played
└── tournament_active

tournaments/     # 大会情報
├── tournament_id
├── name
├── date
├── status
└── qr_code

matches/         # 試合情報
├── match_id
├── player1_id
├── player2_id
├── winner_id
├── status
└── result_details

match_history/   # 対戦履歴
├── match_id
├── tournament_id
├── created_at
└── completed_at
```

## セットアップ

### 必要要件
- Node.js 18以上
- npm または yarn
- Google Cloud Platform アカウント
- Vercel アカウント（デプロイ用）

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/yourusername/bungu-squad-arena.git
cd bungu-squad-arena

# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.localに必要な環境変数を設定
```

### 環境変数

```env
# Google Sheets API
GOOGLE_SHEETS_PRIVATE_KEY=your_private_key
GOOGLE_SHEETS_CLIENT_EMAIL=your_client_email
SPREADSHEET_ID=your_spreadsheet_id

# PWA Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 開発サーバーの起動

```bash
npm run dev
# http://localhost:3000 でアクセス可能
```

### ビルド

```bash
npm run build
npm run preview
```

## デプロイ

### Vercelへのデプロイ

1. Vercelアカウントでログイン
2. GitHubリポジトリを接続
3. 環境変数を設定
4. デプロイ実行

```bash
# Vercel CLIを使用する場合
vercel --prod
```

## ゼロコスト運用の仕組み

### Google Sheets API
- 無料枠: 月間500万リクエスト
- 実際の使用量: 月間約10万リクエスト（100人規模の大会×10回）

### Vercel
- 無料枠: 月間100GB帯域幅
- 実際の使用量: 月間約5GB（アクティブユーザー100人）

### コスト削減の工夫
- キャッシュの活用（30秒間隔での更新）
- 画像の最適化（WebP形式、遅延読み込み）
- APIリクエストのバッチ処理

## パフォーマンス最適化

- **Code Splitting** - ルートベースの動的インポート
- **Image Optimization** - Next.js Image Componentの活用
- **PWA Caching** - Service Workerによるオフライン対応
- **Lazy Loading** - 必要なコンポーネントのみ読み込み

## セキュリティ

- 環境変数による秘密情報の管理
- APIレート制限の実装
- 入力値のバリデーション
- XSS対策（React標準）

## ライセンス

MIT License

## 開発者

開発・設計: Kenji Kikuchi

## お問い合わせ

- GitHub Issues: [問題報告・機能要望](https://github.com/yourusername/bungu-squad-arena/issues)
- Email: your-email@example.com