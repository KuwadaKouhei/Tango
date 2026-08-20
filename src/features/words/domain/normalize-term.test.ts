import { describe, expect, it } from 'vitest'
import { normalizeTerm } from './normalize-term'

describe('normalizeTerm', () => {
  it('NFKC・trim・小文字・連続空白を正規化し、冪等である', () => {
    const once = normalizeTerm('  Café  TEST  ')
    expect(once).toBe('café test')
    expect(normalizeTerm(once)).toBe(once)
  })
})
