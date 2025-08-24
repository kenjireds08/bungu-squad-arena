# CLAUDE.md - BUNGU SQUAD Arena

## 📋 プロジェクト概要
**BUNGU SQUAD Arena** - 文房具カードゲーム大会管理システム
- リアルタイム大会運営システム
- QRコードエントリー・ELOレーティングシステム
- PWA対応（スマホアプリ同等の体験）
- Google Sheets APIによるゼロコスト運用

## 🏗️ 技術スタック
### フロントエンド
- **React 18** + **TypeScript**
- **Vite** (高速ビルドツール)
- **Tailwind CSS** + **shadcn/ui**
- **React Query** (データ管理)
- **PWA** (Progressive Web App)

### バックエンド
- **Next.js API Routes** (Vercel Serverless)
- **Google Sheets API** (データベース)
- **Node.js 22.x**

### デプロイ・インフラ
- **Vercel** (ホスティング・CI/CD)
- **カスタムドメイン**: ranking.bungu-squad.jp
- **SSL/HTTPS完全対応**

## 📁 プロジェクト構造
```
bungu-squad-arena/
├── src/
│   ├── components/          # 40+ Reactコンポーネント
│   │   ├── ui/              # shadcn/ui基盤コンポーネント
│   │   ├── Admin*.tsx       # 管理者機能
│   │   ├── Tournament*.tsx  # 大会関連
│   │   ├── Player*.tsx      # プレイヤー機能
│   │   ├── Match*.tsx       # 試合管理
│   │   └── QR*.tsx          # QRコード機能
│   ├── hooks/               # カスタムフック
│   ├── lib/                 # ユーティリティ・API
│   └── pages/               # ページコンポーネント
├── api/                     # Next.js API Routes
│   ├── tournaments.js       # 大会管理API
│   ├── players.js           # プレイヤー管理
│   ├── matches.js           # 試合管理
│   ├── rankings.js          # ランキング
│   └── lib/                 # API共通ライブラリ
├── docs/                    # 80+ 技術ドキュメント
├── scripts/                 # 管理スクリプト
└── public/                  # 静的アセット・PWA設定
```

## 🚀 主要機能
### 1. 大会管理システム
- 大会作成・編集・削除・自動終了
- QRコード生成・参加者管理
- リアルタイム進行状況管理

### 2. 試合管理システム
- 自動組み合わせ生成（総当たり・ランダム・手動）
- リアルタイム試合進行管理
- ELOレーティング自動計算

### 3. プレイヤー機能
- QRコードスキャンによる簡単エントリー
- 個人成績・履歴閲覧
- リアルタイムランキング
- バッジ・実績システム

### 4. 管理者機能
- 大会運営ダッシュボード
- 参加者・試合管理
- データエクスポート・修正機能
- デバッグ・復旧機能

## 🔧 開発・運用コマンド

### 基本コマンド
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# Lint・型チェック
npm run lint

# プレビュー
npm run preview
```

### Google Sheets管理スクリプト
```bash
# スプレッドシート構造確認
npm run read:sheet-structure

# データ構造検証
npm run validate:sheet-structure

# サンプルデータ追加
node scripts/add-sample-data.mjs

# 大会用データベースリセット
node scripts/reset-database-for-tournament.js
```

### 緊急時対応
```bash
# キャッシュクリア
./purge_cache.sh

# スプレッドシート再構築
node scripts/setup-spreadsheet.mjs

# 認証テスト
node scripts/test-auth.js
```

## 🌐 環境変数
```env
# Google Sheets API（必須）
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
GOOGLE_SHEETS_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
SPREADSHEET_ID="1ABC...XYZ"

# アプリケーション設定
NEXT_PUBLIC_APP_URL="https://ranking.bungu-squad.jp"

