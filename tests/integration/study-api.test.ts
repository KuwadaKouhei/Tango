import { env, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
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
    command: input,
    wordRepository: services.wordRepository,
    clock: { nowEpochMs: () => 1_700_000_000_000 },
  })
}

const callQuestions = async (input: {
  actorUserId: string
  body: unknown
  origin?: string
}) => {
  const headers = new Headers({
    origin: input.origin ?? env.BETTER_AUTH_URL,
    'content-type': 'application/json',
  })

  return createSignedInApi(input.actorUserId).fetch(
    new Request(`${API_BASE}/api/v1/study/questions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.body),
    }),
    env,
  )
}

const callHint = async (input: {
  actorUserId: string
  wordId: string
  origin?: string
}) => {
  const headers = new Headers({
    origin: input.origin ?? env.BETTER_AUTH_URL,
  })

  return createSignedInApi(input.actorUserId).fetch(
    new Request(
      `${API_BASE}/api/v1/study/questions/${encodeURIComponent(input.wordId)}/hint`,
      {
        method: 'GET',
        headers,
      },
    ),
    env,
  )
}

describe('POST /api/v1/study/questions', () => {
  it('未認証は401になる', async () => {
    const response = await SELF.fetch(
      new Request(`${API_BASE}/api/v1/study/questions`, {
        method: 'POST',
        headers: {
          origin: env.BETTER_AUTH_URL,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ mode: 'random', excludeWordIds: [] }),
      }),
    )
    const body: unknown = await response.json()
    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('Origin不一致は403になる', async () => {
    const response = await callQuestions({
      actorUserId: 'study-origin',
      origin: 'https://evil.test',
      body: { mode: 'random', excludeWordIds: [] },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(403)
    expect(body).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } })
  })

  it('所有0件は404 NO_STUDY_WORDSになる', async () => {
    await insertTestUser(env.DB, 'study-empty')
    const response = await callQuestions({
      actorUserId: 'study-empty',
      body: { mode: 'random', excludeWordIds: [] },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(404)
    expect(body).toMatchObject({ error: { code: 'NO_STUDY_WORDS' } })
  })

  it('randomは自分の単語だけを出し、ヒント本文を含めない', async () => {
    await insertTestUser(env.DB, 'study-owner')
    await insertTestUser(env.DB, 'study-other')
    const mine = await seedWord({
      actorUserId: 'study-owner',
      term: 'issue',
      meanings: ['問題'],
      hint: '文脈で意味が変わる',
    })
    await seedWord({
      actorUserId: 'study-other',
      term: 'secret',
      meanings: ['秘密'],
      hint: null,
    })

    const response = await callQuestions({
      actorUserId: 'study-owner',
      body: { mode: 'random', excludeWordIds: [] },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({
      ownedWordCount: 1,
      question: {
        wordId: mine.id,
        term: 'issue',
        hasHint: true,
      },
    })
    expect(JSON.stringify(body)).not.toContain('文脈で意味が変わる')
    expect(JSON.stringify(body)).not.toContain('secret')
  })

  it('除外すると別の自分の単語へ進み、尽きたらquestion nullになる', async () => {
    await insertTestUser(env.DB, 'study-exclude')
    const first = await seedWord({
      actorUserId: 'study-exclude',
      term: 'alpha',
      meanings: ['最初'],
      hint: null,
    })
    const second = await seedWord({
      actorUserId: 'study-exclude',
      term: 'bravo',
      meanings: ['次'],
      hint: null,
    })

    const firstResponse = await callQuestions({
      actorUserId: 'study-exclude',
      body: { mode: 'random', excludeWordIds: [first.id] },
    })
    const firstBody: unknown = await firstResponse.json()
    expect(firstResponse.status).toBe(200)
    expect(firstBody).toEqual({
      ownedWordCount: 2,
      question: {
        wordId: second.id,
        term: 'bravo',
        hasHint: false,
      },
    })

    const doneResponse = await callQuestions({
      actorUserId: 'study-exclude',
      body: { mode: 'random', excludeWordIds: [first.id, second.id] },
    })
    const doneBody: unknown = await doneResponse.json()
    expect(doneResponse.status).toBe(200)
    expect(doneBody).toEqual({
      ownedWordCount: 2,
      question: null,
    })
  })

  it('他ユーザーのIDを除外してもエラーにせず自分の問題を返す', async () => {
    await insertTestUser(env.DB, 'study-ignore-other')
    await insertTestUser(env.DB, 'study-ignore-peer')
    const mine = await seedWord({
      actorUserId: 'study-ignore-other',
      term: 'keep',
      meanings: ['残す'],
      hint: null,
    })
    const theirs = await seedWord({
      actorUserId: 'study-ignore-peer',
      term: 'peer',
      meanings: ['相手'],
      hint: null,
    })

    const response = await callQuestions({
      actorUserId: 'study-ignore-other',
      body: { mode: 'random', excludeWordIds: [theirs.id] },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({
      ownedWordCount: 1,
      question: {
        wordId: mine.id,
        term: 'keep',
        hasHint: false,
      },
    })
  })

  it('苦手優先と長すぎる除外は422になる', async () => {
    await insertTestUser(env.DB, 'study-validate')
    await seedWord({
      actorUserId: 'study-validate',
      term: 'issue',
      meanings: ['問題'],
      hint: null,
    })

    const weak = await callQuestions({
      actorUserId: 'study-validate',
      body: { mode: 'weak', excludeWordIds: [] },
    })
    expect(weak.status).toBe(422)
    expect(await weak.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })

    const tooMany = await callQuestions({
      actorUserId: 'study-validate',
      body: {
        mode: 'random',
        excludeWordIds: Array.from(
          { length: 501 },
          (_, index) => `w_${String(index)}`,
        ),
      },
    })
    expect(tooMany.status).toBe(422)
    expect(await tooMany.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })
  })
})

describe('GET /api/v1/study/questions/:wordId/hint', () => {
  it('未認証は401になる', async () => {
    const response = await SELF.fetch(
      new Request(`${API_BASE}/api/v1/study/questions/w_missing/hint`),
    )
    const body: unknown = await response.json()
    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('ヒントがある自分の単語だけ本文を返す', async () => {
    await insertTestUser(env.DB, 'hint-owner')
    await insertTestUser(env.DB, 'hint-other')
    const withHint = await seedWord({
      actorUserId: 'hint-owner',
      term: 'issue',
      meanings: ['問題'],
      hint: '文脈で意味が変わる',
    })
    const withoutHint = await seedWord({
      actorUserId: 'hint-owner',
      term: 'plain',
      meanings: ['平易'],
      hint: null,
    })
    const foreign = await seedWord({
      actorUserId: 'hint-other',
      term: 'foreign',
      meanings: ['他人'],
      hint: '見えてはいけない',
    })

    const ok = await callHint({
      actorUserId: 'hint-owner',
      wordId: withHint.id,
    })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ hint: '文脈で意味が変わる' })

    const missing = await callHint({
      actorUserId: 'hint-owner',
      wordId: withoutHint.id,
    })
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({
      error: { code: 'WORD_NOT_FOUND' },
    })

    const other = await callHint({
      actorUserId: 'hint-owner',
      wordId: foreign.id,
    })
    expect(other.status).toBe(404)
    expect(JSON.stringify(await other.json())).not.toContain('見えてはいけない')
  })
})
