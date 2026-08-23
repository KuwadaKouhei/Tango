import type { MeaningDraft } from './word-fields'

/**
 * 意味欄の削除。1件しかないときは行を残して中身だけ空にする。
 * 欄が0件になると入力できなくなるし、保存時の「1件以上」と矛盾するため。
 */
export const removeMeaningDraft = (
  meanings: readonly MeaningDraft[],
  key: string,
): MeaningDraft[] => {
  if (meanings.length <= 1) {
    const only = meanings[0]
    if (!only) {
      return []
    }
    return [{ ...only, value: '' }]
  }

  return meanings.filter((item) => item.key !== key)
}
