import { describe, expect, it } from 'vitest'
import { isAllowedOrigin } from './origin'

describe('isAllowedOrigin', () => {
  it('許可originと一致するときだけtrueになる', () => {
    expect(isAllowedOrigin('https://tango.test', 'https://tango.test')).toBe(
      true,
    )
    expect(isAllowedOrigin('https://evil.test', 'https://tango.test')).toBe(
      false,
    )
    expect(isAllowedOrigin(undefined, 'https://tango.test')).toBe(false)
  })
})
