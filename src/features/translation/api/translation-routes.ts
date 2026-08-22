import { Hono } from 'hono'
import { AppError } from '../../../platform/app-error'
import { systemClock } from '../../../platform/clock'
import { TRANSLATION_LIMITS } from '../domain/translation-limits'
import type { TranslationService } from '../domain/translation-service'
import { getTranslationCandidates } from '../application/get-translation-candidates'
import { createAppServices } from '../../../server/composition-root'
import type { AuthBindings } from '../../../server/api/bindings'
import type { AuthVariables } from '../../../server/api/middleware/auth'
import {
  createSlidingWindowRateLimiter,
  createUserRateLimitMiddleware,
  type SlidingWindowRateLimiter,
} from '../../../server/api/middleware/rate-limit'
import type { RequestIdVariables } from '../../../server/api/middleware/request-id'
import { translationCandidatesBodySchema } from './translation-schemas'

type TranslationRouteEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

const defaultRateLimiter = createSlidingWindowRateLimiter({
  limit: TRANSLATION_LIMITS.rateLimitMax,
  windowMs: TRANSLATION_LIMITS.rateLimitWindowMs,
  clock: systemClock,
})

const readBody = async (c: { req: { json: () => Promise<unknown> } }) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch (cause) {
    throw AppError.invalidJson(cause)
  }

  const parsed = translationCandidatesBodySchema.safeParse(body)
  if (!parsed.success) {
    throw AppError.validation('入力が正しくありません。', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    })
  }

  return parsed.data
}

export const createTranslationRoutes = (
  deps: {
    translationService?: TranslationService
    rateLimiter?: SlidingWindowRateLimiter
    timeoutMs?: number
  } = {},
) => {
  const routes = new Hono<TranslationRouteEnv>()
  const limiter = deps.rateLimiter ?? defaultRateLimiter
  routes.use('/translation-candidates', createUserRateLimitMiddleware(limiter))

  routes.post('/translation-candidates', async (c) => {
    const body = await readBody(c)
    const translationService =
      deps.translationService ?? createAppServices(c.env).translationService
    const result = await getTranslationCandidates({
      term: body.term,
      sourceLanguage: body.sourceLanguage,
      targetLanguage: body.targetLanguage,
      translationService,
      signal: AbortSignal.timeout(
        deps.timeoutMs ?? TRANSLATION_LIMITS.timeoutMs,
      ),
    })

    return c.json(result, 200)
  })

  return routes
}
