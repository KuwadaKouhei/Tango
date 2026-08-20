import type { Context, Next } from 'hono'
import { getSessionFromHeaders } from '../../../infrastructure/auth/session-adapter'
import type { AuthBindings } from '../bindings'

export type AuthVariables = {
  actorUserId: string
}

const requestIdOf = (c: Context): string =>
  c.req.header('cf-ray') ?? crypto.randomUUID()

export const requireAuth = async (
  c: Context<{ Bindings: AuthBindings; Variables: AuthVariables }>,
  next: Next,
) => {
  const session = await getSessionFromHeaders(c.env, c.req.raw.headers)
  if (!session) {
    return c.json(
      {
        error: {
          code: 'UNAUTHENTICATED',
          message: 'ログインが必要です。',
          requestId: requestIdOf(c),
        },
      },
      401,
    )
  }

  c.set('actorUserId', session.user.id)
  await next()
}
