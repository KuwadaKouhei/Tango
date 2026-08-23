import { describe, expect, it } from 'vitest'
import { resolvePlannedCount } from './planned-count'

describe('resolvePlannedCount', () => {
  it('所有0件は0になる', () => {
    expect(resolvePlannedCount(10, 0)).toBe(0)
    expect(resolvePlannedCount('all', 0)).toBe(0)
  })

  it('所有数が選択より少なければ全件になる', () => {
    expect(resolvePlannedCount(10, 3)).toBe(3)
    expect(resolvePlannedCount(5, 5)).toBe(5)
  })

  it('全部は所有数そのものになる', () => {
    expect(resolvePlannedCount('all', 12)).toBe(12)
  })

  it('所有数が多ければ選択件数になる', () => {
    expect(resolvePlannedCount(20, 40)).toBe(20)
  })
})
