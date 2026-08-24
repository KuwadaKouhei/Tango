/**
 * OQ-006。SQLへ重み式を埋め込まず、正解率だけから正の重みを出す。
 * 回答回数と直近正誤は見ない。
 */
export const WEAKNESS_WEIGHT_FLOOR = 0.05

export const toWeaknessAccuracy = (correct: number, total: number): number => {
  if (
    !Number.isInteger(correct) ||
    !Number.isInteger(total) ||
    correct < 0 ||
    total < 0 ||
    correct > total
  ) {
    throw new Error('stats counts must be integers with 0 <= correct <= total')
  }

  return total === 0 ? 0 : correct / total
}

export const toWeaknessWeight = (correct: number, total: number): number =>
  Math.max(1 - toWeaknessAccuracy(correct, total), WEAKNESS_WEIGHT_FLOOR)
