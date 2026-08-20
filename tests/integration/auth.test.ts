import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

const fetchWorker = async (path: string, init?: RequestInit) =>
  SELF.fetch(new Request(`https://tango.test${path}`, init))

describe('private API auth', () => {
  it('未認証の単語一覧APIは401を返す', async () => {
    const response = await fetchWorker('/api/v1/words')
    const body: unknown = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'ログインが必要です。',
        requestId: expect.any(String),
      },
    })
    expect(JSON.stringify(body)).not.toMatch(
      /secret|GOOGLE_CLIENT|BETTER_AUTH/iu,
    )
  })
})

describe('Better Auth routes', () => {
  it('Googleログイン開始はHonoが扱い、CookieはHttpOnlyとSameSite=Laxになる', async () => {
    const response = await fetchWorker('/api/auth/sign-in/social', {
      method: 'POST',
      headers: {
        origin: 'https://tango.test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        provider: 'google',
        callbackURL: '/words',
      }),
    })

    const cookieHeader = response.headers.getSetCookie().join('\n')

    expect(response.status).toBeLessThan(500)
    expect(response.headers.get('content-type') ?? '').not.toMatch(
      /text\/html/u,
    )
    if (cookieHeader.length > 0) {
      expect(cookieHeader).toMatch(/httponly/iu)
      expect(cookieHeader).toMatch(/samesite=lax/iu)
    }
  })
})
