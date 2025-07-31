/**
 * ELOレーティング計算システム
 */

class RatingCalculator {
  constructor() {
    this.K_FACTOR = 32; // K-factor for rating changes
    this.BASE_RATING = 1500; // Base rating for new players
  }

  /**
   * 期待勝率を計算
   * @param {number} playerRating - プレイヤーのレーティング
   * @param {number} opponentRating - 対戦相手のレーティング
   * @returns {number} 期待勝率 (0-1)
   */
  calculateExpectedScore(playerRating, opponentRating) {
    const ratingDifference = opponentRating - playerRating;
    return 1 / (1 + Math.pow(10, ratingDifference / 400));
  }

  /**
   * 新しいレーティングを計算
   * @param {number} currentRating - 現在のレーティング
   * @param {number} opponentRating - 対戦相手のレーティング
   * @param {number} actualScore - 実際の結果 (1=勝利, 0=敗北)
   * @returns {object} { newRating, ratingChange }
   */
  calculateNewRating(currentRating, opponentRating, actualScore) {
    const expectedScore = this.calculateExpectedScore(currentRating, opponentRating);
    const ratingChange = Math.round(this.K_FACTOR * (actualScore - expectedScore));
    const newRating = Math.max(100, currentRating + ratingChange); // 最低100レーティング

    return {
      newRating,
      ratingChange,
      expectedScore: Math.round(expectedScore * 100) / 100 // 小数点以下2桁
    };
  }

  /**
   * 両プレイヤーのレーティング変更を計算
   * @param {number} winnerRating - 勝者の現在レーティング
   * @param {number} loserRating - 敗者の現在レーティング
   * @returns {object} 両プレイヤーの新レーティング
   */
  calculateBothPlayersRating(winnerRating, loserRating) {
    const winnerResult = this.calculateNewRating(winnerRating, loserRating, 1);
    const loserResult = this.calculateNewRating(loserRating, winnerRating, 0);

    return {
      winner: {
        oldRating: winnerRating,
        newRating: winnerResult.newRating,
        ratingChange: winnerResult.ratingChange,
        expectedScore: winnerResult.expectedScore
      },
      loser: {
        oldRating: loserRating,
        newRating: loserResult.newRating,
        ratingChange: loserResult.ratingChange,
        expectedScore: loserResult.expectedScore
      }
    };
  }

  /**
   * レーティング変更のプレビューを生成
   * @param {number} playerRating 
   * @param {number} opponentRating 
   * @param {string} result - 'win' or 'lose'
   * @returns {object} プレビュー情報
   */
  previewRatingChange(playerRating, opponentRating, result) {
    const actualScore = result === 'win' ? 1 : 0;
    const calculation = this.calculateNewRating(playerRating, opponentRating, actualScore);
    
    return {
      currentRating: playerRating,
      opponentRating: opponentRating,
      expectedWinRate: Math.round(calculation.expectedScore * 100),
      ratingChange: calculation.ratingChange,
      newRating: calculation.newRating,
      result: result
    };
  }
}

module.exports = RatingCalculator;