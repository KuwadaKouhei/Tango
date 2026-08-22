import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { wordListResponseSchema } from '../../src/features/words/api/word-schemas'
import { createWord } from '../../src/features/words/application/manage-word'
import { createAppServices } from '../../src/server/composition-root'
import { createSignedInApi } from '../setup/signed-in-api'
import { insertTestUser } from '../setup/test-builders'

const callList = async (actorUserId: string, query: string) =>
  createSignedInApi(actorUserId).fetch(
    new Request(`https://tango.test/api/v1/words${query}`),
    env,
  )

const seedWord = async (input: {
  actorUserId: string
  term: string
  meanings: string[]
  hint: string | null
  nowEpochMs: number
}) => {
  const services = createAppServices(env)
  return createWord({
    command: {
      actorUserId: input.actorUserId,
      term: input.term,
      meanings: input.meanings,
      hint: input.hint,
    },
    wordRepository: services.wordRepository,
    clock: { nowEpochMs: () => input.nowEpochMs },
  })
}

describe('GET /api/v1/words', () => {
  it('契約どおりのJSONを返す', async () => {
    await insertTestUser(env.DB, 'api-list')
    await seedWord({
      actorUserId: 'api-list',
      term: 'issue',
      meanings: ['問題', '論点'],
      hint: '文脈で意味が変わる',
      nowEpochMs: 1_700_000_000_000,
    })

    const response = await callList('api-list', '')
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/application\/json/u)

    const parsed = wordListResponseSchema.safeParse(body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    expect(parsed.data.nextCursor).toBeNull()
    expect(parsed.data.items).toHaveLength(1)

    const [item] = parsed.data.items
    expect(item?.term).toBe('issue')
    expect(item?.hint).toBe('文脈で意味が変わる')
    expect(item?.meanings.map((meaning) => meaning.meaning)).toEqual([
      '問題',
      '論点',
    ])
    expect(item?.meanings.map((meaning) => meaning.order)).toEqual([0, 1])
    expect(item?.stats).toEqual({
      status: 'unanswered',
      correct: 0,
      total: 0,
      accuracy: null,
    })
    expect(item?.createdAt).toBe('2023-11-14T22:13:20.000Z')
  })

  it('他ユーザーの単語はHTTP応答にも出ない', async () => {
    await insertTestUser(env.DB, 'api-owner')
    await insertTestUser(env.DB, 'api-intruder')
    await seedWord({
      actorUserId: 'api-owner',
      term: 'secret',
      meanings: ['秘密'],
      hint: null,
      nowEpochMs: 1_700_000_000_001,
    })

    const response = await callList('api-intruder', '')
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ items: [], nextCursor: null })
  })

  it('limitでページを区切りcursorで続きを返す', async () => {
    await insertTestUser(env.DB, 'api-page')
    for (const [index, term] of ['a', 'b'].entries()) {
      await seedWord({
        actorUserId: 'api-page',
        term,
        meanings: [term],
        hint: null,
        nowEpochMs: 1_700_000_100_000 + index,
      })
    }

    const firstResponse = await callList('api-page', '?limit=1')
    const first = wordListResponseSchema.parse(await firstResponse.json())
    expect(first.items).toHaveLength(1)
    expect(first.nextCursor).toEqual(expect.any(String))

    const secondResponse = await callList(
      'api-page',
      `?limit=1&cursor=${encodeURIComponent(first.nextCursor ?? '')}`,
    )
    const second = wordListResponseSchema.parse(await secondResponse.json())
    expect(second.items).toHaveLength(1)
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id)
  })

  it.each([
    ['数値でないlimit', '?limit=abc'],
    ['0以下のlimit', '?limit=0'],
    ['上限超過のlimit', '?limit=101'],
    ['小数のlimit', '?limit=1.5'],
    ['壊れたcursor', '?cursor=%25%25%25'],
    ['未知のquery param', '?limmit=20'],
  ])('%sは422で拒否する', async (_label, query) => {
    const response = await callList('api-invalid', query)
    const body: unknown = await response.json()

    expect(response.status).toBe(422)
    expect(body).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: expect.any(String),
        requestId: expect.any(String),
        details: expect.any(Object),
      },
    })
    // 生SQLやstackを公開errorへ漏らさない。
    expect(JSON.stringify(body)).not.toMatch(/select |from words|at .*\.ts:/iu)
  })
})
