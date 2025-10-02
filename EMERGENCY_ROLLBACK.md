# 🚨 緊急ロールバック手順書（大会当日用）

## ⚠️ この手順書について
大会当日に万が一アプリが動かなくなった場合、この手順で即座に安全な状態に戻せます。

---

## 📌 セーフティポイント情報
- **タグ名**: `tournament-safety-2025-10-03`
- **コミット**: `6aaf493 revert: PWAキーボード修正を差し戻し、対応手順書を作成`
- **作成日時**: 2025-10-03 07:35頃
- **状態**: ✅ 本番環境で動作確認済み

---

## 🔙 ロールバック手順（3分以内）

### 方法1: タグから即座に復旧（最速）
```bash
# 1. セーフティポイントに戻る
git checkout tournament-safety-2025-10-03

# 2. mainブランチを上書き（強制）
git checkout main
git reset --hard tournament-safety-2025-10-03

# 3. Vercelに即座にデプロイ
git push origin main --force
```

### 方法2: ブランチ切り替え（より安全）
```bash
# 1. mainブランチに戻る
git checkout main

# 2. 最新の変更を破棄
git reset --hard origin/main

# 3. セーフティポイントまで戻る
git reset --hard tournament-safety-2025-10-03

# 4. リモートに反映
git push origin main --force
```

### 方法3: Vercel管理画面から復旧（Git操作不要）
1. https://vercel.com/dashboard にアクセス
2. `bungu-squad-arena` プロジェクトを選択
3. **Deployments** タブを開く
4. セーフティポイントのデプロイメント（7:35頃のもの）を探す
5. 右側の「...」→ **Promote to Production** をクリック

---

## ✅ 復旧確認チェックリスト
- [ ] https://ranking.bungu-squad.com にアクセスできる
- [ ] 管理画面にログインできる
- [ ] 大会一覧が表示される
- [ ] QRコード生成が機能する
- [ ] 参加者登録ができる

---

## 📞 緊急時の連絡先
- **Vercelサポート**: https://vercel.com/help
- **GitHub Issues**: https://github.com/kenjireds08/bungu-squad-arena/issues

---

## 🎯 大会中のトラブル対応優先順位
1. **最優先**: アプリの動作復旧（このロールバック手順）
2. **次優先**: 参加者への説明・代替手段の案内
3. **最後**: 問題の根本原因調査（大会後に実施）

---

**重要**: このファイルは大会終了まで削除しないでください。
