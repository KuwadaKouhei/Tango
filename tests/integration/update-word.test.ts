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

const clock = { nowEpochMs: () => 1_700_000_000_123 }

const createOwnedWord = async (
  userId: string,
  term: string,
  meanings: string[],
  hint: string | null = null,
) => {
  const services = createAppServices(env)
  return createWord({
    command: {
      actorUserId: userId,
      term,
      meanings,
      hint,
    },
    wordRepository: services.wordRepository,
    clock,
  })
}

describe('update word', () => {
  it('所有単語の意味とヒントを置換し、保存後も1件以上残る', async () => {
    await insertTestUser(env.DB, 'editor-a')
    const services = createAppServices(env)
    const word = await createOwnedWord(
      'editor-a',
      'issue',
      ['問題'],
      '旧ヒント',
    )

    const updated = await updateWord({
      command: {
        actorUserId: 'editor-a',
        wordId: word.id,
        term: 'issue',
        meanings: ['論点', '問題'],
        hint: '  ',
      },
      wordRepository: services.wordRepository,
      clock: { nowEpochMs: () => 1_700_000_000_999 },
    })

    expect(updated.meanings.map((meaning) => meaning.meaning)).toEqual([
      '論点',
      '問題',
    ])
    expect(updated.hint).toBeNull()
    expect(updated.createdAt).toBe(word.createdAt)
    expect(updated.updatedAt).toBe(1_700_000_000_999)

    const loaded = await getOwnedWord({
      actorUserId: 'editor-a',
      wordId: word.id,
      wordRepository: services.wordRepository,
    })
    expect(loaded.meanings.map((meaning) => meaning.meaning)).toEqual([
      '論点',
      '問題',
    ])
  })

  it('最終meaningを空にすると保存せず元データを残す', async () => {
    await insertTestUser(env.DB, 'editor-empty')
    const services = createAppServices(env)
    const word = await createOwnedWord('editor-empty', 'apple', [
      'りんご',
      'アップル',
    ])

    await expect(
      updateWord({
        command: {
          actorUserId: 'editor-empty',
          wordId: word.id,
          term: 'apple',
          meanings: ['  ', ''],
          hint: null,
        },
        wordRepository: services.wordRepository,
        clock,
      }),
    ).rejects.toBeInstanceOf(AppError)

    const unchanged = await services.wordRepository.findOwnedById(
      'editor-empty',
      word.id,
    )
    expect(unchanged?.meanings.map((meaning) => meaning.meaning)).toEqual([
      'りんご',
      'アップル',
    ])
  })

  it('updateのbatch途中失敗は古いword/meaningsを残す', async () => {
    await insertTestUser(env.DB, 'editor-rollback')
    const services = createAppServices(env)
    const word = await createOwnedWord('editor-rollback', 'issue', ['問題'])

    await expect(
      services.wordRepository.update({
        id: word.id,
        userId: 'editor-rollback',
        term: 'hacked',
        normalizedTerm: 'hacked',
        hint: null,
        createdAt: word.createdAt,
        updatedAt: 1_800_000_000_000,
        meanings: [
          {
            id: 'wm_ok',
            meaning: '論点',
            normalizedMeaning: '論点',
            sortOrder: 0,
          },
          {
            id: 'wm_bad',
            meaning: '   ',
            normalizedMeaning: 'bad',
            sortOrder: 1,
          },
        ],
      }),
    ).rejects.toThrow()

    const unchanged = await services.wordRepository.findOwnedById(
      'editor-rollback',
      word.id,
    )
    expect(unchanged?.term).toBe('issue')
    expect(unchanged?.meanings.map((meaning) => meaning.meaning)).toEqual([
      '問題',
    ])
  })

  it('存在しない単語の更新は404相当で拒否する', async () => {
    await insertTestUser(env.DB, 'editor-missing')
    const services = createAppServices(env)

    await expect(
      updateWord({
        command: {
          actorUserId: 'editor-missing',
          wordId: 'w_missing',
          term: 'ghost',
          meanings: ['幽霊'],
          hint: null,
        },
        wordRepository: services.wordRepository,
        clock,
      }),
    ).rejects.toBeInstanceOf(AppError)
  })
})
