/**
 * E2E専用の email/password を本番Googleログインへ混ぜないための門。
 * 本番URL（https）や secret 未設定では絶対に開かない。
 */
export const isLocalE2eAuthEnabled = (input: {
  betterAuthUrl: string
  e2eAuthSecret: string | undefined
}): boolean => {
  if (input.e2eAuthSecret === undefined || input.e2eAuthSecret.length === 0) {
    return false
  }

  let url: URL
  try {
    url = new URL(input.betterAuthUrl)
  } catch {
    return false
  }

  if (url.protocol !== 'http:') {
    return false
  }

  return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
}
