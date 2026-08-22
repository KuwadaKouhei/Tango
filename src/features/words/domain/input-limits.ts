/**
 * OQ-018 で確定した入力上限（2026-08-22）。候補値をそのまま採用した。
 * answer 500文字はT09以降の回答入力へ適用する。
 */
export const INPUT_LIMITS = {
  termMaxChars: 100,
  meaningMaxChars: 200,
  meaningMaxCount: 20,
  hintMaxChars: 500,
} as const
