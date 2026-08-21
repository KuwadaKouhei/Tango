import { AppError } from '../../../platform/app-error'
import { INPUT_LIMITS } from './input-limits'
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
    .map((meaning) => ({
      meaning: meaning.trim(),
      normalizedMeaning: normalizeMeaning(meaning),
    }))
    .filter(
      (item) => item.meaning.length > 0 && item.normalizedMeaning.length > 0,
    )
    .map((item, sortOrder) => ({ ...item, sortOrder }))

  if (prepared.length === 0) {
    throw AppError.validation('意味は1件以上必要です。', { field: 'meanings' })
  }

  if (prepared.length > INPUT_LIMITS.meaningMaxCount) {
    throw AppError.validation(
      `意味は${String(INPUT_LIMITS.meaningMaxCount)}件までです。`,
      { field: 'meanings' },
    )
  }

  const tooLong = prepared.find(
    (item) => item.meaning.length > INPUT_LIMITS.meaningMaxChars,
  )
  if (tooLong) {
    throw AppError.validation(
      `意味は${String(INPUT_LIMITS.meaningMaxChars)}文字までです。`,
      { field: 'meanings' },
    )
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

  if (trimmed.length > INPUT_LIMITS.termMaxChars) {
    throw AppError.validation(
      `英単語は${String(INPUT_LIMITS.termMaxChars)}文字までです。`,
      { field: 'term' },
    )
  }

  return { term: trimmed, normalizedTerm }
}

export const requirePreparedHint = (
  hint: string | null | undefined,
): string | null => {
  const normalized = emptyToNullHint(hint)
  if (normalized && normalized.length > INPUT_LIMITS.hintMaxChars) {
    throw AppError.validation(
      `ヒントは${String(INPUT_LIMITS.hintMaxChars)}文字までです。`,
      { field: 'hint' },
    )
  }

  return normalized
}
