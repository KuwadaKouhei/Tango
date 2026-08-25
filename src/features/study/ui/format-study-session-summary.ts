import type { StudySessionSummary } from '../domain/summarize-study-session'

/**
 * 一覧統計と同じく切り上げない。99.6%を100%と見せない。
 */
export const formatStudySessionAccuracy = (
  summary: Pick<StudySessionSummary, 'askedCount' | 'accuracy'>,
): string => {
  if (summary.askedCount === 0 || summary.accuracy === null) {
    return '今回の正解率なし'
  }

  return `今回の正解率 ${String(Math.floor(summary.accuracy * 100))}%`
}
