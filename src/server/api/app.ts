import { Hono } from 'hono'
import { createAuth } from '../../infrastructure/auth/better-auth'
import type { AuthBindings } from './bindings'
import type { AuthVariables } from './middleware/auth'
import { requireAuth } from './middleware/auth'

export const createApiApp = () => {
  const app = new Hono<{ Bindings: AuthBindings; Variables: AuthVariables }>()

  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }))

  app.on(['GET', 'POST'], '/api/auth/*', (c) => {
    const auth = createAuth(c.env)
    return auth.handler(c.req.raw)
  })

  const privateV1 = new Hono<{
    Bindings: AuthBindings
    Variables: AuthVariables
  }>()
  privateV1.use('*', requireAuth)
  // T05で実データに置き換える。T02は認証後の単語一覧導線と401を先に固定する。
  privateV1.get('/words', (c) => c.json({ items: [], nextCursor: null }))
  app.route('/api/v1', privateV1)

  app.notFound((c) =>
    c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: '見つかりません。',
        },
      },
      404,
    ),
  )

  app.onError((error, c) => {
    console.error(
      JSON.stringify({
        level: 'error',
        route: c.req.path,
        errorName: error.name,
      }),
    )

    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '内部エラーが発生しました。',
        },
      },
      500,
    )
  })

  return app
}

export const apiApp = createApiApp()
