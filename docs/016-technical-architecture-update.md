# BUNGU SQUAD ランキングシステム 技術構成変更記録

**日時**: 2025年7月24日  
**理由**: 開発効率とシステム品質向上のため  
**変更者**: ちーけん  
**承認**: 要件定義v3.0に反映済み

---

## 🔄 技術構成変更

### Before: GAS方式
```
Next.js (Frontend) ⟷ Google Apps Script ⟷ Spreadsheet
```

### After: API統合方式  
```
Next.js (Frontend) ⟷ Vercel Serverless Functions ⟷ Google Sheets API ⟷ Spreadsheet
```

---

## ✅ 変更理由

### 開発効率の向上
- **開発環境**: VS Code等の高機能IDEが使用可能
- **バージョン管理**: Git完全対応
- **デバッグ**: ローカル環境での完全なデバッグ環境
- **型安全性**: 完全TypeScript環境

### システム品質の向上  
- **テスト**: Jest等による自動テスト対応
- **CI/CD**: 自動デプロイ・品質チェック
- **パフォーマンス**: GASの制限を回避
- **PWA機能**: Service Worker等の高度機能が容易

### 将来性の確保
- **拡張性**: 新機能追加が容易
- **保守性**: コードの可読性・メンテナンス性向上
- **移行性**: 将来的なSupabase移行等も容易

---

## 💰 コスト変更

| 項目 | GAS方式 | API統合方式 |
|------|---------|-------------|
| **開発・ホスティング** | 無料 | 無料（Vercel Hobby） |
| **データベース** | 無料 | 無料（Google Sheets API） |
| **月額運用コスト** | 0円 | 0円 |
| **年額コスト** | ドメイン代のみ | ドメイン代のみ |

**結論**: コストは変わらず、機能・品質が大幅向上

---

## 🚀 開発フロー変更

### 開発環境
- **エディタ**: VS Code + TypeScript + Tailwind CSS IntelliSense
- **ローカル開発**: `npm run dev` でホットリロード
- **デバッグ**: Chrome DevTools + ブレークポイント

### デプロイフロー
1. **ローカル開発** → コード作成・テスト
2. **Git Push** → GitHub Repository
3. **自動デプロイ** → Vercel が自動ビルド・デプロイ
4. **本番確認** → リアルタイムで反映確認

### データベース連携
```typescript
// 例: プレイヤー情報取得
import { GoogleSpreadsheet } from 'google-spreadsheet';

export default async function handler(req, res) {
  const doc = new GoogleSpreadsheet(SPREADSHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY,
  });
  
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['players'];
  const rows = await sheet.getRows();
  
  res.json({ players: rows });
}
```

---

## 📋 移行作業完了済み

### ✅ ドキュメント更新
- [x] 要件定義書v3.0に技術構成反映
- [x] 技術変更記録作成
- [ ] インフォグラフィックプロンプト更新
- [ ] セットアップ手順書更新

### ✅ 開発準備
- [x] 技術方針決定
- [x] ワラビサコさんのスプレッドシート共有済み
- [x] 開発環境準備完了

---

## 🎯 次のステップ

1. **プロジェクト初期化**
   ```bash
   npx create-next-app@14 bungu-squad-ranking --typescript --tailwind --app
   ```

2. **Google Sheets API設定**
   - Google Cloud Platform でプロジェクト作成
   - Sheets API 有効化
   - サービスアカウント作成

3. **Vercel設定**
   - GitHub Repository 連携
   - 環境変数設定（API キー等）

4. **開発開始**
   - 基本レイアウト作成
   - API Routes 実装
   - PWA設定

---

**この技術構成変更により、要件定義v3.0で定義された全機能を高品質・高効率で実装可能となります。**