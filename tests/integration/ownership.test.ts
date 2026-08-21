import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/app-error'
import {
  createWord,
  getOwnedWord,
  updateWord,
} from '../../src/features/words/application/manage-word'
import { createAppServices } from '../../src/server/composition-root'
import { insertTestUser } from '../setup/test-builders'

const clock = { nowEpochMs: () => 1_700_000_000_000 }

const createOwnedWord = async (
  userId: string,
  term: string,
  meanings: string[],
) => {
  const services = createAppServices(env)
  return createWord({
    command: {
      actorUserId: userId,
      term,
      meanings,
      hint: null,
    },
    wordRepository: services.wordRepository,
    clock,
  })
}

describe('owner isolation', () => {
  it('他ユーザーの単語は取得・更新できず404相当になる', async () => {
    await insertTestUser(env.DB, 'owner-a')
    await insertTestUser(env.DB, 'owner-b')
    const services = createAppServices(env)
    const wordA = await createOwnedWord('owner-a', 'issue', ['問題'])

    await expect(
      getOwnedWord({
        actorUserId: 'owner-b',
        wordId: wordA.id,
        wordRepository: services.wordRepository,
      }),
    ).rejects.toBeInstanceOf(AppError)

    await expect(
      updateWord({
        command: {
          actorUserId: 'owner-b',
          wordId: wordA.id,
          term: 'hacked',
          meanings: ['不正'],
          hint: null,
        },
        wordRepository: services.wordRepository,
        clock,
      }),
    ).rejects.toBeInstanceOf(AppError)

    const unchanged = await services.wordRepository.findOwnedById(
      'owner-a',
      wordA.id,
    )
    expect(unchanged?.term).toBe('issue')
  })

  it('他ユーザーの単語は一覧に出ず、削除も否定される', async () => {
    await insertTestUser(env.DB, 'list-a')
    await insertTestUser(env.DB, 'list-b')
    const services = createAppServices(env)
    const wordA = await createOwnedWord('list-a', 'apple', ['りんご'])
    await createOwnedWord('list-b', 'orange', ['みかん'])

    const listed = await services.wordRepository.listByOwner({
      ownerUserId: 'list-a',
      cursor: null,
      limit: 20,
    })
    expect(listed.items.map((word) => word.term)).toEqual(['apple'])

    const deleted = await services.wordRepository.deleteOwned(
      'list-b',
      wordA.id,
    )
    expect(deleted).toBe(false)

    const stillOwned = await services.wordRepository.findOwnedById(
      'list-a',
      wordA.id,
    )
    expect(stillOwned?.id).toBe(wordA.id)
  })

  it('履歴なしの自分の単語は削除でき、meaningsはcascadeする', async () => {
    await insertTestUser(env.DB, 'owner-delete')
    const services = createAppServices(env)
    const word = await createOwnedWord('owner-delete', 'issue', [
      '問題',
      '論点',
    ])

    const deleted = await services.wordRepository.deleteOwned(
      'owner-delete',
      word.id,
    )
    expect(deleted).toBe(true)

    const meanings = await env.DB.prepare(
      `SELECT id FROM word_meanings WHERE word_id = ?`,
    )
      .bind(word.id)
      .all()
    expect(meanings.results).toEqual([])
  })
})
