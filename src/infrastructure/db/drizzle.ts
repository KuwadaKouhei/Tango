import { drizzle } from 'drizzle-orm/d1'
import * as authSchema from './schema/auth.generated'
import type { AuthBindings } from '../../server/api/bindings'

export const createDb = (bindings: Pick<AuthBindings, 'DB'>) =>
  drizzle(bindings.DB, { schema: authSchema })
