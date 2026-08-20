import { SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'

const fetchWorker = async (path: string) =>
  SELF.fetch(new Request(`https://tango.test${path}`))

describe('GET /api/v1/health', () => {
  it('Honoがliveness JSONを返し、秘密情報を含めない', async () => {
    const response = await fetchWorker('/api/v1/health')
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/application\/json/u)
    expect(body).toEqual({ status: 'ok' })
    expect(JSON.stringify(body)).not.toMatch(/secret|token|api[_-]?key/iu)
  })
})

describe('request dispatch', () => {
  it('未知のAPIパスはHonoのJSON 404になり、Startへ落ちない', async () => {
    const response = await fetchWorker('/api/v1/missing')
    const body: unknown = await response.json()

    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toMatch(/application\/json/u)
    expect(body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: '見つかりません。',
      },
    })
  })

  it('API以外はStart側へ渡す', async () => {
    const response = await fetchWorker('/')
    const text = await response.text()

    expect(response.status).toBe(200)
    expect(text).toBe('start')
    expect(response.headers.get('content-type')).toMatch(/text\/plain/u)
  })
})
