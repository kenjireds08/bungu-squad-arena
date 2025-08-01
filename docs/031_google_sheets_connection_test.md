# 031 Google Sheets API接続テスト実装

## 実施内容
FUNCTION_INVOCATION_FAILED エラーの原因を特定するため、段階的なGoogle Sheets API接続テストを実装

## 作成したテスト関数

### 1. `/api/sheets-auth.js` - 認証テスト
- Google Sheets APIの認証のみをテスト
- サービスアカウントキーのパースと認証クライアント作成を確認
- 実際のスプレッドシートアクセスは行わない

### 2. `/api/sheets-read.js` - 読み取りテスト  
- 基本的なスプレッドシート読み取り操作をテスト
- `Players!A1:C10` の範囲から最大10行を読み取り
- 認証 + 実際のデータアクセスの両方を確認

## テスト戦略

### Phase 1: 認証確認
```
GET https://bungu-squad-arena.vercel.app/api/sheets-auth
```
- 期待結果: 200 OK with service account email
- 失敗時: サービスアカウントキーの問題

### Phase 2: 読み取り確認
```
GET https://bungu-squad-arena.vercel.app/api/sheets-read
```
- 期待結果: 200 OK with sample data
- 失敗時: スプレッドシート共有権限の問題

## 想定される問題と対処

### ケース1: sheets-auth が 500
- サービスアカウントキーの形式エラー
- 環境変数の設定問題
- googleapis ライブラリのインポートエラー

### ケース2: sheets-auth OK, sheets-read が 500
- スプレッドシートがサービスアカウントに共有されていない
- スプレッドシートIDの間違い
- シート名("Players")の不一致

### ケース3: 両方 OK, 既存API が 500
- 既存のコードにある複雑な処理でのエラー
- トランザクション処理やバッチ更新での問題

## 次のステップ
1. Vercelデプロイ完了後、テスト関数の実行結果を確認
2. エラーが出た場合は Vercel Logs で詳細を確認
3. 成功した場合は既存の `/api/players`, `/api/rankings` の修復作業に進む