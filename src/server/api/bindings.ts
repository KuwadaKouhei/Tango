export type AuthBindings = {
  DB: D1Database
  BETTER_AUTH_SECRET: string
  BETTER_AUTH_URL: string
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
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
