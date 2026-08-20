/**
 * 保存用の必須正規化。OQ-004の追加範囲（句読点・かなカナ等）は含めない。
 */
export const normalizeTerm = (value: string): string =>
  value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/\s+/gu, ' ')
