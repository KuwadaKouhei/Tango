import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import type { RandomSource } from '../../../platform/random'
import type { WordRepository } from '../../words/public'
import { selectNextQuestion } from './select-question'

const randomOf = (value: number): RandomSource => ({
  nextUnitInterval: () => value,
})

const repositoryOf = (
  candidates: Awaited<
    ReturnType<WordRepository['listOwnedQuestionCandidates']>
  >,
): WordRepository => ({
  findOwnedById: async () => null,
  findOwnedIdByNormalizedTerm: async () => null,
  listOwnedQuestionCandidates: async () => candidates,
  listByOwner: async () => ({ items: [], nextCursor: null }),
  create: async () => {
    throw new Error('unused')
  },
  update: async () => {
    throw new Error('unused')
  },
  deleteOwned: async () => false,
})

describe('selectNextQuestion', () => {
  it('所有0件はNO_STUDY_WORDSになる', async () => {
    await expect(
      selectNextQuestion({
        actorUserId: 'user-a',
        mode: 'random',
        excludeWordIds: [],
        wordRepository: repositoryOf([]),
        random: randomOf(0),
      }),
    ).rejects.toMatchObject({ code: 'NO_STUDY_WORDS' })
  })

  it('苦手優先はT09では422にする', async () => {
    await expect(
      selectNextQuestion({
        actorUserId: 'user-a',
        mode: 'weak',
        excludeWordIds: [],
        wordRepository: repositoryOf([
          { id: 'w_1', term: 'issue', hasHint: false },
        ]),
        random: randomOf(0),
      }),
    ).rejects.toBeInstanceOf(AppError)
  })

  it('除外で尽きたらquestion nullを返す', async () => {
    const result = await selectNextQuestion({
      actorUserId: 'user-a',
      mode: 'random',
      excludeWordIds: ['w_1'],
      wordRepository: repositoryOf([
        { id: 'w_1', term: 'issue', hasHint: true },
      ]),
      random: randomOf(0),
    })

    expect(result).toEqual({
      ownedWordCount: 1,
      question: null,
    })
  })

  it('randomは所有単語から1件返す', async () => {
    const result = await selectNextQuestion({
      actorUserId: 'user-a',
      mode: 'random',
      excludeWordIds: [],
      wordRepository: repositoryOf([
        { id: 'w_1', term: 'issue', hasHint: true },
      ]),
      random: randomOf(0),
    })

    expect(result).toEqual({
      ownedWordCount: 1,
      question: { wordId: 'w_1', term: 'issue', hasHint: true },
    })
    expect(result.question).not.toHaveProperty('hint')
  })
})
