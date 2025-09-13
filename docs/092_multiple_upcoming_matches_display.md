# 092_multiple_upcoming_matches_display.md

## 概要
大会運営画面で次の試合を複数表示する機能を実装

## 実施日
2025-08-28

## 背景・課題
- 大会開催中、試合の終了時間がバラバラ
- 早く終わった試合があっても、次の試合は1つしか表示されない
- 順番通りではなく、現場の流れに応じて柔軟に試合を開始したい

## 実装内容

### 1. 複数試合表示機能の追加
**ファイル**: `src/components/TournamentManagementView.tsx`

#### 変更前
- `nextMatch`のみを取得（最初の1試合のみ）
- 単一の試合カードを表示

#### 変更後
- `upcomingMatches`配列を作成（最大3試合）
- 複数の試合をリスト形式で表示

```typescript
// 次に開始できる試合（順番に並んでいる最初の3つのscheduled）
const upcomingMatches = scheduledMatches.length > 0 ? scheduledMatches.sort((a, b) => {
  const aNum = parseInt(a.match_number.replace(/^match_/, '')) || 0;
  const bNum = parseInt(b.match_number.replace(/^match_/, '')) || 0;
  return aNum - bNum;
}).slice(0, 3) : [];
```

### 2. UIデザインの改善

#### バッジによる優先順位の視覚化
- **次の試合**: プライマリーカラーで強調、アニメーション付き
- **予定2番目**: アウトラインバッジで控えめに表示
- **予定3番目**: アウトラインバッジで控えめに表示

#### レスポンシブ対応
- モバイル：縦並びレイアウト
- デスクトップ：横並びレイアウト
- `flex-col sm:flex-row`による自動切り替え

#### 視覚的な差別化
- 最初の試合：
  - 背景色を強調（`bg-primary/10`）
  - ボーダーを目立たせる（`border-primary/20`）
  - 影を追加（`shadow-md`）
  - ボタンを大きく（`size="lg"`）
- 2番目以降：
  - 控えめな背景（`bg-background/50`）
  - ホバーエフェクト追加
  - 標準サイズのボタン

### 3. 機能改善

#### 柔軟な試合開始
- すべての予定試合に「試合開始」ボタンを配置
- 管理者が任意の順番で試合を開始可能
- 現場の状況に応じた臨機応変な対応が可能

#### タイトルの変更
- 「次の試合」→「今後の試合予定 (X試合)」
- 表示されている試合数を明示

## 技術的なポイント

### 1. 配列のスライス処理
```typescript
.slice(0, 3)  // 最大3試合まで取得
```

### 2. 条件付きスタイリング
```typescript
className={`p-4 border rounded-lg transition-all ${
  index === 0 ? 'bg-primary/10 border-primary/20 shadow-md' : 'bg-background/50 border-muted hover:bg-background/80'
}`}
```

### 3. インデックスベースの条件分岐
```typescript
{index === 0 && <Badge className="bg-primary text-primary-foreground animate-pulse">次の試合</Badge>}
{index === 1 && <Badge variant="outline" className="text-muted-foreground">予定2番目</Badge>}
{index === 2 && <Badge variant="outline" className="text-muted-foreground">予定3番目</Badge>}
```

## 効果・メリット

1. **運営の柔軟性向上**
   - 複数の試合を同時に把握可能
   - 状況に応じた試合順序の調整が可能

2. **効率的な大会進行**
   - 待ち時間の削減
   - スムーズな試合進行

3. **視認性の向上**
   - 今後の試合予定が一目で分かる
   - 優先順位が明確

## 今後の改善案

1. 表示試合数の設定機能
2. ドラッグ&ドロップによる順序変更
3. 推定開始時間の表示
4. 試合準備状況の表示（プレイヤーの待機状態など）

## 関連ファイル
- `/Users/kikuchikenji/bungu-squad-arena/src/components/TournamentManagementView.tsx`

## 確認項目
- [ ] 複数試合が正しく表示される
- [ ] モバイルでのレイアウト確認
- [ ] 任意の試合を開始できる
- [ ] 試合開始後の表示更新