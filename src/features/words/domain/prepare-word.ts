import { AppError } from '../../../platform/app-error'
import { normalizeMeaning } from './normalize-meaning'
import { normalizeTerm } from './normalize-term'

export const emptyToNullHint = (
  hint: string | null | undefined,
): string | null => {
  if (hint === undefined || hint === null) {
    return null
  }

  const trimmed = hint.trim()
  return trimmed.length === 0 ? null : trimmed
}

export const requirePreparedMeanings = (
  meanings: readonly string[],
): { meaning: string; normalizedMeaning: string; sortOrder: number }[] => {
  const prepared = meanings
    .map((meaning, sortOrder) => ({
      meaning: meaning.trim(),
      normalizedMeaning: normalizeMeaning(meaning),
      sortOrder,
    }))
    .filter(
      (item) => item.meaning.length > 0 && item.normalizedMeaning.length > 0,
    )

  if (prepared.length === 0) {
    throw AppError.validation('意味は1件以上必要です。', { field: 'meanings' })
  }

  return prepared
}

export const requirePreparedTerm = (
  term: string,
): { term: string; normalizedTerm: string } => {
  const trimmed = term.trim()
  const normalizedTerm = normalizeTerm(term)
  if (trimmed.length === 0 || normalizedTerm.length === 0) {
    throw AppError.validation('英単語を入力してください。', { field: 'term' })
  }

  return { term: trimmed, normalizedTerm }
}
