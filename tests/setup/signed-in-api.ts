import { Hono } from 'hono'
import { createWordRoutes } from '../../src/features/words/api/word-routes'
import type { AuthBindings } from '../../src/server/api/bindings'
import { handleApiError } from '../../src/server/api/error-handler'
import type { AuthVariables } from '../../src/server/api/middleware/auth'
import { originMiddleware } from '../../src/server/api/middleware/origin'
import type { RequestIdVariables } from '../../src/server/api/middleware/request-id'
import { requestIdMiddleware } from '../../src/server/api/middleware/request-id'

type SignedInApiEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

/**
 * Better Authのsession cookieは署名付きなのでテストから正当な値を作れない。
 * 未認証の拒否は auth.test.ts の401で担保し、ここでは requireAuth だけ差し替えて
 * Origin検証・error contract・応答JSONというHTTP契約を本番moduleのまま検証する。
 */
export const createSignedInApi = (actorUserId: string) => {
  const app = new Hono<SignedInApiEnv>()

  app.use('*', requestIdMiddleware)
  app.onError(handleApiError)

  const privateV1 = new Hono<SignedInApiEnv>()
  privateV1.use('*', originMiddleware)
  privateV1.use('*', async (c, next) => {
    c.set('actorUserId', actorUserId)
    await next()
  })
  privateV1.route('/', createWordRoutes())
  app.route('/api/v1', privateV1)

  return app
}
