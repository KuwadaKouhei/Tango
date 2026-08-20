import { createAuth } from './better-auth'
import type { AuthBindings } from '../../server/api/bindings'

export const getSessionFromHeaders = async (
  bindings: AuthBindings,
  headers: Headers,
) => {
  const auth = createAuth(bindings)
  return auth.api.getSession({ headers })
}
