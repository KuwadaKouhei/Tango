/**
 * 保存用の必須正規化。OQ-004の追加範囲は含めない。
 */
export const normalizeMeaning = (value: string): string =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('ja-JP')
    .replace(/\s+/gu, ' ')
