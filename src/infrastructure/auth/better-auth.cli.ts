import { drizzleAdapter } from '@better-auth/drizzle-adapter'
import { betterAuth } from 'better-auth'

/**
 * Better Auth CLI専用。lockした 1.7.1 の `auth generate` が読む。
 * runtimeのD1/secretはここへ置かない。
 */
export const auth = betterAuth({
  database: drizzleAdapter(
    // CLIはschema生成だけに使う。実DBは runtime の createAuth が渡す。
    undefined as never,
    { provider: 'sqlite' },
  ),
  socialProviders: {
    google: {
      clientId: 'cli-placeholder',
      clientSecret: 'cli-placeholder',
    },
  },
})
