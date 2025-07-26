# 027 詳細エラーログの追加

## 実施した変更
API エラーの詳細を特定するため、エラーハンドリングを強化：

### 1. sheets.jsのエラーログ強化
- 実際のエラー内容を含めるように修正
- 環境変数の存在確認ログを追加

### 2. 追加されたログ情報
```javascript
console.error('Environment check:', {
  hasServiceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  hasSheetId: !!process.env.GOOGLE_SHEETS_ID,
  sheetId: process.env.GOOGLE_SHEETS_ID,
  serviceAccountLength: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.length
});
```

## 次のステップ
1. Vercelでの自動デプロイ完了後、APIを再度テスト
2. Runtime Logsで詳細なエラー情報を確認
3. 環境変数やGoogle Sheets API認証の問題を特定

## 予想される問題点
- 環境変数の形式エラー
- Google Sheets APIの認証失敗
- スプレッドシートへのアクセス権限不足