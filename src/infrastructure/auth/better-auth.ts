import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'
import { createDb } from '../db/drizzle'
import type { AuthBindings } from '../../server/api/bindings'
import { readRequiredBinding } from '../../server/api/bindings'
import * as authSchema from '../db/schema/auth.generated'

export const createAuth = (bindings: AuthBindings) => {
  const db = createDb(bindings)
  const baseURL = readRequiredBinding(
    'BETTER_AUTH_URL',
    bindings.BETTER_AUTH_URL,
  )

  return betterAuth({
    baseURL,
    secret: readRequiredBinding(
      'BETTER_AUTH_SECRET',
      bindings.BETTER_AUTH_SECRET,
    ),
    database: drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
      transaction: false,
    }),
    socialProviders: {
      google: {
        clientId: readRequiredBinding(
          'GOOGLE_CLIENT_ID',
          bindings.GOOGLE_CLIENT_ID,
        ),
        clientSecret: readRequiredBinding(
          'GOOGLE_CLIENT_SECRET',
          bindings.GOOGLE_CLIENT_SECRET,
        ),
        prompt: 'select_account',
      },
    },
    trustedOrigins: [baseURL],
    advanced: {
      useSecureCookies: baseURL.startsWith('https://'),
      defaultCookieAttributes: {
        sameSite: 'lax',
        httpOnly: true,
      },
    },
  })
}

export type Auth = ReturnType<typeof createAuth>
