import { describe, expect, it } from 'vitest'
import type { Word, WordRepository } from '../../words/public'
import { getOwnedHint } from './get-hint'

const wordOf = (hint: string | null): Word => ({
  id: 'w_1',
  userId: 'user-a',
  term: 'issue',
  normalizedTerm: 'issue',
  hint,
  meanings: [],
  createdAt: 1,
  updatedAt: 1,
})

const repositoryOf = (word: Word | null): WordRepository => ({
  findOwnedById: async () => word,
  findOwnedIdByNormalizedTerm: async () => null,
  listOwnedQuestionCandidates: async () => [],
  listByOwner: async () => ({ items: [], nextCursor: null }),
  create: async () => {
    throw new Error('unused')
  },
  update: async () => {
    throw new Error('unused')
  },
  deleteOwned: async () => false,
})

describe('getOwnedHint', () => {
  it('所有単語のヒント本文を返す', async () => {
    await expect(
      getOwnedHint({
        actorUserId: 'user-a',
        wordId: 'w_1',
        wordRepository: repositoryOf(wordOf('文脈で意味が変わる')),
      }),
    ).resolves.toEqual({ hint: '文脈で意味が変わる' })
  })

  it('無い・非所有・ヒント無しは404にする', async () => {
    await expect(
      getOwnedHint({
        actorUserId: 'user-a',
        wordId: 'w_1',
        wordRepository: repositoryOf(null),
      }),
    ).rejects.toMatchObject({ code: 'WORD_NOT_FOUND' })

    await expect(
      getOwnedHint({
        actorUserId: 'user-a',
        wordId: 'w_1',
        wordRepository: repositoryOf(wordOf(null)),
      }),
    ).rejects.toMatchObject({ code: 'WORD_NOT_FOUND' })
  })
})
