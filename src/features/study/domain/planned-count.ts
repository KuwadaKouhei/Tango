import type { StudyCountChoice } from './study-limits'

/**
 * 今回の出題数。所有数が選択より少なければ全件（OQ-005）。
 */
export const resolvePlannedCount = (
  selected: StudyCountChoice,
  ownedWordCount: number,
): number => {
  if (ownedWordCount < 1) {
    return 0
  }

  if (selected === 'all') {
    return ownedWordCount
  }

  return Math.min(selected, ownedWordCount)
}
