import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { wordResponseSchema } from '../../src/features/words/api/word-schemas'
import { createWord } from '../../src/features/words/application/manage-word'
import { createAppServices } from '../../src/server/composition-root'
import { createSignedInApi } from '../setup/signed-in-api'
import { insertTestUser } from '../setup/test-builders'

const API_BASE = 'https://tango.test'

const seedWord = async (input: {
  actorUserId: string
  term: string
  meanings: string[]
  hint: string | null
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
    clock: { nowEpochMs: () => 1_700_000_000_000 },
  })
}

const callGet = async (actorUserId: string, wordId: string) =>
  createSignedInApi(actorUserId).fetch(
    new Request(`${API_BASE}/api/v1/words/${encodeURIComponent(wordId)}`),
    env,
  )

const callPut = async (input: {
  actorUserId: string
  wordId: string
  body: unknown
  origin?: string
}) => {
  // 許可originはbindingが真値。テスト側で literal を持つとwrangler設定とずれる。
  const headers = new Headers({
    'content-type': 'application/json',
    origin: input.origin ?? env.BETTER_AUTH_URL,
  })

  return createSignedInApi(input.actorUserId).fetch(
    new Request(
      `${API_BASE}/api/v1/words/${encodeURIComponent(input.wordId)}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify(input.body),
      },
    ),
    env,
  )
}

const readMeanings = async (ownerUserId: string, wordId: string) => {
  const services = createAppServices(env)
  const word = await services.wordRepository.findOwnedById(ownerUserId, wordId)
  return {
    term: word?.term,
    hint: word?.hint,
    meanings: word?.meanings.map((meaning) => meaning.meaning),
  }
}

describe('GET /api/v1/words/:wordId', () => {
  it('契約どおりのJSONを返す', async () => {
    await insertTestUser(env.DB, 'detail-owner')
    const word = await seedWord({
      actorUserId: 'detail-owner',
      term: 'issue',
      meanings: ['問題', '論点'],
      hint: '文脈で意味が変わる',
    })

    const response = await callGet('detail-owner', word.id)
    const body: unknown = await response.json()

    expect(response.status).toBe(200)
    const parsed = wordResponseSchema.safeParse(body)
    expect(parsed.success).toBe(true)
    if (!parsed.success) {
      return
    }

    expect(parsed.data.word.id).toBe(word.id)
    expect(parsed.data.word.term).toBe('issue')
    expect(parsed.data.word.hint).toBe('文脈で意味が変わる')
    expect(parsed.data.word.meanings.map((meaning) => meaning.meaning)).toEqual(
      ['問題', '論点'],
    )
    expect(parsed.data.word.meanings.map((meaning) => meaning.order)).toEqual([
      0, 1,
    ])
    expect(parsed.data.word.createdAt).toBe('2023-11-14T22:13:20.000Z')
  })

  it('他ユーザーの単語はHTTPでも404で、存在を教えない', async () => {
    await insertTestUser(env.DB, 'detail-a')
    await insertTestUser(env.DB, 'detail-b')
    const word = await seedWord({
      actorUserId: 'detail-a',
      term: 'secret',
      meanings: ['秘密'],
      hint: null,
    })

    const response = await callGet('detail-b', word.id)
    const body: unknown = await response.json()

    expect(response.status).toBe(404)
    expect(body).toEqual({
      error: {
        code: 'WORD_NOT_FOUND',
        message: expect.any(String),
        requestId: expect.any(String),
        details: {},
      },
    })
    expect(JSON.stringify(body)).not.toContain('secret')
  })
})

describe('PUT /api/v1/words/:wordId', () => {
  it('意味とヒントを置換して更新後の単語を返す', async () => {
    await insertTestUser(env.DB, 'put-owner')
    const word = await seedWord({
      actorUserId: 'put-owner',
      term: 'issue',
      meanings: ['問題'],
      hint: '旧ヒント',
    })

    const response = await callPut({
      actorUserId: 'put-owner',
      wordId: word.id,
      body: { term: 'issue', meanings: ['論点', '問題'], hint: null },
    })
    const body = wordResponseSchema.parse(await response.json())

    expect(response.status).toBe(200)
    expect(body.word.meanings.map((meaning) => meaning.meaning)).toEqual([
      '論点',
      '問題',
    ])
    expect(body.word.hint).toBeNull()
    expect(body.word.createdAt).toBe('2023-11-14T22:13:20.000Z')

    expect(await readMeanings('put-owner', word.id)).toEqual({
      term: 'issue',
      hint: null,
      meanings: ['論点', '問題'],
    })
  })

  it('他ユーザーの単語は404で、元データを書き換えない', async () => {
    await insertTestUser(env.DB, 'put-a')
    await insertTestUser(env.DB, 'put-b')
    const word = await seedWord({
      actorUserId: 'put-a',
      term: 'issue',
      meanings: ['問題'],
      hint: null,
    })

    const response = await callPut({
      actorUserId: 'put-b',
      wordId: word.id,
      body: { term: 'hacked', meanings: ['不正'], hint: null },
    })

    expect(response.status).toBe(404)
    expect(await readMeanings('put-a', word.id)).toEqual({
      term: 'issue',
      hint: null,
      meanings: ['問題'],
    })
  })

  it('Originが一致しないmutationは403で拒否する', async () => {
    await insertTestUser(env.DB, 'put-origin')
    const word = await seedWord({
      actorUserId: 'put-origin',
      term: 'issue',
      meanings: ['問題'],
      hint: null,
    })

    const response = await callPut({
      actorUserId: 'put-origin',
      wordId: word.id,
      body: { term: 'issue', meanings: ['論点'], hint: null },
      origin: 'https://evil.test',
    })
    const body: unknown = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({
      error: {
        code: 'ORIGIN_NOT_ALLOWED',
        message: expect.any(String),
        requestId: expect.any(String),
        details: {},
      },
    })
    expect(await readMeanings('put-origin', word.id)).toEqual({
      term: 'issue',
      hint: null,
      meanings: ['問題'],
    })
  })

  it.each([
    [
      '意味が全て空白',
      'put-blank',
      { term: 'issue', meanings: ['  ', ''], hint: null },
    ],
    ['意味が0件', 'put-none', { term: 'issue', meanings: [], hint: null }],
    [
      '未知のフィールド',
      'put-extra',
      { term: 'issue', meanings: ['論点'], extra: 'x' },
    ],
  ])('%sは422で拒否し、元データを残す', async (_label, userId, requestBody) => {
    await insertTestUser(env.DB, userId)
    const word = await seedWord({
      actorUserId: userId,
      term: 'issue',
      meanings: ['問題'],
      hint: null,
    })

    const response = await callPut({
      actorUserId: userId,
      wordId: word.id,
      body: requestBody,
    })
    const body: unknown = await response.json()

    expect(response.status).toBe(422)
    expect(body).toMatchObject({ error: { code: 'VALIDATION_FAILED' } })
    expect(await readMeanings(userId, word.id)).toEqual({
      term: 'issue',
      hint: null,
      meanings: ['問題'],
    })
  })
})