# PWA通知（オプション）
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BH..."
VAPID_PRIVATE_KEY="..."
```

## 📊 データ管理（Google Sheets）
### シート構成
- **players**: プレイヤー基本情報・レーティング
- **tournaments**: 大会情報・設定
- **matches**: 試合詳細・結果
- **rankings**: ランキング・統計
- **achievements**: 実績・バッジ管理

### データフロー
```
QRエントリー → players自動作成 → tournaments参加登録
試合開始 → matches記録 → レーティング自動計算 → rankings更新
```

## 🎯 品質・パフォーマンス
### コード品質
- **TypeScript**: 完全型安全
- **ESLint**: コード品質管理
- **Tailwind CSS**: 一貫したスタイル
- **shadcn/ui**: アクセシブルなUIコンポーネント

### パフォーマンス最適化
- **React Query**: 効率的なデータキャッシュ
- **Lazy Loading**: コンポーネント遅延読み込み
- **Image Optimization**: 最適化された画像配信
- **PWA Caching**: オフライン対応

### リアルタイム更新
- **ポーリングベース**: 1-10秒間隔での自動更新
- **バージョン管理**: 無駄な更新を削減
- **楽観的更新**: UX向上のための即座反映

## 🔐 セキュリティ
- **環境変数管理**: 秘密情報の安全な管理
- **APIレート制限**: 不正利用防止
- **入力値検証**: XSS・インジェクション対策
- **HTTPS強制**: 通信の暗号化

## 📱 PWA機能
- **オフライン対応**: 基本機能のオフライン利用
- **ホーム画面追加**: アプリ同等の利用体験
- **プッシュ通知**: 大会開始・結果通知
- **カメラアクセス**: QRコード読み取り

## 🚀 デプロイメント
### Vercel自動デプロイ
1. GitHubへのpush
2. Vercel自動ビルド・デプロイ
3. 本番環境反映（ranking.bungu-squad.jp）

### 手動デプロイ（非推奨）
```bash
# 商用利用時のみ・安全性重視でVercel CLIは使用しない
# Vercel管理画面からのデプロイを推奨
```

## 💰 運用コスト
### 月額コスト
- **Vercel Pro**: $20/月（商用利用時）
- **Google Sheets API**: 無料（月間500万リクエスト内）
- **ドメイン**: 約$10/年
- **合計**: 月額約3,000円

### スケーラビリティ
- **参加者**: 1,000人まで対応済み
- **同時大会**: 複数大会同時運営可能
- **API制限**: Google Sheets無料枠内で十分

## 🐛 トラブルシューティング
### よくある問題
1. **Google Sheets API エラー**
   ```bash
   node scripts/test-auth.js  # 認証確認
   ```

2. **レーティング計算エラー**
   ```bash
   # 管理画面 → デバッグ機能 → レーティング再計算
   ```

3. **PWA インストールできない**
   - HTTPS環境確認
   - manifest.json確認
   - Service Worker登録確認

4. **リアルタイム更新停止**
   - ネットワーク接続確認
   - API制限チェック
   - ブラウザキャッシュクリア

## 📞 サポート・保守
### 緊急時対応
1. **システムダウン**: Vercel管理画面で状況確認
2. **データ破損**: Google Sheetsから手動復旧
3. **API制限**: 使用量確認・制限解除

### 定期メンテナンス
- **月次**: ログ確認・パフォーマンス監視
- **年次**: 依存関係更新・セキュリティ監査

## 🔄 今後の拡張予定
- **多言語対応**: 国際大会への対応
- **高度な統計**: AIによる勝率予測
- **動画配信連携**: YouTube Live統合
- **スマートウォッチ対応**: 試合通知・結果確認

---

**このシステムは実戦運用済みの、完全にカスタマイズされたリアルタイム大会管理プラットフォームです。**

**開発者**: 菊池健司（フルスタックエンジニア）  
**運用実績**: 2025年7月〜（複数大会で運用済み）  
**技術サポート**: 継続的な改善・機能追加対応可能