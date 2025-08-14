# 📋 BUNGU SQUAD ARENA - 開発引き継ぎドキュメント 071
**作成日時**: 2025-08-14  
**目的**: 070で特定された課題の解決作業引き継ぎ  
**状況**: 本番稼働中のため、ブランチを切って安全に作業  

## 🚨 最重要：作業開始前の準備

### 1. ブランチ作成と切り替え
```bash
# 最新のmainを取得
git pull origin main

# 作業用ブランチを作成
git checkout -b fix/post-tournament-issues

# ブランチ確認
git branch
```

### 2. 現在の動作確認
- 本番環境: https://ranking.bungu-squad.jp
- 正常動作していることを確認してから作業開始

## 🔴 Phase 1: 緊急修正タスク（優先順位順）

### 1. 🚨 大会終了時のプレイヤー非アクティブ化問題【最優先】
**問題**: 大会終了ボタンを押しても参加者が`tournament_active = FALSE`にならない

**修正対象ファイル**:
- `/api/admin.js` - `handleEndTournament()`関数
- `/api/lib/sheets.js` - `deactivateTournamentParticipants()`関数

**確認ポイント**:
```javascript
// api/admin.js の handleEndTournament() 内で
// deactivateTournamentParticipants() が正しく呼ばれているか確認

// 期待される動作:
// 1. 大会status → 'completed'
// 2. 全参加者のtournament_active → FALSE
```

**テスト手順**:
1. テスト大会を作成
2. 数名をQRエントリー
3. 大会終了ボタンを押す
4. Playersシートでtournament_activeがFALSEになることを確認

### 2. 🥇 ゲームルールバッジの自動付与
**問題**: トランプ（♠️）やカード+（➕）バッジが自動付与されない

**修正対象ファイル**:
- `/api/lib/sheets.js` - `updateMatchStatus()`関数内
- `/api/lib/sheets.js` - `updatePlayerGameExperience()`関数

**実装内容**:
```javascript
// updateMatchStatus() の試合完了処理後に追加
await updatePlayerGameExperience(player1_id, gameType);
await updatePlayerGameExperience(player2_id, gameType);
```

### 3. 🆕 次の試合選択の柔軟性向上
**問題**: 次の試合が1組しか表示されず、順番通りにしか進められない

**修正対象ファイル**:
- `/src/components/TournamentManagement.tsx`
- `/api/matches.js` - 次の試合候補取得API

**実装内容**:
- 次の試合候補を3-5試合表示
- 両プレイヤーが空いている試合を優先表示
- 「この試合を後回し」ボタン追加

### 4. ⚡ レスポンス速度の改善
**特に遅い箇所**:
- 試合開始 → 試合中への移行（10秒）
- 試合結果入力 → 完了への移行（10秒）

**対策**:
- キャッシュの見直し
- 不要なAPI呼び出しの削減
- 楽観的UIの実装

## 📝 実装時の注意事項

### Google Sheetsの列マッピング
```javascript
// reserved_1列がtournament_activeとして使われている
const reservedIdx = headers.indexOf('reserved_1');
if (reservedIdx !== -1) {
  newRow[reservedIdx] = playerData.tournament_active ? 'TRUE' : 'FALSE';
}
```

### データベース更新時の注意
- Google Sheets APIは更新が反映されるまで遅延がある
- 更新後は必ず`clearCache()`を呼ぶ
- 重要な更新は`await`で同期的に処理

## 🧪 テスト環境構築

### ローカルテスト用の設定
1. `.env.local`が正しく設定されていることを確認
2. Google Sheetsのテスト用シートを用意（本番とは別）
3. `npm run dev`でローカル環境起動

### テストシナリオ
1. **大会作成 → エントリー → 試合 → 大会終了**の一連の流れ
2. 各機能が正しく動作することを確認
3. 本番環境へのデプロイ前に必ずステージング環境でテスト

## 📊 現在の完了状況（070より）

| 機能 | 完成度 | 優先度 |
|------|--------|--------|
| 大会終了時の非アクティブ化 | 0% | 🔴 最優先 |
| バッジ自動付与 | 30% | 🟡 高 |
| 次の試合選択柔軟性 | 0% | 🟡 高 |
| レスポンス速度改善 | 40% | 🟢 中 |

## 🚀 作業の進め方

1. **このドキュメントを読む**
2. **070を再度確認**: `docs/070_post_tournament_tasks_and_improvements.md`
3. **ブランチを作成**
4. **Phase 1の課題から順番に解決**
5. **各修正後にコミット**（細かくコミットして安全に）
6. **本番反映前に必ずテスト**

## 💡 クイックスタートコマンド

```bash
# セッション開始時
cd /Users/kikuchikenji/bungu-squad-arena
git status
git pull origin main
git checkout -b fix/post-tournament-issues

# 070の内容確認
cat docs/070_post_tournament_tasks_and_improvements.md

# 関連ファイルの確認
ls -la api/admin.js
ls -la api/lib/sheets.js
ls -la src/components/TournamentManagement.tsx

# 開発サーバー起動
npm run dev
```

## ⚠️ リスク管理

- **本番稼働中**なので、慎重に作業
- 修正は**ブランチで作業**し、テスト後にマージ
- データベース（Google Sheets）の**バックアップ**を取る
- 不明な点があれば、069、070のドキュメントを参照

---

**次のセッションへのメッセージ**:

「071_development_handover_for_fixes.mdを読んでください。070で特定された緊急課題（特に大会終了時のプレイヤー非アクティブ化問題）から修正を始めてください。本番稼働中なので、必ずブランチを切って作業してください。」

**Good luck!** 🚀