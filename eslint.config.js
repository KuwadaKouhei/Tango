//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'src/routeTree.gen.ts',
      'src/infrastructure/db/schema/auth.generated.ts',
      'worker-configuration.d.ts',
      'drizzle/**',
      'dist/**',
      '.output/**',
      '.wrangler/**',
      '.tanstack/**',
      'playwright-report/**',
      'test-results/**',
      'playwright/.auth/**',
      'playwright.config.ts',
      'tests/e2e/**',
    ],
  },
]
