import type { WordListResponse } from '../api/word-schemas'

export const formatWordStatsLabel = (
  stats: WordListResponse['items'][number]['stats'],
): string => {
  if (stats.status === 'unanswered' || stats.accuracy === null) {
    return '未回答'
  }

  const percent = Math.round(stats.accuracy * 100)
  return `正解率 ${String(percent)}%（正解 ${String(stats.correct)} / 回答 ${String(stats.total)}）`
}
