/**
 * OQ-018 の初期guardrail候補。プロダクト決定ではない。
 * T05着手前に人間が確定するまで、実装の防御値としてだけ使う。
 */
export const INPUT_LIMITS = {
  termMaxChars: 100,
  meaningMaxChars: 200,
  meaningMaxCount: 20,
  hintMaxChars: 500,
} as const
