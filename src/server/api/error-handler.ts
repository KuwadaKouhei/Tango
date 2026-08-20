import type { Context } from 'hono'
import { AppError, isAppError } from '../../platform/app-error'
import type { AuthBindings } from './bindings'
import type { AuthVariables } from './middleware/auth'
import type { RequestIdVariables } from './middleware/request-id'

type ApiContext = Context<{
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}>

const requestIdOf = (c: ApiContext): string => c.get('requestId')

export const toErrorBody = (error: AppError, requestId: string) => ({
  error: {
    code: error.code,
    message: error.message,
    requestId,
    details: error.details,
  },
})

export const handleApiError = (error: unknown, c: ApiContext) => {
  const requestId = requestIdOf(c)
  const appError = isAppError(error) ? error : AppError.internal(error)

  console.error(
    JSON.stringify({
      level: 'error',
      requestId,
      route: c.req.path,
      errorCode: appError.code,
      errorName: error instanceof Error ? error.name : 'unknown',
    }),
  )

  return c.json(toErrorBody(appError, requestId), appError.httpStatus)
}
