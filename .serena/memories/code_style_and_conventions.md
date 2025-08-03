# コードスタイル・規約

## TypeScript設定
- 厳密な型チェック有効
- ES2020対応
- JSXファクトリー：React

## コードスタイル
- ESLint設定（eslint.config.js）
- React Hooks推奨
- 関数型コンポーネント優先
- shadcn/ui + TailwindCSSのコンポーネント設計

## API設計規約
- RESTful API（Vercel Serverless Functions）
- Google Sheets APIとの統合
- エラーハンドリング：統一したレスポンス形式
- 認証：メール認証ベース

## ファイル構成規約
```
src/
├── components/     # UIコンポーネント
├── pages/         # ページコンポーネント
├── hooks/         # カスタムフック
├── lib/           # ユーティリティ・設定
├── utils/         # ヘルパー関数
├── styles/        # スタイル
└── assets/        # 静的ファイル

api/
├── *.js          # Vercel Serverless Functions
└── lib/          # API共通ライブラリ
```

## データ型統一規則（Google Sheets）
- Boolean値：`TRUE`/`FALSE`（大文字統一）
- 日付：`YYYY-MM-DD`形式
- 日時：`YYYY-MM-DD HH:MM:SS`形式
- ID：英数字文字列

## 重要な制約
- Google Sheets列順序変更禁止（APIマッピング破綻防止）
- 外部キー整合性必須（player_id、tournament_id、match_id）
- Vercelサーバーレス関数12個制限（現在9個使用）