import { describe, expect, it } from 'vitest'
import {
  MASTERY_CARD_TEXT_COLOR,
  MASTERY_UNANSWERED_BACKGROUND,
  masteryCardBackground,
  masteryCardSurfaceStyle,
} from './mastery-card-color'

describe('masteryCardBackground', () => {
  it('未回答は白、0% / 50% / 100% はOQ-007のHSL線形補間', () => {
    expect(masteryCardBackground(null)).toBe('#ffffff')
    expect(masteryCardBackground(0)).toBe('hsl(0 70% 88%)')
    expect(masteryCardBackground(0.5)).toBe('hsl(47.5 62.5% 85%)')
    expect(masteryCardBackground(1)).toBe('hsl(95 55% 82%)')
  })

  it('未回答と回答済み0%は背景色が異なる', () => {
    expect(masteryCardBackground(null)).not.toBe(masteryCardBackground(0))
  })

  it('範囲外のaccuracyは拒否する', () => {
    expect(() => masteryCardBackground(-0.01)).toThrow(/accuracy/)
    expect(() => masteryCardBackground(1.01)).toThrow(/accuracy/)
    expect(() => masteryCardBackground(Number.NaN)).toThrow(/accuracy/)
  })
})

describe('masteryCardSurfaceStyle', () => {
  it('本文色は暗い固定色で、主要背景とのコントラストが4.5以上', () => {
    const accuracies: Array<number | null> = [null, 0, 0.5, 1]
    for (const accuracy of accuracies) {
      const surface = masteryCardSurfaceStyle(accuracy)
      expect(surface.color).toBe(MASTERY_CARD_TEXT_COLOR)
      expect(surface.backgroundColor).toBe(
        accuracy === null
          ? MASTERY_UNANSWERED_BACKGROUND
          : masteryCardBackground(accuracy),
      )
      expect(
        contrastRatio(surface.color, surface.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5)
    }
  })
})

const contrastRatio = (foreground: string, background: string): number => {
  const foregroundLuminance = relativeLuminance(parseCssColor(foreground))
  const backgroundLuminance = relativeLuminance(parseCssColor(background))
  const lighter = Math.max(foregroundLuminance, backgroundLuminance)
  const darker = Math.min(foregroundLuminance, backgroundLuminance)
  return (lighter + 0.05) / (darker + 0.05)
}

const parseCssColor = (value: string): { r: number; g: number; b: number } => {
  if (value.startsWith('#')) {
    const hex = value.slice(1)
    if (hex.length !== 6) {
      throw new Error(`unsupported hex color: ${value}`)
    }
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
    }
  }

  const hsl = /^hsl\(([-\d.]+) ([-\d.]+)% ([-\d.]+)%\)$/u.exec(value)
  const h = hsl?.[1]
  const s = hsl?.[2]
  const l = hsl?.[3]
  if (h === undefined || s === undefined || l === undefined) {
    throw new Error(`unsupported css color: ${value}`)
  }

  return hslToRgb(Number(h), Number(s) / 100, Number(l) / 100)
}

const hslToRgb = (
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } => {
  const hue = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (hue < 60) {
    r = c
    g = x
  } else if (hue < 120) {
    r = x
    g = c
  } else if (hue < 180) {
    g = c
    b = x
  } else if (hue < 240) {
    g = x
    b = c
  } else if (hue < 300) {
    r = x
    b = c
  } else {
    r = c
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

const relativeLuminance = ({
  r,
  g,
  b,
}: {
  r: number
  g: number
  b: number
}): number => {
  const channel = (value: number): number => {
    const srgb = value / 255
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}
