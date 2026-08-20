import { Hono } from 'hono'

export const createApiApp = () => {
  const app = new Hono()

  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }))

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
