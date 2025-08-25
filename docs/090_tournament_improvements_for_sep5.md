# 9月5日大会に向けた改善タスク

## 作成日時
2025-08-25

## 大会運営フロー確認

### 1. 新規参加者のフロー
1. QRコードをスキャン
2. ニックネーム・メールアドレスを入力
3. 大会にエントリー
4. 待機画面へ移動
5. PWAをホーム画面に追加

### 2. 既存参加者のフロー
1. PWAアプリを起動
2. QRコードをスキャン
3. **自動的にエントリー完了**（実装済み）
4. 待機画面へ移動

## 改善タスク

### 🔴 優先度：高

#### 1. 組み合わせ生成の改善
**問題点**
- 同じプレイヤーが連続して試合に出場するケース発生
- 例：第1試合「AさんvsB」、第2試合「AさんvsC」
- テーブル2つで同時進行時、Aさんが物理的に対応できない

**改善案**
```javascript
// 組み合わせ生成アルゴリズムの改善
function generateMatches(players) {
  // 1. 基本の組み合わせを生成
  // 2. 連続出場チェック
  // 3. プレイヤーの間隔を最大化する再配置
  // 4. 最小休憩時間を確保
}
```

#### 2. 次の試合表示の拡張
**問題点**
- 現在1試合のみ表示
- 前の試合が長引いた場合、対応が困難

**改善案**
- 直近3試合を表示
- 「スキップ可能」な試合をマーク
- 試合の入れ替え機能

### 🟡 優先度：中

#### 3. 大会運営画面の改善
- 試合の順番入れ替え機能
- 「この試合をスキップ」ボタン
- 試合時間の目安表示

#### 4. エントリー確認機能
- 参加者リストのリアルタイム更新
- 重複エントリーの防止
- エントリー締切機能

### 🟢 優先度：低

#### 5. 統計・分析機能
- 平均試合時間の計算
- 待ち時間の可視化
- 最適な組み合わせ提案

## 実装スケジュール

### 第1週（〜8月31日）
- [ ] 組み合わせ生成アルゴリズムの改善
- [ ] 連続出場回避ロジックの実装
- [ ] テスト環境での動作確認

### 第2週（9月1日〜9月4日）
- [ ] 次の試合表示の拡張（3試合表示）
- [ ] 試合順番の入れ替え機能
- [ ] 本番環境でのテスト
- [ ] 最終動作確認

### 9月5日
- 大会本番での運用

## 技術的実装詳細

### 組み合わせ生成の改善
```javascript
// AdminMatchManagement.tsx の改善案
const generateOptimizedMatches = (players) => {
  const matches = [];
  const playerLastMatch = new Map(); // 各プレイヤーの最後の試合番号を記録
  
  // 基本の組み合わせ生成
  const basicMatches = generateBasicMatches(players);
  
  // 連続出場を避ける最適化
  for (let i = 0; i < basicMatches.length; i++) {
    const match = basicMatches[i];
    const [player1, player2] = [match.player1_id, match.player2_id];
    
    // 両プレイヤーの最後の試合からの間隔をチェック
    const gap1 = i - (playerLastMatch.get(player1) || -999);
    const gap2 = i - (playerLastMatch.get(player2) || -999);
    
    // 間隔が1（連続）の場合、後続の試合と入れ替えを検討
    if (gap1 === 1 || gap2 === 1) {
      // 入れ替え可能な試合を探す
      for (let j = i + 1; j < basicMatches.length; j++) {
        const swapMatch = basicMatches[j];
        // 入れ替えても問題ないかチェック
        if (canSwapMatches(i, j, basicMatches, playerLastMatch)) {
          // 試合を入れ替え
          [basicMatches[i], basicMatches[j]] = [basicMatches[j], basicMatches[i]];
          break;
        }
      }
    }
    
    // プレイヤーの最後の試合番号を更新
    playerLastMatch.set(player1, i);
    playerLastMatch.set(player2, i);
  }
  
  return basicMatches;
};
```

### 次の試合表示の拡張
```javascript
// MatchDisplay.tsx の改善案
const NextMatchesDisplay = ({ matches, currentMatchIndex }) => {
  const upcomingMatches = matches.slice(
    currentMatchIndex + 1, 
    currentMatchIndex + 4 // 次の3試合を表示
  );
  
  return (
    <div className="next-matches-container">
      <h3>次の試合</h3>
      {upcomingMatches.map((match, index) => (
        <MatchCard 
          key={match.id}
          match={match}
          isNext={index === 0}
          canStart={checkIfPlayersAvailable(match)}
        />
      ))}
    </div>
  );
};
```

## チェックリスト

### エントリーフロー
- [x] 新規ユーザーのQRエントリー
- [x] 既存ユーザーの自動エントリー
- [x] PWAインストール案内
- [ ] エントリー確認画面の改善

### 組み合わせ管理
- [ ] 連続出場回避アルゴリズム
- [ ] 試合順番入れ替え機能
- [ ] 複数試合の同時表示
- [ ] スキップ機能

### テスト項目
- [ ] 10人以上での組み合わせテスト
- [ ] 連続出場が発生しないことの確認
- [ ] 試合入れ替えの動作確認
- [ ] 本番環境での負荷テスト