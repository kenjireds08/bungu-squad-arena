# 078 - ゲームバッジ自動付与機能の実装

## 日付
2025-08-15

## 機能の概要
試合が完了した際に、自動的にプレイヤーにゲームルールバッジを付与する

## 現在のバッジシステム
- `trump_rule_experienced` (♠️): トランプルール経験フラグ
- `cardplus_rule_experienced` (➕): カードプラスルール経験フラグ
- `first_trump_game_date`: 初めてトランプルールでプレイした日付
- `first_cardplus_game_date`: 初めてカードプラスルールでプレイした日付

## 実装内容

### 1. 試合完了時の自動バッジ付与
- 試合のgame_typeを確認
- プレイヤーの経験フラグをチェック
- 未経験の場合、フラグをTRUEに更新
- 初回プレイ日付を記録

### 2. 対象タイミング
- 管理者による直接入力時
- 試合承認時
- 試合結果報告時

### 3. 実装場所
- `sheets.js` - `updateMatchStatus`関数
- `sheets.js` - `adminDirectMatchResult`関数
- 新規関数: `updatePlayerGameExperience`

## 実装手順
1. `updatePlayerGameExperience`関数を作成
2. 各試合完了処理に組み込み
3. テストして動作確認