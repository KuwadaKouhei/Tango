import { INPUT_LIMITS } from '../domain/input-limits'
import type { MeaningDraft } from './word-fields'

export type ApplyTranslationResult =
  { ok: true; meanings: MeaningDraft[] } | { ok: false; message: string }

/**
 * 翻訳候補を意味欄へ載せる。空欄があればそこへ入れ、なければ追加する。
 * 既存の非空の意味は上書きしない。保存はしない。
 */
export const applyTranslationCandidate = (
  meanings: MeaningDraft[],
  text: string,
): ApplyTranslationResult => {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    return { ok: false, message: '翻訳結果が空でした。' }
  }

  const value =
    trimmed.length > INPUT_LIMITS.meaningMaxChars
      ? trimmed.slice(0, INPUT_LIMITS.meaningMaxChars)
      : trimmed

  const emptyIndex = meanings.findIndex(
    (meaning) => meaning.value.trim().length === 0,
  )
  if (emptyIndex >= 0) {
    const current = meanings[emptyIndex]
    if (!current) {
      return { ok: false, message: '意味欄を更新できませんでした。' }
    }

    const next = meanings.slice()
    next[emptyIndex] = { ...current, value }
    return { ok: true, meanings: next }
  }

  if (meanings.length >= INPUT_LIMITS.meaningMaxCount) {
    return {
      ok: false,
      message: '意味の件数が上限です。空欄を作るか、どれかを削除してください。',
    }
  }

  return {
    ok: true,
    meanings: [...meanings, { key: crypto.randomUUID(), value }],
  }
}
