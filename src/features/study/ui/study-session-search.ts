import type { StudyCountChoice, StudyMode } from '../domain/study-limits'

export const parseStudySessionSearch = (
  search: Record<string, unknown>,
): { mode: StudyMode; count: StudyCountChoice } => {
  const mode: StudyMode = search.mode === 'weak' ? 'weak' : 'random'
  if (search.count === '5' || search.count === 5) {
    return { mode, count: 5 }
  }
  if (search.count === '20' || search.count === 20) {
    return { mode, count: 20 }
  }
  if (search.count === 'all') {
    return { mode, count: 'all' }
  }

  return { mode, count: 10 }
}
