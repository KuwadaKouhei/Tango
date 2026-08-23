import type { RandomSource } from '../../../platform/random'
import type { StudyCandidate } from './study-question'

export const toExcludedWordIdSet = (
  excludeWordIds: readonly string[],
): ReadonlySet<string> => new Set(excludeWordIds)

export const remainingStudyCandidates = (
  candidates: readonly StudyCandidate[],
  excludeWordIds: ReadonlySet<string>,
): StudyCandidate[] =>
  candidates.filter((candidate) => !excludeWordIds.has(candidate.wordId))

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

  const unit = random.nextUnitInterval()
  const bounded = Number.isFinite(unit) ? Math.min(Math.max(unit, 0), 1) : 0
  const index = Math.min(lastIndex, Math.floor(bounded * remaining.length))
  return remaining[index] ?? null
}
