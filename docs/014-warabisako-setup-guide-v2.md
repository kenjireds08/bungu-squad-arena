# ワラビサコさん向け：BUNGU SQUADランキングシステム セットアップ手順書 v2.0

**日時**: 2025年07月24日  
**対象**: ワラビサコさん  
**作業者**: ワラビサコさん  
**所要時間**: 約5分（大幅簡素化）

---

## 📋 重要な変更点

### 🎉 GAS不要になりました！
技術構成をAPI統合方式に変更したため、**Google Apps Script（GAS）の設定は不要**となりました。

**新しい開発方式**:
- ちーけんのVercelアカウント + TypeScript開発
- Google Sheets APIでワラビサコさんのスプレッドシートに接続
- より高速・高品質な開発が可能

---

## 🚀 必要な作業（簡素化）

### ✅ 既に完了している作業
- [x] **スプレッドシート作成・共有** - 完了済み
- [x] **GASプロジェクト作成・共有** - 参考用として残存（使用しません）

### 📝 追加で必要な作業

#### 手順1: Google Cloud Platform の準備
**ワラビサコさんが実行**:
1. **Google Cloud Console**（https://console.cloud.google.com/）にアクセス
2. 新しいプロジェクトを作成：
   - プロジェクト名：「BUNGU SQUAD Ranking System」
   - プロジェクトIDは自動生成でOK
3. **Google Sheets API** を有効化
   - 「APIとサービス」→「ライブラリ」
   - 「Google Sheets API」を検索して有効化

#### 手順2: サービスアカウント作成
**ワラビサコさんが実行**:
1. **「APIとサービス」→「認証情報」** に移動
2. **「認証情報を作成」→「サービスアカウント」** を選択
3. サービスアカウント詳細：
   - 名前：「BUNGU SQUAD API Service」
   - ID：自動生成でOK
   - 説明：「ランキングシステム用API接続」
4. **「作成して続行」** をクリック
5. ロール選択：**「編集者」** を選択
6. **「完了」** をクリック

#### 手順3: 認証キー生成・共有
**ワラビサコさんが実行**:
1. 作成したサービスアカウントをクリック
2. **「キー」タブ** → **「鍵を追加」→「新しい鍵を作成」**
3. キータイプ：**JSON** を選択
4. **「作成」** → JSONファイルがダウンロード
5. **このJSONファイルをちーけんに共有**（セキュアな方法で）

#### 手順4: スプレッドシート権限追加
**ワラビサコさんが実行**:
1. ダウンロードしたJSONファイルを開く
2. `"client_email"` の値（○○○@○○○.iam.gserviceaccount.com）をコピー
3. **BUNGU SQUADスプレッドシート** を開く
4. **「共有」** → コピーしたメールアドレスを追加
5. 権限を **「編集者」** に設定

---

## 📨 完了報告

作業完了後、以下をちーけんに連絡：

```
ちーけんさん、API統合方式での準備が完了しました！

✅ Google Cloud Project作成完了
✅ Google Sheets API有効化完了  
✅ サービスアカウント作成完了
✅ 認証JSONファイル準備完了（別途共有します）
✅ スプレッドシートにサービスアカウント権限追加完了

本格的な開発開始をお願いします！
```

---

## 💡 このアプローチの利点

### 🚀 開発効率向上
- **VS Code環境**: 高機能なエディターでの開発
- **Git管理**: バージョン管理とバックアップ
- **自動デプロイ**: コード変更が即座に反映

### 🔧 保守性向上  
- **型安全性**: TypeScriptで開発時エラーを防止
- **テスト対応**: 自動テストでバグ予防
- **拡張性**: 新機能追加が容易

### 💰 コスト据え置き
- **月額0円**: 無料プランで全機能利用可能
- **高品質**: 商用レベルのシステム品質

---

## 🛠️ トラブルシューティング

### よくある質問

**Q: Google Cloud Platform の利用料金は？**
→ A: Google Sheets API は無料枠（日100リクエスト/ユーザー）で十分です。課金されません。

**Q: サービスアカウントのJSONファイルは安全？**  
→ A: ちーけんがVercelの環境変数（暗号化保存）で管理するため安全です。

**Q: 今まで作ったGASプロジェクトは削除すべき？**
→ A: 削除不要です。参考資料として残しておいても問題ありません。

**Q: スプレッドシートの構造変更は必要？**
→ A: 不要です。現在の構造のまま使用できます。

---

## 📞 サポート

作業中に不明な点があれば、ちーけんに気軽にご連絡ください。
Google Cloud Platform の設定は一度だけなので、丁寧にサポートします！

---

**作成者**: ちーけん  
**技術方式**: API統合方式（Vercel + Google Sheets API）  
**最終更新**: 2025年07月24日