/**
 * 判定専用の正規化（OQ-004）。保存用 `normalizeMeaning` は変えない。
 * study domain は words feature へ依存できないため、意味の必須正規化と同じ手順をここへ書く。
 */
const toHiragana = (value: string): string =>
  [...value]
    .map((char) => {
      const code = char.codePointAt(0)
      if (code === undefined) {
        return char
      }

      // U+30A1–U+30F6 → U+3041–U+3096。ヴ(U+30F4) は ゔ(U+3094)。
      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCodePoint(code - 0x60)
      }

      return char
    })
    .join('')

export const normalizeForJudgement = (value: string): string => {
  const base = value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ja-JP')
    .replace(/\s+/gu, ' ')

  return toHiragana(base).replace(/[\p{P}\p{S}]/gu, '')
}
