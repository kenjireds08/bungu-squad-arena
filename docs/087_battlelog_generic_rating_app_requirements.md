# バトログ（汎用型レーティングアプリ）要件定義 v2.0

## 📋 プロジェクト概要
- **サービス名**: バトログ（BATOLOG）
- **コンセプト**: なんでもレーティング - ANYTHING CAN BE RATED
- **ベース**: BUNGU SQUAD Arenaをベースに汎用化
- **ビジネスモデル**: サブスクリプション型SaaS

## 🎯 ターゲット市場
- マイナースポーツ団体
- ボードゲームカフェ・店舗
- 飲食店イベント運営者
- 企業の社内イベント担当者
- 地域コミュニティ運営者

## 💡 開発方針
### サブスク版（バトログ）
- **データベース**: Supabase（マルチテナント対応）
- **デザイン**: 全ユーザー共通の統一デザイン
- **カスタマイズ**: なし（機能開放のみで差別化）
- **初期費用**: なし
- **月額料金**: プラン別設定

### カスタム開発版
- **例**: BUNGU SQUAD Arena
- **データベース**: クライアント要望に応じて選択
- **デザイン**: 完全オリジナル
- **カスタマイズ**: フルカスタマイズ可能
- **初期費用**: 開発費として請求
- **月額料金**: 保守費用として設定

## 📊 料金プラン

### 汎用お試しプラン - ¥5,000/月
**主な機能**
- ✓ QRコードエントリー
- ✓ リアルタイムランキング
- ✓ PWA対応（アプリ風体験）
- ✓ 基本的な勝敗記録機能
- ✓ **手動組み合わせのみ**（自動生成なし）
- ✓ 参加者上限：50名
- ✓ 月間大会数：3回

### スタンダードプラン - ¥10,000/月
**主な機能**
- ✓ 全お試しプラン機能
- ✓ バッジ付与システム（🥇🥈🥉のみ）
- ✓ **組み合わせ自動生成**
- ✓ プレイヤー履歴確認・統計
- ✓ 参加者上限：200名
- ✓ 月間大会数：無制限

### プレミアムプラン - ¥20,000/月
**主な機能**
- ✓ スタンダード版の全機能
- ✓ 大会お知らせ機能
- ✓ マイルストーン管理
- ✓ 詳細レポート・分析機能
- ✓ CSVエクスポート
- ✓ 参加者上限：無制限
- ✓ 優先サポート

### 📌 重要事項
- **無料トライアルなし**（契約初月から課金）
- **ダウングレード不可**（アップグレードのみ可能）
- 個別機能追加や専用アプリ開発も承ります
- サブスク版はデザイン/ロゴの個別カスタマイズ不可

## 🔒 マルチテナント & セキュリティ

### データモデル
- すべての業務データに `org_id` を必須付与
- `users`（Auth）と `players`（参加者）は別概念（匿名/ニックネーム参加対応）
- 権限管理：`org_members.role` = `owner` / `admin` / `staff` / `viewer`

### Supabase設定
- **認証**: Email Link（Magic Link）を第一候補（SNSログインは拡張）
- **RLS有効化**: ユーザーが所属する `org_id` 以外はアクセス不可
- **代表インデックス**: 
  - `(org_id, created_at)`
  - `(org_id, tournament_id)`
  - `(org_id, player_id)`

## 🎛 プラン定義と機能ゲーティング

### 単一ソースのプラン定義
```typescript
export const PLANS = {
  starter: {
    label: "汎用お試し",
    maxParticipants: 50,
    maxTournamentsPerBillingCycle: 3,
    features: [
      "qr_entry", "ranking", "pwa", "basic_match", // 勝敗記録
      "manual_matching" // 手動組み合わせのみ
    ]
  },
  standard: {
    label: "スタンダード",
    maxParticipants: 200,
    maxTournamentsPerBillingCycle: null, // 無制限
    features: [
      "qr_entry", "ranking", "pwa", "basic_match",
      "manual_matching", "auto_matching", // 手動＋自動組み合わせ
      "player_history", "stats", "badges_core"
    ]
  },
  premium: {
    label: "プレミアム",
    maxParticipants: null, // 無制限
    maxTournamentsPerBillingCycle: null,
    features: [
      "qr_entry", "ranking", "pwa", "basic_match",
      "manual_matching", "auto_matching",
      "player_history", "stats", "badges_core",
      "announcements", "milestones", "analytics", 
      "csv_export", "priority_support"
    ]
  }
} as const;
```

