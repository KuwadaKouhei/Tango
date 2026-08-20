import path from 'node:path'
import {
  cloudflareTest,
  readD1Migrations,
} from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const migrations = await readD1Migrations(
  path.join(import.meta.dirname, 'drizzle'),
)

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: './wrangler.test.jsonc' },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ['./tests/setup/apply-migrations.ts'],
    include: ['src/**/*.test.ts', 'tests/integration/**/*.test.ts'],
  },
})
