# 073 - QRコード新規登録時のエントリー失敗バグ修正

## 日付
2025-08-15

## 問題の詳細
**症状**: 
- iPhoneのQRコードリーダーで読み込み、新規アカウント作成
- ニックネームとメールアドレス入力後、エントリー完了画面表示
- 大会待機画面に遷移するが、実際にはエントリーされていない（tournament_active = false）
- 再度QRコードを読み込むことでエントリー可能

## 調査結果

### 現在のフロー（メール認証なし）
1. QRコード読み取り → `/tournament-entry/[id]?from_qr=true`
2. ニックネームとメールアドレス入力
3. handleEntry() 実行
   - 一時ユーザーID作成（temp_user_xxx）
   - `/api/admin?action=tournament-entry` APIコール
4. API側で一時ユーザーをPlayersシートに追加
   - `tournament_active: true` を設定
5. エントリー完了画面表示
6. 大会待機画面へ自動遷移

### 問題点
- 新規ユーザー作成時の`tournament_active`フラグが正しく設定されていない可能性
- または、作成後の遷移タイミングの問題

## 修正内容

### 1. /api/auth.js の修正（メール認証使用時のバックアップ）
- 新規プレイヤー作成時、tournamentIdがある場合は`tournament_active: true`を即座に設定
- 既存の処理で二重にupdateしないようチェックを追加

```javascript
// Before
tournament_active: false // Will be set to true in next step

// After  
tournament_active: !!playerData.tournamentId // Set to true if from tournament QR
```

### 2. 今後の確認事項
- `/api/admin?action=tournament-entry` で作成される一時ユーザーが正しくPlayersシートに保存されているか
- tournament_activeフラグが確実にTRUEになっているか
- エントリー完了後のデータ同期タイミング

## テスト手順
1. テスト大会を作成
2. QRコードを生成
3. ブラウザのプライベートモードで QRコードをスキャン
4. 新規ニックネームとメールアドレスを入力
5. エントリー完了後、Google Sheetsで以下を確認：
   - Playersシートに新規ユーザーが追加されている
   - tournament_activeがTRUEになっている
   - TournamentParticipantsシートにエントリーが記録されている

## 次のステップ
- 実際のテスト環境で新規登録フローを検証
- ログを追加して問題の箇所を特定
- 必要に応じて追加の修正を実施