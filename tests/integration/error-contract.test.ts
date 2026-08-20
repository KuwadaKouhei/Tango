import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

const fetchWorker = async (path: string, init?: RequestInit) =>
  SELF.fetch(new Request(`https://tango.test${path}`, init))

describe('API error contract', () => {
  it('未認証の単語詳細はrequestId付き401になる', async () => {
    const response = await fetchWorker('/api/v1/words/w_missing')
    const body: unknown = await response.json()

    expect(response.status).toBe(401)
    expect(body).toEqual({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'ログインが必要です。',
        requestId: expect.any(String),
        details: {},
      },
    })
  })

  it('mutationのOrigin不一致は403になる', async () => {
    const response = await fetchWorker('/api/v1/words', {
      method: 'POST',
      headers: {
        origin: 'https://evil.test',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ term: 'issue', meanings: ['問題'] }),
    })
    const body: unknown = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      error: {
        code: 'ORIGIN_NOT_ALLOWED',
        message: 'この操作は許可されたoriginからだけ実行できます。',
        requestId: expect.any(String),
        details: {},
      },
    })
  })

  it('未知の非v1 APIは404になりStartへ落ちない', async () => {
    const response = await fetchWorker('/api/unknown')
    const body: unknown = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toMatch(/application\/json/u)
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '見つかりません。',
        requestId: expect.any(String),
        details: {},
      },
    })
  })
})
