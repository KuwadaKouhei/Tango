/// <reference types="@cloudflare/vitest-pool-workers/types" />

interface TestMigrationsEnv {
  TEST_MIGRATIONS: {
    name: string
    queries: string[]
  }[]
}

declare namespace Cloudflare {
  interface Env extends TestMigrationsEnv {}
}
