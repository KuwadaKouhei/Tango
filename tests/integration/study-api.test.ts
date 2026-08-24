import { env, SELF } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { selectNextQuestion } from '../../src/features/study/application/select-question'
import type { SemanticJudge } from '../../src/features/study/domain/semantic-judge'
import { createWord } from '../../src/features/words/application/manage-word'
import { createDb } from '../../src/infrastructure/db/drizzle'
import { buildOwnedWeakQuestionQuery } from '../../src/infrastructure/db/repositories/d1-word-repository'
import { createOpaqueId } from '../../src/platform/ids'
import type { RandomSource } from '../../src/platform/random'
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

const appendResult = async (input: {
  userId: string
  wordId: string
  isCorrect: boolean
  createdAt: number
}) => {
  const services = createAppServices(env)
  await services.testResultRepository.append({
    id: createOpaqueId('tr'),
    userId: input.userId,
    wordId: input.wordId,
    answer: '問題',
    isCorrect: input.isCorrect,
    judgeType: 'exact',
    hintUsed: false,
    judgeProvider: null,
    judgeModel: null,
    promptVersion: null,
    createdAt: input.createdAt,
  })
}

const callQuestions = async (input: {
  actorUserId: string
  body: unknown
  origin?: string
  random?: RandomSource
}) => {
  const headers = new Headers({
    origin: input.origin ?? env.BETTER_AUTH_URL,
    'content-type': 'application/json',
  })

  return createSignedInApi(
    input.actorUserId,
    input.random === undefined ? {} : { random: input.random },
  ).fetch(
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

const explodingJudge: SemanticJudge = {
  judge: async () => {
    throw new Error('SemanticJudge must not be called')
  },
}

const callAnswers = async (input: {
  actorUserId: string
  body: unknown
  origin?: string
  semanticJudge?: SemanticJudge
}) => {
  const headers = new Headers({
    origin: input.origin ?? env.BETTER_AUTH_URL,
    'content-type': 'application/json',
  })

  return createSignedInApi(
    input.actorUserId,
    input.semanticJudge === undefined
      ? {}
      : { semanticJudge: input.semanticJudge },
  ).fetch(
    new Request(`${API_BASE}/api/v1/study/answers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(input.body),
    }),
    env,
  )
}

const callListWords = async (actorUserId: string) =>
  createSignedInApi(actorUserId).fetch(
    new Request(`${API_BASE}/api/v1/words`),
    env,
  )

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

  it('長すぎる除外は422になる', async () => {
    await insertTestUser(env.DB, 'study-validate')
    await seedWord({
      actorUserId: 'study-validate',
      term: 'issue',
      meanings: ['問題'],
      hint: null,
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

describe('POST /api/v1/study/questions weak', () => {
  it('自分の単語だけを重み付きで出し、他ユーザーは出さない', async () => {
    await insertTestUser(env.DB, 'weak-owner')
    await insertTestUser(env.DB, 'weak-other')
    const weakWord = await seedWord({
      actorUserId: 'weak-owner',
      term: 'weak-term',
      meanings: ['苦手'],
      hint: null,
    })
    const strongWord = await seedWord({
      actorUserId: 'weak-owner',
      term: 'strong-term',
      meanings: ['得意'],
      hint: '見えてはいけないヒント',
    })
    const foreign = await seedWord({
      actorUserId: 'weak-other',
      term: 'foreign',
      meanings: ['他人'],
      hint: null,
    })
    await appendResult({
      userId: 'weak-owner',
      wordId: weakWord.id,
      isCorrect: false,
      createdAt: 10,
    })
    await appendResult({
      userId: 'weak-owner',
      wordId: strongWord.id,
      isCorrect: true,
      createdAt: 11,
    })
    await appendResult({
      userId: 'weak-owner',
      wordId: strongWord.id,
      isCorrect: true,
      createdAt: 12,
    })

    const response = await callQuestions({
      actorUserId: 'weak-owner',
      body: { mode: 'weak', excludeWordIds: [] },
      random: { nextUnitInterval: () => 0.1 },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({
      ownedWordCount: 2,
      question: {
        wordId: weakWord.id,
        term: 'weak-term',
        hasHint: false,
      },
    })
    expect(JSON.stringify(body)).not.toContain(foreign.id)
    expect(JSON.stringify(body)).not.toContain('foreign')
    expect(JSON.stringify(body)).not.toContain('見えてはいけないヒント')
  })

  it('除外で尽きたらquestion nullになり、所有0件は404になる', async () => {
    await insertTestUser(env.DB, 'weak-exclude')
    const word = await seedWord({
      actorUserId: 'weak-exclude',
      term: 'only',
      meanings: ['だけ'],
      hint: null,
    })

    const done = await callQuestions({
      actorUserId: 'weak-exclude',
      body: { mode: 'weak', excludeWordIds: [word.id] },
    })
    expect(done.status).toBe(200)
    expect(await done.json()).toEqual({
      ownedWordCount: 1,
      question: null,
    })

    await insertTestUser(env.DB, 'weak-empty')
    const empty = await callQuestions({
      actorUserId: 'weak-empty',
      body: { mode: 'weak', excludeWordIds: [] },
    })
    expect(empty.status).toBe(404)
    expect(await empty.json()).toMatchObject({
      error: { code: 'NO_STUDY_WORDS' },
    })
  })

  it('個人規模の苦手抽選queryと抽選が完了する', async () => {
    await insertTestUser(env.DB, 'weak-scale')
    const services = createAppServices(env)
    const count = 80
    for (let index = 0; index < count; index += 1) {
      const word = await seedWord({
        actorUserId: 'weak-scale',
        term: `scale-${String(index)}`,
        meanings: ['計測'],
        hint: null,
      })
      if (index % 4 === 0) {
        await appendResult({
          userId: 'weak-scale',
          wordId: word.id,
          isCorrect: index % 8 === 0,
          createdAt: index,
        })
      }
    }

    const started = Date.now()
    const listed =
      await services.wordRepository.listOwnedWeakQuestionCandidates(
        'weak-scale',
      )
    const selected = await selectNextQuestion({
      actorUserId: 'weak-scale',
      mode: 'weak',
      excludeWordIds: [],
      wordRepository: services.wordRepository,
      random: { nextUnitInterval: () => 0.3 },
    })
    const elapsedMs = Date.now() - started

    expect(listed).toHaveLength(count)
    expect(listed.every((word) => word.total >= 0)).toBe(true)
    expect(selected.ownedWordCount).toBe(count)
    expect(selected.question).not.toBeNull()
    // hang検出。OQ-012のSLOではない。
    expect(elapsedMs).toBeLessThan(5_000)
  })

  it('苦手集計queryは所有者scopeのwordsを見る', async () => {
    await insertTestUser(env.DB, 'weak-plan')
    const db = createDb(env)
    const query = buildOwnedWeakQuestionQuery(db, 'weak-plan')
    const plan = await env.DB.prepare(`EXPLAIN QUERY PLAN ${query.toSQL().sql}`)
      .bind(...query.toSQL().params)
      .all<{ detail: string }>()
    const details = plan.results.map((row) => row.detail).join('\n')
    expect(details.length).toBeGreaterThan(0)
  })
})

describe('POST /api/v1/study/answers', () => {
  it('未認証は401になる', async () => {
    const response = await SELF.fetch(
      new Request(`${API_BASE}/api/v1/study/answers`, {
        method: 'POST',
        headers: {
          origin: env.BETTER_AUTH_URL,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          wordId: 'w_missing',
          answer: '問題',
          hintUsed: false,
        }),
      }),
    )
    const body: unknown = await response.json()
    expect(response.status).toBe(401)
    expect(body).toMatchObject({ error: { code: 'UNAUTHENTICATED' } })
  })

  it('Origin不一致は403になる', async () => {
    const response = await callAnswers({
      actorUserId: 'answer-origin',
      origin: 'https://evil.test',
      body: { wordId: 'w_x', answer: '問題', hintUsed: false },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(403)
    expect(body).toMatchObject({ error: { code: 'ORIGIN_NOT_ALLOWED' } })
  })

  it('完全一致は201でexactになり、AIを呼ばず履歴と統計へ残る', async () => {
    await insertTestUser(env.DB, 'answer-exact')
    const word = await seedWord({
      actorUserId: 'answer-exact',
      term: 'issue',
      meanings: ['問題', '論点'],
      hint: null,
    })

    const response = await callAnswers({
      actorUserId: 'answer-exact',
      semanticJudge: explodingJudge,
      body: { wordId: word.id, answer: '論点', hintUsed: false },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(201)
    expect(body).toEqual({
      result: {
        id: expect.stringMatching(/^tr_/u),
        wordId: word.id,
        answer: '論点',
        isCorrect: true,
        judgeType: 'exact',
        hintUsed: false,
        meanings: ['問題', '論点'],
        judgedByAi: false,
        answeredAt: expect.any(String),
      },
    })

    const listed = await callListWords('answer-exact')
    const listBody: unknown = await listed.json()
    expect(listBody).toMatchObject({
      items: [
        {
          id: word.id,
          stats: {
            status: 'answered',
            correct: 1,
            total: 1,
            accuracy: 1,
          },
        },
      ],
    })
  })

  it('正規化一致はnormalizedで正解にし、かなカナと句読点を同一視する', async () => {
    await insertTestUser(env.DB, 'answer-normalized')
    const word = await seedWord({
      actorUserId: 'answer-normalized',
      term: 'computer',
      meanings: ['コンピューター'],
      hint: null,
    })

    const response = await callAnswers({
      actorUserId: 'answer-normalized',
      semanticJudge: explodingJudge,
      body: { wordId: word.id, answer: 'こんぴゅーたー！', hintUsed: true },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      result: {
        wordId: word.id,
        answer: 'こんぴゅーたー！',
        isCorrect: true,
        judgeType: 'normalized',
        hintUsed: true,
        judgedByAi: false,
      },
    })
  })

  it('長音の有無だけでは不正解にし、T10ではAIなしで0%として残る', async () => {
    await insertTestUser(env.DB, 'answer-miss')
    const word = await seedWord({
      actorUserId: 'answer-miss',
      term: 'computer',
      meanings: ['コンピュータ'],
      hint: null,
    })

    const response = await callAnswers({
      actorUserId: 'answer-miss',
      body: { wordId: word.id, answer: 'コンピューター', hintUsed: false },
    })
    const body: unknown = await response.json()
    expect(response.status).toBe(201)
    expect(body).toMatchObject({
      result: {
        isCorrect: false,
        judgeType: 'normalized',
        judgedByAi: false,
        meanings: ['コンピュータ'],
      },
    })

    const listed = await callListWords('answer-miss')
    const listBody: unknown = await listed.json()
    expect(listBody).toMatchObject({
      items: [
        {
          id: word.id,
          stats: {
            status: 'answered',
            correct: 0,
            total: 1,
            accuracy: 0,
          },
        },
      ],
    })
  })

  it('他ユーザーの単語は404で、どちらの履歴にも残さない', async () => {
    await insertTestUser(env.DB, 'answer-owner')
    await insertTestUser(env.DB, 'answer-intruder')
    const theirs = await seedWord({
      actorUserId: 'answer-owner',
      term: 'secret',
      meanings: ['秘密'],
      hint: null,
    })

    const response = await callAnswers({
      actorUserId: 'answer-intruder',
      body: { wordId: theirs.id, answer: '秘密', hintUsed: false },
    })
    expect(response.status).toBe(404)
    expect(await response.json()).toMatchObject({
      error: { code: 'WORD_NOT_FOUND' },
    })

    const ownerList = await callListWords('answer-owner')
    expect(await ownerList.json()).toMatchObject({
      items: [{ id: theirs.id, stats: { status: 'unanswered', total: 0 } }],
    })
    const intruderList = await callListWords('answer-intruder')
    expect(await intruderList.json()).toMatchObject({ items: [] })
  })

  it('空白回答と長すぎる回答は422になる', async () => {
    await insertTestUser(env.DB, 'answer-validate')
    const word = await seedWord({
      actorUserId: 'answer-validate',
      term: 'issue',
      meanings: ['問題'],
      hint: null,
    })

    const blank = await callAnswers({
      actorUserId: 'answer-validate',
      body: { wordId: word.id, answer: '   ', hintUsed: false },
    })
    expect(blank.status).toBe(422)
    expect(await blank.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })

    const tooLong = await callAnswers({
      actorUserId: 'answer-validate',
      body: {
        wordId: word.id,
        answer: 'あ'.repeat(501),
        hintUsed: false,
      },
    })
    expect(tooLong.status).toBe(422)
    expect(await tooLong.json()).toMatchObject({
      error: { code: 'VALIDATION_FAILED' },
    })

    const listed = await callListWords('answer-validate')
    expect(await listed.json()).toMatchObject({
      items: [{ id: word.id, stats: { status: 'unanswered', total: 0 } }],
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
