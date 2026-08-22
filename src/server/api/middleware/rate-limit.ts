import type { Context, Next } from 'hono'
import type { Clock } from '../../../platform/clock'
import { AppError } from '../../../platform/app-error'
import type { AuthVariables } from './auth'

export type SlidingWindowRateLimiter = {
  consume: (key: string) => void
}

/**
 * isolate内のスライディングウィンドウ。Cloudflare Rate Limiting製品は使わない（OQ-015 Free）。
 * 複数isolate間では共有されない。個人MVPのボタン連打とneuron消費の抑制が目的。
 */
export const createSlidingWindowRateLimiter = (input: {
  limit: number
  windowMs: number
  clock: Clock
}): SlidingWindowRateLimiter => {
  const timestampsByKey = new Map<string, number[]>()

  return {
    consume: (key: string) => {
      const now = input.clock.nowEpochMs()
      const windowStart = now - input.windowMs
      const recent = (timestampsByKey.get(key) ?? []).filter(
        (timestamp) => timestamp > windowStart,
      )

      if (recent.length >= input.limit) {
        const oldest = recent[0]
        const retryAfterMs =
          oldest === undefined ? input.windowMs : oldest + input.windowMs - now
        throw AppError.rateLimited(Math.max(1, Math.ceil(retryAfterMs / 1000)))
      }

      recent.push(now)
      timestampsByKey.set(key, recent)
    },
  }
}

export const createUserRateLimitMiddleware = (
  limiter: SlidingWindowRateLimiter,
) => {
  return async (
    c: Context<{ Variables: AuthVariables }>,
    next: Next,
  ): Promise<void> => {
    limiter.consume(c.get('actorUserId'))
    await next()
  }
}
