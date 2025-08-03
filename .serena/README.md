# Serena 初回セットアップガイド

## 次回Claude Codeセッション開始時の手順

### 1. Serenaの初期化
```
/mcp__serena__initial_instructions
```

### 2. プロジェクト全体の理解
```
/serena -r docsフォルダ内の全62個のドキュメントを読み込んで、このBUNGU SQUADプロジェクトの完全な開発履歴、技術仕様、現在の課題を分析してください。特に以下の点に注目してください：

1. プロジェクトの起源と目的
2. 技術アーキテクチャの変遷
3. Google Sheets API連携の実装過程
4. QRエントリー機能の開発履歴
5. 最近の改善点（リアルタイム機能、PWA、レーティングシステム）
6. 現在の技術的課題
7. 今後の開発優先順位

分析後、プロジェクトの現在地と次に取り組むべき優先課題を提案してください。
```

### 3. 今日の作業内容の記録
```
/serena 今日（2025年8月3日）実施したQRエントリー機能の改善について記録してください：

- QRエントリー完了画面の改善
- エントリー完了画面をスキップして直接待機画面に遷移
- src/components/QRScanner.tsx の修正内容
- src/components/TournamentEntryComplete.tsx の修正内容
- 自動遷移問題の解決

この改善により、UXが向上し、より確実な画面遷移が実現されました。
```

## docsフォルダの重要ファイル一覧

### 基本設計
- 001-project-overview.md
- 003-webapp-technical-specs.md
- 012-system-requirements-specification.md

### 最新の実装状況
- 062_annual_cycle_and_achievement_system.md
- 061_testing_checklist_after_warabisako_meeting.md
- 060_warabisako_meeting_implementations.md

### QR機能関連
- 035-progress-2025-07-27-qr-code-implementation.md
- 043_qr_scanner_fixes_and_improvements.md

### システム改善履歴
- 048-real-time-auto-refresh-implementation.md
- 050-pwa-notification-system.md
- 057_rating_points_display_and_history_fixes.md