### 機能ガード実装
```typescript
// サーバー側必須
function assertFeature(orgId: string, feature: string) {
  const plan = getCurrentPlanForOrg(orgId);
  if (!plan.features.includes(feature)) {
    throw new AppError(403, "この機能は現在のプランではご利用いただけません。");
  }
}

function assertTournamentQuota(orgId: string) {
  const plan = getCurrentPlanForOrg(orgId);
  if (plan.maxTournamentsPerBillingCycle === null) return;
  const count = countTournamentsInCurrentBillingCycle(orgId);
  if (count >= plan.maxTournamentsPerBillingCycle) {
    throw new AppError(409, "今月の大会数の上限に達しました。プランをアップグレードすると引き続きご利用いただけます。");
  }
}

function assertParticipantLimit(orgId: string, currentCount: number) {
  const plan = getCurrentPlanForOrg(orgId);
  const usage = (currentCount / plan.maxParticipants) * 100;
  
  if (usage >= 80 && usage < 100) {
    // 警告通知
    notify(orgId, "ご利用が上限の80%に達しました。スタンダード/プレミアムへのアップグレードをご検討ください。");
  }
  
  if (currentCount >= plan.maxParticipants) {
    throw new AppError(409, "参加者数の上限に達しました。プランをアップグレードすると引き続きご利用いただけます。");
  }
}
```

### Stripe連携（確定版）
- **Webhook イベント**: 
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- **上限管理**: 80%到達で警告、100%でブロック + Customer Portal誘導
- **ダウングレード禁止**: Customer Portalではアップグレード/支払情報更新のみ
- **支払い失敗時の猶予期間**: 7日間（将来的に設定可能）
- **請求サイクル**: Stripeに準拠、上限カウントは請求期間でロールオーバー

## 📊 Eloレーティング運用

### 基本式
```
R' = R + K*(S - E)

S：勝=1、引分=0.5、負=0
E：1 / (1 + 10^((Ropp - R)/400))
```

### 設定項目
- K値（組織ごとに設定可能）
- 初期レート（既定1200）
- シーズンリセット（年次/四半期/任意）

### 整合性保証
- 勝者加点 ≒ 敗者減点（丸め誤差±1許容）
- `ratings`テーブルに before/after/delta/K/時刻/試合IDを保存
- 再計算ジョブで履歴から再生成可能

## 🏅 バッジ仕様（汎用型）

### 汎用SaaS版は3種のみ（固定）
- 🥇 ゴールドバッジ（1位）
- 🥈 シルバーバッジ（2位）
- 🥉 ブロンズバッジ（3位）

### 付与条件
- シーズン終了時に最終ランキング上位3名へ自動付与
- 複数年分は累積表示
- DB初期化時にorgごとに3種プリセット生成

### 重要事項
- BUNGU SQUAD固有の♠️/➕は**個別開発専用**
- 汎用版でのカスタムバッジ追加は不可

## 🔄 組み合わせ（スケジューラ）制約

### ハード制約
- **同一時刻に同一プレイヤーが複数卓へ割当されない**ことを絶対条件とする
- ランダム/総当たり/スイス/ダブルエリミ等、いずれの方式でも割当実行時に制約充足を検証
- 失敗時は再サンプリング or 次ラウンドへ回す

### プラン別制限
- **Starter**: 手動割当のみ（UIはドラッグ＆ドロップ＋バリデーション）
- **Standard/Premium**: 手動＋自動割当対応
- 連戦緩和（オプション）：同一プレイヤーの連続試合を避ける簡易ヒューリスティック（将来拡張）

### 汎用フォーマット対応
- **MVP**: 総当たり / 手動
- **将来拡張（Phase 4以降）**: スイスドロー、ダブルエリミ、リーグ→プレーオフ、チーム戦等

## 🔔 通知（PWA Push）の方針

### 初期リリースでの通知範囲
- 「新しい大会が公開されました」
- 「明日は○○大会です」（リマインド）
- **順位変動通知はデフォルト無効**

### 通知設定管理
- org単位ポリシー + 個人のOpt-in（ブラウザ権限）の二層管理
- 将来拡張時は「通知設定」画面から個別ON/OFF可能（MVP範囲外）

## 🗄 データベーススキーマ

