# 029 新しいサービスアカウントキーの生成

## 新しいサービスアカウントキー取得完了

以下の新しいJSONキーファイルを取得：

### キー情報
- **Project ID**: bungu-squad-ranking
- **Client Email**: bungu-squad-ranking@bungu-squad-ranking.iam.gserviceaccount.com
- **Private Key ID**: a71b3bd92367fd495103b63a6493d823ab7e74d1

### 次のステップ
1. VercelでGOOGLE_SERVICE_ACCOUNT_KEYを新しいJSONで更新
2. 環境変数設定後、APIテスト実行
3. Google Sheets APIアクセス確認

### Vercel環境変数更新手順
1. Vercel Dashboard → bungu-squad-arena → Settings → Environment Variables
2. GOOGLE_SERVICE_ACCOUNT_KEY を編集
3. 新しいJSONの全体をコピーして貼り付け
4. Save

### 注意事項
- JSONファイル全体を1行で貼り付ける
- 改行やスペースの余分な追加に注意
- 更新後は自動で再デプロイされる