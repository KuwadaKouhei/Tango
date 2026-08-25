/**
 * 一覧カード背景。OQ-007: 未回答は白、回答済みは 0%→100% の H/S/L 線形補間。
 * 段階パレットは使わない。薄いパステルなので本文は暗い色を固定する。
 */
export const MASTERY_CARD_TEXT_COLOR = '#1a1816'
export const MASTERY_UNANSWERED_BACKGROUND = '#ffffff'

const ZERO_PERCENT = { h: 0, s: 70, l: 88 }
const FULL_PERCENT = { h: 95, s: 55, l: 82 }

export const masteryCardBackground = (accuracy: number | null): string => {
  if (accuracy === null) {
    return MASTERY_UNANSWERED_BACKGROUND
  }

  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1) {
    throw new Error('accuracy must be null or a finite number in [0, 1]')
  }

  return formatHsl(
    lerp(ZERO_PERCENT.h, FULL_PERCENT.h, accuracy),
    lerp(ZERO_PERCENT.s, FULL_PERCENT.s, accuracy),
    lerp(ZERO_PERCENT.l, FULL_PERCENT.l, accuracy),
  )
}

export const masteryCardSurfaceStyle = (
  accuracy: number | null,
): { backgroundColor: string; color: string } => ({
  backgroundColor: masteryCardBackground(accuracy),
  color: MASTERY_CARD_TEXT_COLOR,
})

const lerp = (from: number, to: number, t: number): number =>
  from + (to - from) * t

const formatHsl = (h: number, s: number, l: number): string =>
  `hsl(${formatCssNumber(h)} ${formatCssNumber(s)}% ${formatCssNumber(l)}%)`

const formatCssNumber = (value: number): string => {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
