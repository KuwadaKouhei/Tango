export type RandomSource = {
  /** [0, 1) の実数。出題の一様抽選に使う。 */
  nextUnitInterval: () => number
}

export const systemRandom: RandomSource = {
  nextUnitInterval: () => Math.random(),
}
