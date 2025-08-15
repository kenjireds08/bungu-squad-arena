# 076 - QRコード新規登録バグ修正完了

## 日付
2025-08-15

## 解決した問題
QRコードから新規登録した際に、tournament_activeがFALSEのまま更新されない問題を修正

## 原因
- Google SheetsのPlayersシートでX列が`reserved_1`という名前になっていた
- コードは`tournament_active`というカラム名を探していた
- カラムが見つからず、インデックス-1で値が設定されていなかった

## 修正内容

### 1. sheets.js - addPlayer関数の修正
```javascript
// tournament_activeカラムの処理を改善
const tournamentActiveIdx = idx('tournament_active') >= 0 ? idx('tournament_active') : 
                            idx('reserved_1') >= 0 ? idx('reserved_1') : 23;
newRow[tournamentActiveIdx] = playerData.tournament_active ? 'TRUE' : 'FALSE';
```

### 2. PWAインストール案内の追加
- QRコード経由のユーザー向けに自動表示（3秒後）
- 既存の`PWAInstallPrompt`コンポーネントを再利用
- iPhone/Android両方の手順を表示

## テスト結果
✅ QRコードから新規登録 → 正常にエントリー完了
✅ Google SheetsのX列（reserved_1）にTRUEが設定される
✅ 管理画面でアクティブプレイヤー数が正しく表示
✅ PWAインストール案内が表示される

## 学んだこと
- Google Sheetsのカラム名とコードの期待値が一致しているか確認する重要性
- フォールバック処理を実装しておくことで、将来の変更に強くなる
- 既存コンポーネントの再利用でコードの重複を避ける

## 次のステップ
- 管理画面のリロードが遅い問題の調査・修正
- ゲームバッジ自動付与機能の実装
- 大会終了画面のUI改善