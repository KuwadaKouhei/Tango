import { drizzle } from 'drizzle-orm/d1'
import type { AuthBindings } from '../../server/api/bindings'
import * as schema from './schema'

export const createDb = (bindings: Pick<AuthBindings, 'DB'>) =>
  drizzle(bindings.DB, { schema })

export type AppDb = ReturnType<typeof createDb>
