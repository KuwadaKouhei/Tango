import { normalizeMeaning } from './normalize-meaning'
import { normalizeTerm } from './normalize-term'

export type WordListSearchNeedles = {
  termNeedle: string
  meaningNeedle: string
}

/**
 * 検索クエリを保存用正規化へ揃える。両方空ならヒット0件として扱う。
 * フィルタなし（q未指定）とは別である。
 */
export const toSearchNeedles = (
  trimmedQuery: string,
): WordListSearchNeedles | null => {
  const termNeedle = normalizeTerm(trimmedQuery)
  const meaningNeedle = normalizeMeaning(trimmedQuery)
  if (termNeedle.length === 0 && meaningNeedle.length === 0) {
    return null
  }

  return { termNeedle, meaningNeedle }
}