```sql
-- 組織
CREATE TABLE orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Tokyo',
  plan_key text NOT NULL DEFAULT 'trial',
  created_at timestamptz DEFAULT now()
);

-- プラン購読情報
CREATE TABLE plan_subscriptions (
  org_id uuid PRIMARY KEY REFERENCES orgs(id),
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_key text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  status text NOT NULL, -- active, trialing, past_due, canceled
  updated_at timestamptz DEFAULT now()
);

-- 組織メンバー
CREATE TABLE org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- プレイヤー（参加者）
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  nickname text NOT NULL,
  email text,
  created_at timestamptz DEFAULT now()
);

-- 大会
CREATE TABLE tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  name text NOT NULL,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 試合
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  tournament_id uuid NOT NULL REFERENCES tournaments(id),
  player_a uuid NOT NULL REFERENCES players(id),
  player_b uuid NOT NULL REFERENCES players(id),
  winner uuid REFERENCES players(id),
  started_at timestamptz,
  finished_at timestamptz
);

-- レーティング履歴
CREATE TABLE ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  player_id uuid NOT NULL REFERENCES players(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  rating_before int NOT NULL,
  rating_after int NOT NULL,
  delta int NOT NULL,
  k int NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- バッジマスタ
CREATE TABLE badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  key text NOT NULL,    -- 'season_gold' | 'season_silver' | 'season_bronze'
  label text NOT NULL,  -- 表示名
  UNIQUE(org_id, key)
);

-- プレイヤーバッジ
CREATE TABLE player_badges (
  player_id uuid REFERENCES players(id),
  badge_id uuid REFERENCES badges(id),
  season text NOT NULL, -- '2025' 等
  awarded_at timestamptz DEFAULT now(),
  PRIMARY KEY (player_id, badge_id, season)
);

-- RLSポリシー例
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_org_isolation" ON tournaments
  FOR ALL USING (org_id IN (
    SELECT org_id FROM org_members WHERE user_id = auth.uid()
  ));
```

## 🛠 技術要件

### フロントエンド
- React 18 + TypeScript
- Vite
- Tailwind CSS + shadcn/ui
- PWA対応

### バックエンド
- Next.js API Routes
- Supabase（データベース・認証）
- Stripe（決済・サブスク管理）

### インフラ
- Vercel（ホスティング）
- カスタムドメイン対応

## 📈 収益モデル試算

### コスト
- Supabase Pro: 月額$25（約3,750円）
- Vercel Pro: 月額$20（約3,000円）
- Stripe手数料: 売上の3.6%
- **固定費合計**: 約7,000円/月

### 損益分岐点
- お試しプラン2件で黒字化
- 10件契約で月額10万円以上の収益
- 目標：初年度30件契約（月額30-60万円）

## 📊 運用・監視項目

### 監視項目
- APIエラーレート
- Webhook失敗率
- Stripe支払い失敗
- Eloレーティング再計算時間

### バックアップ
- Supabase自動バックアップ
- 日次エクスポート（CSV/Parquet）

### SLO目安
- API可用性: 99.9%
- Webhook遅延: < 2分
- APIレスポンス: P99 < 600ms

### 通知
- 上限80%到達時の警告
- 上限超過時のブロック通知
- Customer Portal誘導

## ❌ 非目標（明記）

- サブスク版はロゴ/配色の個別カスタマイズ不可（カスタム開発に誘導）
- マルチリージョン/マルチクラウドは現時点で対象外
- 無料プラン（¥0）は提供しない（必要に応じて短期トライアルのみ）

## 📖 用語統一

- 「Elo」（先頭のみ大文字）
- 「レーティング」（評価値）
- 「ランキング」（順位表）
- 「大会」（tournament）
- 「参加者」（player）

## 🚀 開発ロードマップ（最終版）

### Phase 1: MVP-基盤（最優先）
- [ ] 新規バトログプロジェクト作成（`/Users/kikuchikenji/claude-code-projects/batolog`）
- [ ] Supabaseへの移行（RLS/スキーマ/インデックス）
- [ ] マルチテナント（org_id分離）
- [ ] 認証（Email Link）
- [ ] プラン定義/機能ゲート（Starter=手動割当のみ）
- [ ] Stripe連携（アップグレードのみ/Portal/上限ガード）
- [ ] レーティング（Elo：初杀1200、K値org設定、履歴保存）
- [ ] バッジ（🥇/🥈/🥉自動付与）
- [ ] PWA（オフライン基本/ホーム追加）
- [ ] 通知：大会公開/前日リマインドのみ

### Phase 2: MVP-充実
- [ ] 履歴/統計UIの整理
- [ ] お知らせ機能（Premium）
- [ ] CSVエクスポート（Premium）
- [ ] 簡易分析レポート（Premium）
- [ ] 監査ログ/サポート用impersonate
- [ ] オンボーディングウィザード

