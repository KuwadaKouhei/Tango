import { describe, expect, it } from 'vitest'
import { isLocalE2eAuthEnabled } from './e2e-auth-gate'

describe('isLocalE2eAuthEnabled', () => {
  it('localhost と secret があるときだけ開く', () => {
    expect(
      isLocalE2eAuthEnabled({
        betterAuthUrl: 'http://localhost:3000',
        e2eAuthSecret: 'e2e-only',
      }),
    ).toBe(true)
    expect(
      isLocalE2eAuthEnabled({
        betterAuthUrl: 'http://127.0.0.1:3000',
        e2eAuthSecret: 'e2e-only',
      }),
    ).toBe(true)
  })

  it('本番URLや secret なしでは開かない', () => {
    expect(
      isLocalE2eAuthEnabled({
        betterAuthUrl: 'https://tango.eitango.workers.dev',
        e2eAuthSecret: 'e2e-only',
      }),
    ).toBe(false)
    expect(
      isLocalE2eAuthEnabled({
        betterAuthUrl: 'http://localhost:3000',
        e2eAuthSecret: undefined,
      }),
    ).toBe(false)
    expect(
      isLocalE2eAuthEnabled({
        betterAuthUrl: 'http://localhost:3000',
        e2eAuthSecret: '',
      }),
    ).toBe(false)
    expect(
      isLocalE2eAuthEnabled({
        betterAuthUrl: 'not-a-url',
        e2eAuthSecret: 'e2e-only',
      }),
    ).toBe(false)
  })
})
