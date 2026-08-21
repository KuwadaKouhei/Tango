import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/app-error'
import { createWord } from '../../src/features/words/application/manage-word'
import { createAppServices } from '../../src/server/composition-root'
import { insertTestUser } from '../setup/test-builders'

const clock = { nowEpochMs: () => 1_700_000_000_000 }

describe('create word', () => {
  it('複数意味と任意ヒントを保存し、空ヒントはNULLになる', async () => {
    await insertTestUser(env.DB, 'creator-a')
    const services = createAppServices(env)
    const word = await createWord({
      command: {
        actorUserId: 'creator-a',
        term: 'issue',
        meanings: ['問題', '論点'],
        hint: '文脈で意味が変わる',
      },
      wordRepository: services.wordRepository,
      clock,
    })

    expect(word.term).toBe('issue')
    expect(word.meanings.map((meaning) => meaning.meaning)).toEqual([
      '問題',
      '論点',
    ])
    expect(word.hint).toBe('文脈で意味が変わる')
    expect(word).not.toHaveProperty('correct')
    expect(word).not.toHaveProperty('total')

    const emptyHint = await createWord({
      command: {
        actorUserId: 'creator-a',
        term: 'apple',
        meanings: ['りんご'],
        hint: '   ',
      },
      wordRepository: services.wordRepository,
      clock,
    })
    expect(emptyHint.hint).toBeNull()
  })

  it('意味0件では保存しない', async () => {
    await insertTestUser(env.DB, 'creator-empty')
    const services = createAppServices(env)

    await expect(
      createWord({
        command: {
          actorUserId: 'creator-empty',
          term: 'issue',
          meanings: ['  '],
          hint: null,
        },
        wordRepository: services.wordRepository,
        clock,
      }),
    ).rejects.toBeInstanceOf(AppError)

    const listed = await services.wordRepository.listByOwner({
      ownerUserId: 'creator-empty',
      cursor: null,
      limit: 20,
    })
    expect(listed.items).toEqual([])
  })

  it('body相当のuserIdでは所有者を切り替えられない', async () => {
    await insertTestUser(env.DB, 'creator-owner')
    await insertTestUser(env.DB, 'creator-other')
    const services = createAppServices(env)
    const word = await createWord({
      command: {
        actorUserId: 'creator-owner',
        term: 'issue',
        meanings: ['問題'],
        hint: null,
      },
      wordRepository: services.wordRepository,
      clock,
    })

    expect(word.userId).toBe('creator-owner')
    const asOther = await services.wordRepository.findOwnedById(
      'creator-other',
      word.id,
    )
    expect(asOther).toBeNull()
  })
})
