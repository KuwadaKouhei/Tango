import type { RandomSource } from '../../../platform/random'
import type { StudyCandidate, WeightedStudyCandidate } from './study-question'
import { toWeaknessWeight } from './weakness-weight'

export const toExcludedWordIdSet = (
  excludeWordIds: readonly string[],
): ReadonlySet<string> => new Set(excludeWordIds)

export const remainingStudyCandidates = <T extends { wordId: string }>(
  candidates: readonly T[],
  excludeWordIds: ReadonlySet<string>,
): T[] => candidates.filter((candidate) => !excludeWordIds.has(candidate.wordId))

const boundUnitInterval = (random: RandomSource): number => {
  const unit = random.nextUnitInterval()
  return Number.isFinite(unit) ? Math.min(Math.max(unit, 0), 1) : 0
}

/**
 * 除外済みを除く候補から一様に1件選ぶ。残り0件なら null。
 */
export const selectRandomCandidate = (
  candidates: readonly StudyCandidate[],
  excludeWordIds: ReadonlySet<string>,
  random: RandomSource,
): StudyCandidate | null => {
  const remaining = remainingStudyCandidates(candidates, excludeWordIds)
  const lastIndex = remaining.length - 1
  if (lastIndex < 0) {
    return null
  }

  const index = Math.min(
    lastIndex,
    Math.floor(boundUnitInterval(random) * remaining.length),
  )
  return remaining[index] ?? null
}

/**
 * 除外済みを除く候補から OQ-006 の正の重みで1件選ぶ。残り0件なら null。
 */
export const selectWeightedCandidate = (
  candidates: readonly WeightedStudyCandidate[],
  excludeWordIds: ReadonlySet<string>,
  random: RandomSource,
): WeightedStudyCandidate | null => {
  const remaining = remainingStudyCandidates(candidates, excludeWordIds)
  const lastIndex = remaining.length - 1
  if (lastIndex < 0) {
    return null
  }

  const weights = remaining.map((candidate) =>
    toWeaknessWeight(candidate.correct, candidate.total),
  )
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  if (totalWeight <= 0) {
    return remaining[lastIndex] ?? null
  }

  const target = boundUnitInterval(random) * totalWeight
  let cumulative = 0
  for (const [index, candidate] of remaining.entries()) {
    cumulative += weights[index] ?? 0
    if (target < cumulative) {
      return candidate
    }
  }

  return remaining[lastIndex] ?? null
}
