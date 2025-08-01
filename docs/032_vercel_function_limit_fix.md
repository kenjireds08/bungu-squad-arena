# 032 Vercel Hobbyプラン12関数制限対応

## 問題
Vercelデプロイ時に以下のエラーが発生：
```
Error: No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan.
```

## 原因
`/api`フォルダ内に13個の関数ファイルが存在し、Hobbyプランの12関数制限を超過

### 削除前の関数一覧（13個）
1. admin.js
2. env-check.js ← 削除
3. health.js
4. matchResults.js
5. matches.js
6. players.js
7. rankings.js
8. sheets-auth.js ← 削除
9. sheets-read.js ← 削除
10. test.js ← 削除
11. tournament-system.js
12. tournaments.js
13. lib/sheets.js (これは関数ではなくライブラリ)

## 対処法
デバッグ用の4つのテスト関数を削除：
- `api/test.js` - 基本動作テスト用
- `api/env-check.js` - 環境変数確認用
- `api/sheets-auth.js` - Google Sheets認証テスト用
- `api/sheets-read.js` - Google Sheets読み取りテスト用

## 削除後の関数一覧（9個）
1. admin.js
2. health.js
3. matchResults.js
4. matches.js
5. players.js
6. rankings.js
7. tournament-system.js
8. tournaments.js
9. lib/sheets.js (ライブラリ)

## 結果
- 9個の関数で12個制限内に収まり、デプロイ可能
- 本質的な機能は全て保持
- デバッグは`vercel dev`でローカル実行可能

## 今後の対策
1. **短期**: 現在の9関数で運用
2. **中期**: 関数数が増える場合はキャッチオール方式(`api/[...path].js`)で統合
3. **長期**: 必要に応じてProプランへアップグレード（100関数まで対応）

## 次のステップ
1. Vercelデプロイ完了確認
2. 既存API (`/api/players`, `/api/rankings`等) の動作確認
3. 500エラーが継続する場合はGoogle Sheets API認証問題の調査継続