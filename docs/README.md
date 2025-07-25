# BUNGU SQUAD ランキングシステム - ドキュメント

## 📁 ドキュメント構成

このフォルダには、BUNGU SQUADランキングシステム開発に関する全ての重要な情報が含まれています。

### 📋 ファイル一覧

| ファイル | 内容 | 更新頻度 |
|---------|------|----------|
| `001-project-overview.md` | プロジェクト概要・基本情報 | 要件変更時 |
| `002-implementation-comparison.md` | 実装方式の詳細比較 | 仕様確定時 |
| `003-webapp-technical-specs.md` | Webアプリ版技術仕様書 | 開発進行時 |
| `004-meeting-checklist.md` | 打ち合わせ確認事項 | 打ち合わせ前 |
| `005-warabisako-requirements-update.md` | ワラビサコさん要件更新 | 要件変更時 |
| `006-updated-meeting-checklist.md` | 更新版打ち合わせチェックリスト | 打ち合わせ前 |
| `007-meeting-results.md` | 打ち合わせ結果記録 | 打ち合わせ後 |
| `008-google-meet-summary.md` | Google Meet詳細記録 | 打ち合わせ後 |
| `009-design-guidelines.md` | デザインガイドライン | デザイン確定時 |
| `010-enhanced-system-requirements.md` | 拡張システム要件 | 要件拡張時 |
| `011-meeting-transcript-analysis.md` | 会議文字起こし分析 | 打ち合わせ後 |
| `012-system-requirements-specification.md` | 正式要件定義書v3.0 | 仕様確定時 |
| `013-development-session-log.md` | 開発セッション記録 | 開発進行時 |
| `014-warabisako-setup-guide.md` | ワラビサコさんセットアップガイド | セットアップ時 |
| `015-infographic-prompt.md` | インフォグラフィック作成プロンプト | 資料作成時 |
| `016-technical-architecture-update.md` | 技術構成変更記録 | 技術変更時 |
| `017-lovable-ui-google-sheets-migration.md` | Lovable UI + Google Sheets移行完了記録 | 移行完了時 |

### 🔄 更新ルール

#### ファイル命名規則
```
XXX-項目名.md
├── 001-099: 要件・設計関連
├── 100-199: 実装関連
├── 200-299: テスト関連
└── 900-999: その他・メモ
```

#### 更新時の注意事項
1. **日付記録**: 各ファイルの最終更新日を記録
2. **変更履歴**: 重要な変更は文書内に記録
3. **相互参照**: 関連ファイルの参照を明記
4. **バックアップ**: 重要な変更前は旧版をバックアップ

## 🎯 プロジェクト状況

### 現在の進捗
- ✅ プロジェクト概要の整理
- ✅ 実装方式の比較検討
- ✅ 技術仕様の詳細設計
- ✅ 打ち合わせ実施・要件確定
- ✅ ワラビサコさんとの要件確認完了
- ✅ 実装方式の最終決定（Lovable UI + Google Sheets）
- ✅ システム開発完了
- ✅ **Lovable UI + Google Sheets バックエンド移行完了**
- 🎯 Google Sheets初期設定・本番デプロイ準備中
- 🎯 8月8日大会での運用開始準備完了

### 重要なマイルストーン
- **7月20日**: 打ち合わせ実施 ✅
- **7月25日**: **Lovable UI + Google Sheets 移行完了** ✅
- **8月8日**: 大会での運用開始（準備完了）

## 🎉 最終技術構成（確定）

### 🚀 採用技術スタック
- **フロントエンド**: React + Vite + shadcn/ui（Lovable製）
- **バックエンド**: Vercel Serverless Functions + Google Sheets API
- **データベース**: Google Spreadsheet
- **ホスティング**: Vercel（無料枠）
- **コスト**: **完全無料運用**（ドメイン代のみ）

### ✨ 実装済み機能
- ✅ Eloレーティングシステム（K値動的調整）
- ✅ リアルタイムランキング表示
- ✅ PWA対応（ホーム画面追加・オフライン対応）
- ✅ 管理者承認システム
- ✅ QRコード大会参加
- ✅ 年間チャンピオンバッジ（★☆⭐）
- ✅ レート変動グラフ機能
- ✅ スマートフォン最適化

## 🔗 外部リソース

### BUNGU SQUAD 関連
- [公式サイト - ゲームマーケット](https://gamemarket.jp/booth/4720)
- [ルール詳細 - Note](https://note.com/bungu_squad/n/n33ebd47af3ba)
- [公式X](https://x.com/bungu_squad)
- [公式Instagram](https://www.instagram.com/bungu_squad/)

### 技術参考
- [Eloレーティング - Wikipedia](https://ja.wikipedia.org/wiki/%E3%82%A4%E3%83%AD%E3%83%AC%E3%83%BC%E3%83%86%E3%82%A3%E3%83%B3%E3%82%B0)
- [Google Apps Script 公式ドキュメント](https://developers.google.com/apps-script)

## ⚠️ 重要な注意事項

### プロジェクト管理
1. **このフォルダを常に最新に保つ**
2. **実装時はこのドキュメントを参照**
3. **変更があれば即座に文書更新**
4. **クライアントとの合意事項は必ず記録**

### 開発時のポイント
- 8月8日の大会に確実に間に合わせる
- 参加者の体験を最優先に考える
- システムの安定性を重視
- 無料での運用を維持

## 📞 緊急連絡先

### プロジェクト関係者
- **企画**: ワラビサコさん
- **開発**: kikuchiさん
- **その他**: ヨッスィーオさん

---

**このドキュメントは、Claude Code との開発セッションが終了しても、プロジェクトの継続性を保つために作成されています。新しいセッションの開始時は、必ずこのフォルダの内容を確認してください。**

---
**作成日**: 2024年7月20日  
**最終更新**: 2025年7月25日（017追加・プロジェクト完了記録）  
**管理者**: kikuchiさん  
**開発協力**: Claude Code（全期間）