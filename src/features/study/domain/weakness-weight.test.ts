import { describe, expect, it } from 'vitest'
import {
  WEAKNESS_WEIGHT_FLOOR,
  toWeaknessAccuracy,
  toWeaknessWeight,
} from './weakness-weight'

describe('toWeaknessWeight', () => {
  it('未回答はaccuracy 0、重み1になる', () => {
    expect(toWeaknessAccuracy(0, 0)).toBe(0)
    expect(toWeaknessWeight(0, 0)).toBe(1)
  })

  it('回答済み0%も重み1になる', () => {
    expect(toWeaknessAccuracy(0, 4)).toBe(0)
    expect(toWeaknessWeight(0, 4)).toBe(1)
  })

  it('100%でも床を残す', () => {
    expect(toWeaknessAccuracy(3, 3)).toBe(1)
    expect(toWeaknessWeight(3, 3)).toBe(WEAKNESS_WEIGHT_FLOOR)
  })

  it('正解率の補数を重みにし、常に床以上である', () => {
    expect(toWeaknessWeight(1, 2)).toBe(0.5)
    expect(toWeaknessWeight(1, 4)).toBe(0.75)
    expect(toWeaknessWeight(0, 1)).toBeGreaterThan(0)
    expect(toWeaknessWeight(9, 10)).toBeGreaterThanOrEqual(
      WEAKNESS_WEIGHT_FLOOR,
    )
  })
})
