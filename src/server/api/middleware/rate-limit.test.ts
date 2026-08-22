import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import { createSlidingWindowRateLimiter } from './rate-limit'

describe('createSlidingWindowRateLimiter', () => {
  it('上限を超えたら429にする', () => {
    const now = 1_000
    const limiter = createSlidingWindowRateLimiter({
      limit: 2,
      windowMs: 60_000,
      clock: { nowEpochMs: () => now },
    })

    limiter.consume('user-a')
    limiter.consume('user-a')
    expect(() => limiter.consume('user-a')).toThrow(AppError)
    try {
      limiter.consume('user-a')
    } catch (error) {
      expect(error).toMatchObject({ code: 'RATE_LIMITED', httpStatus: 429 })
    }
  })

  it('別ユーザーの回数は独立する', () => {
    const limiter = createSlidingWindowRateLimiter({
      limit: 1,
      windowMs: 60_000,
      clock: { nowEpochMs: () => 1_000 },
    })

    limiter.consume('user-a')
    expect(() => limiter.consume('user-b')).not.toThrow()
  })

  it('窓が過ぎたら再度使える', () => {
    let now = 1_000
    const limiter = createSlidingWindowRateLimiter({
      limit: 1,
      windowMs: 1_000,
      clock: { nowEpochMs: () => now },
    })

    limiter.consume('user-a')
    now = 2_001
    expect(() => limiter.consume('user-a')).not.toThrow()
  })
})
