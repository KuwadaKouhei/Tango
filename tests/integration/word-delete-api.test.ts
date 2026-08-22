import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { apiErrorSchema } from '../../src/features/words/api/word-schemas'
import { createWord } from '../../src/features/words/application/manage-word'
import { createOpaqueId } from '../../src/platform/ids'
import { createAppServices } from '../../src/server/composition-root'
import { createSignedInApi } from '../setup/signed-in-api'
import { insertTestUser } from '../setup/test-builders'

const API_BASE = 'https://tango.test'

const seedWord = async (input: {
  actorUserId: string
  term: string
  meanings: string[]
}) => {
  const services = createAppServices(env)
  return createWord({
    command: {
      actorUserId: input.actorUserId,
      term: input.term,
      meanings: input.meanings,
      hint: null,
    },
    wordRepository: services.wordRepository,
    clock: { nowEpochMs: () => 1_700_000_000_000 },
  })
}

const appendHistory = async (input: {
  actorUserId: string
  wordId: string
  answer: string
}) => {
  const services = createAppServices(env)
  await services.testResultRepository.append({
    id: createOpaqueId('tr'),
    userId: input.actorUserId,
    wordId: input.wordId,
    answer: input.answer,
    isCorrect: true,
    judgeType: 'exact',
    hintUsed: false,
    judgeProvider: null,
    judgeModel: null,
    promptVersion: null,
    createdAt: 1_700_000_000_000,
  })
}

const callDelete = async (input: {
  actorUserId: string
  wordId: string
  origin?: string
}) => {
  const headers = new Headers({
    origin: input.origin ?? env.BETTER_AUTH_URL,
  })

  return createSignedInApi(input.actorUserId).fetch(
    new Request(
      `${API_BASE}/api/v1/words/${encodeURIComponent(input.wordId)}`,
      {
        method: 'DELETE',
        headers,
      },
    ),
    env,
  )
}

const countHistory = async (wordId: string): Promise<number> => {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM test_results WHERE word_id = ?`,
  )
    .bind(wordId)
    .first<{ n: number }>()
  return Number(row?.n ?? 0)
}

const countMeanings = async (wordId: string): Promise<number> => {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM word_meanings WHERE word_id = ?`,
  )
    .bind(wordId)
    .first<{ n: number }>()
  return Number(row?.n ?? 0)
}

describe('DELETE /api/v1/words/:wordId', () => {
  it('履歴なしの単語を204で消し、meaningsも残らない', async () => {
    await insertTestUser(env.DB, 'del-plain')
    const word = await seedWord({
      actorUserId: 'del-plain',
      term: 'plain',
      meanings: ['平易な'],
    })

    const response = await callDelete({
      actorUserId: 'del-plain',
      wordId: word.id,
    })

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    const services = createAppServices(env)
    expect(
      await services.wordRepository.findOwnedById('del-plain', word.id),
    ).toBe(null)
    expect(await countMeanings(word.id)).toBe(0)
  })

  it('履歴ありの単語も消し、test_resultsが残らない', async () => {
    await insertTestUser(env.DB, 'del-history')
    const word = await seedWord({
      actorUserId: 'del-history',
      term: 'history',
      meanings: ['歴史'],
    })
    await appendHistory({
      actorUserId: 'del-history',
      wordId: word.id,
      answer: '歴史',
    })
    expect(await countHistory(word.id)).toBe(1)

    const response = await callDelete({
      actorUserId: 'del-history',
      wordId: word.id,
    })

    expect(response.status).toBe(204)
    expect(await countHistory(word.id)).toBe(0)
    expect(await countMeanings(word.id)).toBe(0)
    const listed = await createAppServices(env).wordRepository.listByOwner({
      ownerUserId: 'del-history',
      cursor: null,
      limit: 20,
    })
    expect(listed.items.map((item) => item.id)).not.toContain(word.id)
  })

  it('未存在も非所有も404 WORD_NOT_FOUNDで区別しない', async () => {
    await insertTestUser(env.DB, 'del-owner')
    await insertTestUser(env.DB, 'del-other')
    const word = await seedWord({
      actorUserId: 'del-owner',
      term: 'secret',
      meanings: ['秘密'],
    })

    const missing = await callDelete({
      actorUserId: 'del-owner',
      wordId: 'w_missing',
    })
    const foreign = await callDelete({
      actorUserId: 'del-other',
      wordId: word.id,
    })

    expect(missing.status).toBe(404)
    expect(foreign.status).toBe(404)
    const missingBody = apiErrorSchema.parse(await missing.json())
    const foreignBody = apiErrorSchema.parse(await foreign.json())
    expect(missingBody.error.code).toBe('WORD_NOT_FOUND')
    expect(foreignBody.error.code).toBe('WORD_NOT_FOUND')
    expect(foreignBody.error.message).toBe(missingBody.error.message)

    const stillThere = await createAppServices(
      env,
    ).wordRepository.findOwnedById('del-owner', word.id)
    expect(stillThere?.id).toBe(word.id)
    expect(await countMeanings(word.id)).toBe(1)
  })

  it('Origin不一致は403で消さない', async () => {
    await insertTestUser(env.DB, 'del-origin')
    const word = await seedWord({
      actorUserId: 'del-origin',
      term: 'origin',
      meanings: ['起点'],
    })

    const response = await callDelete({
      actorUserId: 'del-origin',
      wordId: word.id,
      origin: 'https://evil.test',
    })

    expect(response.status).toBe(403)
    const parsed = apiErrorSchema.parse(await response.json())
    expect(parsed.error.code).toBe('ORIGIN_NOT_ALLOWED')
    const stillThere = await createAppServices(
      env,
    ).wordRepository.findOwnedById('del-origin', word.id)
    expect(stillThere?.id).toBe(word.id)
  })
})
