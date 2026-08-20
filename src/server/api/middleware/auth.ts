import type { Context, Next } from 'hono'
import { AppError } from '../../../platform/app-error'
import { getSessionFromHeaders } from '../../../infrastructure/auth/session-adapter'
import type { AuthBindings } from '../bindings'

export type AuthVariables = {
  actorUserId: string
}

export const requireAuth = async (
  c: Context<{ Bindings: AuthBindings; Variables: AuthVariables }>,
  next: Next,
) => {
  const session = await getSessionFromHeaders(c.env, c.req.raw.headers)
  if (!session) {
    throw AppError.unauthenticated()
  }

  c.set('actorUserId', session.user.id)
  await next()
}
