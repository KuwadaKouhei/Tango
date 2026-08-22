import { Hono } from 'hono'
import { createAuth } from '../../infrastructure/auth/better-auth'
import { AppError } from '../../platform/app-error'
import { createTranslationRoutes } from '../../features/translation/api/translation-routes'
import { createWordRoutes } from '../../features/words/api/word-routes'
import type { AuthBindings } from './bindings'
import { handleApiError } from './error-handler'
import type { AuthVariables } from './middleware/auth'
import { requireAuth } from './middleware/auth'
import { originMiddleware } from './middleware/origin'
import type { RequestIdVariables } from './middleware/request-id'
import { requestIdMiddleware } from './middleware/request-id'

type ApiEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

export const createApiApp = () => {
  const app = new Hono<ApiEnv>()

  app.use('*', requestIdMiddleware)
  app.onError(handleApiError)
  app.notFound((c) => {
    const error = AppError.notFound()
    return handleApiError(error, c)
  })

  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }))

  app.on(['GET', 'POST'], '/api/auth/*', (c) => {
    const auth = createAuth(c.env)
    return auth.handler(c.req.raw)
  })

  const privateV1 = new Hono<ApiEnv>()
  privateV1.use('*', originMiddleware)
  privateV1.use('*', requireAuth)
  privateV1.route('/', createWordRoutes())
  privateV1.route('/', createTranslationRoutes())
  app.route('/api/v1', privateV1)

  return app
}

export const apiApp = createApiApp()
