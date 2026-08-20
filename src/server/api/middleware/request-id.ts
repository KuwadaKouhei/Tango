import type { Context, Next } from 'hono'

export type RequestIdVariables = {
  requestId: string
}

export const createRequestId = (cfRay: string | undefined): string =>
  cfRay ?? `req_${crypto.randomUUID()}`

export const requestIdMiddleware = async (
  c: Context<{ Variables: RequestIdVariables }>,
  next: Next,
) => {
  c.set('requestId', createRequestId(c.req.header('cf-ray')))
  await next()
}