### Phase 3: 改善
- [ ] 使用量80%警告/上限到達時ブロックのUI/UX最適化
- [ ] Customer Portalカスタマイズ
- [ ] 通知設定画面（順位通知は将来トグル）
- [ ] テスト自動化完了

### Phase 4: 将来拡張
- [ ] スイス/ダブルエリミ等の高度フォーマット
- [ ] WebSocket化、Redisキャッシュ
- [ ] 外部公開API・Webhook（ランキング更新等）
- [ ] 2FA、GDPR完全対応、ステータスページ
- [ ] 年間契約割引・紹介プログラム（将来検討）

## 🎯 マルチテナント/運用

### データ分離
- すべてorg_idで分離（RLS徹底）
- SuperAdminの「組織なりすまし（impersonate）」はサポート用のみに限定
- 監査ログ必須（誰が/いつ/何を）

### 監査ログ
- 組み合わせ変更、試合確定、レーティング再計算、課金プラン変更など主要イベントを記録
- GDPR相当のエクスポート/削除は将来（Phase 4以降）
- MVPはCSVエクスポート（Premium機能）で代替

## 📊 データ移行の扱い

- **SaaS版ではデータ移行は提供しない**
- 必要な場合は個別開発（別料金）に誘導
- 既存BUNGU SQUAD Arenaは別プロジェクトとして保持
- **新規「バトログ」プロジェクト**を`/Users/kikuchikenji/claude-code-projects/batolog`に作成

## 🧪 テスト観点

### 重要テスト項目
- **機能ゲート**: Starterで自動組み合わせUI/APIが出ず、直接叩いても403
- **上限**: Starterで今月3大会作成後、4件目は409 + Portal導線
- **割当**: 同一プレイヤーの多卓同時割当が**絶対に**発生しない（ユニット/統合テスト）
- **Elo**: 勝敗の加点/減点の整合性（丸め誤差±1まで）を検証
- **Stripe**: 支払失敗→7日後に`past_due`→一部機能停止

## ✅ 直近着手のためのチェックリスト

- [ ] PLANSの最終確定（上限/feature flags/文言）
- [ ] Stripe商品/価格の作成 + Customer Portal有効化
- [ ] Webhookエンドポイント雛形（4イベント）とDLQ
- [ ] RLSポリシーの雛形と統合テスト
- [ ] 導入ウィザード（3〜4ステップ）の初期デザイン

## 📝 TODO・未決定事項

### 優先度：高
- [ ] 無料トライアル期間の決定（7日/14日/30日？）
- [ ] 優先サポートの具体的な定義（応答時間SLA等）
- [ ] データエクスポート形式の詳細（CSV/JSON/Excel？）

### 優先度：中
- [ ] カスタム開発版への移行パスの設計
- [ ] プラン変更時のデータ移行処理詳細
- [ ] 大会テンプレート機能の検討

### 優先度：低
- [ ] APIレート制限の詳細設定
- [ ] 多言語対応の検討
- [ ] モバイルアプリ（ネイティブ）の検討

## 📢 用語/文言・注意書き

### 用語統一
- 「Elo」（先頭のみ大文字）
- 「レーティング」（評価値）
- 「ランキング」（順位表）
- 「大会」（tournament）
- 「参加者」（player）

### 料金表周辺の注意書き
- 「上記プラン以外にも、個別機能追加や専用アプリ開発のご相談を承ります。」
- 「サブスク版はデザイン/ロゴの個別カスタマイズ不可。必要な場合は個別開発をご検討ください。」
- 「ダウングレード不可」

## 🔗 関連ドキュメント
- [BUNGU SQUAD Arena技術仕様](./001_technical_specifications.md)
- [営業資料PDF](/Users/kikuchikenji/Downloads/熱狂を生み、売上につながる.pdf)
- [プロジェクトCLAUDE.md](./CLAUDE.md)
- [バトログロゴ](/Users/kikuchikenji/Dropbox/My Mac (kikuchikenjinoMacBook-Air.local)/Desktop/GkFdEqzs.jpg)

---
*作成日: 2025-08-23*
*最終更新: 2025-08-23*
*作成者: 菊池健司（ちーけん）*
*状態: 要件最終確定版*
*バージョン: 3.0*
*追記: ChatGPTからのフィードバックを反映（ダウングレード禁止、通知方針、組み合わせ制約等）*