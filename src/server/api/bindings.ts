export type AuthBindings = {
  DB: D1Database
  AI: Ai
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  DEEPL_AUTH_KEY: string
  // 本番では未設定。localhost E2E の email/password 門だけが読む。
  E2E_AUTH_SECRET?: string
}

export const readRequiredBinding = (
  name: keyof AuthBindings,
  value: string | undefined,
): string => {
  if (!value) {
    throw new Error(`${name} is not configured`)
  }

  return value
}
