import type { Context, Next } from 'hono'
import { AppError } from '../../../platform/app-error'
import type { AuthBindings } from '../bindings'

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const isAllowedOrigin = (
  origin: string | undefined,
  allowedOrigin: string,
): boolean => origin === allowedOrigin

export const originMiddleware = async (
  c: Context<{ Bindings: AuthBindings }>,
  next: Next,
) => {
  if (!MUTATING_METHODS.has(c.req.method)) {
    await next()
    return
  }

  if (!isAllowedOrigin(c.req.header('origin'), c.env.BETTER_AUTH_URL)) {
    throw AppError.originNotAllowed()
  }

  await next()
}
