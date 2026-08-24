import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import type { RandomSource } from '../../../platform/random'
import type {
  OwnedQuestionCandidate,
  OwnedWeakQuestionCandidate,
  WordRepository,
} from '../../words/public'
import { selectNextQuestion } from './select-question'

const randomOf = (value: number): RandomSource => ({
  nextUnitInterval: () => value,
})

const repositoryOf = (input: {
  randomCandidates?: OwnedQuestionCandidate[]
  weakCandidates?: OwnedWeakQuestionCandidate[]
}): WordRepository => ({
  findOwnedById: async () => null,
  findOwnedIdByNormalizedTerm: async () => null,
  listOwnedQuestionCandidates: async () => {
    if (!input.randomCandidates) {
      throw new Error('random candidates must not be loaded')
    }
    return input.randomCandidates
  },
  listOwnedWeakQuestionCandidates: async () => {
    if (!input.weakCandidates) {
      throw new Error('weak candidates must not be loaded')
    }
    return input.weakCandidates
  },
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
        wordRepository: repositoryOf({ randomCandidates: [] }),
        random: randomOf(0),
      }),
    ).rejects.toMatchObject({ code: 'NO_STUDY_WORDS' })
  })

  it('苦手優先の所有0件もNO_STUDY_WORDSになる', async () => {
    await expect(
      selectNextQuestion({
        actorUserId: 'user-a',
        mode: 'weak',
        excludeWordIds: [],
        wordRepository: repositoryOf({ weakCandidates: [] }),
        random: randomOf(0),
      }),
    ).rejects.toMatchObject({ code: 'NO_STUDY_WORDS' })
  })

  it('除外で尽きたらquestion nullを返す', async () => {
    const result = await selectNextQuestion({
      actorUserId: 'user-a',
      mode: 'random',
      excludeWordIds: ['w_1'],
      wordRepository: repositoryOf({
        randomCandidates: [{ id: 'w_1', term: 'issue', hasHint: true }],
      }),
      random: randomOf(0),
    })

    expect(result).toEqual({
      ownedWordCount: 1,
      question: null,
    })
  })

  it('randomは所有単語から1件返し、苦手集計は呼ばない', async () => {
    const result = await selectNextQuestion({
      actorUserId: 'user-a',
      mode: 'random',
      excludeWordIds: [],
      wordRepository: repositoryOf({
        randomCandidates: [{ id: 'w_1', term: 'issue', hasHint: true }],
      }),
      random: randomOf(0),
    })

    expect(result).toEqual({
      ownedWordCount: 1,
      question: { wordId: 'w_1', term: 'issue', hasHint: true },
    })
    expect(result.question).not.toHaveProperty('hint')
  })

  it('weakは重みに従って低正解率側を選び、random一覧は呼ばない', async () => {
    const result = await selectNextQuestion({
      actorUserId: 'user-a',
      mode: 'weak',
      excludeWordIds: [],
      wordRepository: repositoryOf({
        weakCandidates: [
          {
            id: 'w_strong',
            term: 'strong',
            hasHint: true,
            correct: 2,
            total: 2,
          },
          {
            id: 'w_weak',
            term: 'weak',
            hasHint: false,
            correct: 0,
            total: 2,
          },
        ],
      }),
      random: randomOf(0.1),
    })

    expect(result).toEqual({
      ownedWordCount: 2,
      question: { wordId: 'w_weak', term: 'weak', hasHint: false },
    })
  })

  it('weakも除外で尽きたらquestion nullを返す', async () => {
    const result = await selectNextQuestion({
      actorUserId: 'user-a',
      mode: 'weak',
      excludeWordIds: ['w_weak'],
      wordRepository: repositoryOf({
        weakCandidates: [
          {
            id: 'w_weak',
            term: 'weak',
            hasHint: false,
            correct: 0,
            total: 0,
          },
        ],
      }),
      random: randomOf(0),
    })

    expect(result).toEqual({
      ownedWordCount: 1,
      question: null,
    })
  })

  it('長すぎる除外は422にする', async () => {
    await expect(
      selectNextQuestion({
        actorUserId: 'user-a',
        mode: 'weak',
        excludeWordIds: Array.from(
          { length: 501 },
          (_, index) => `w_${String(index)}`,
        ),
        wordRepository: repositoryOf({
          weakCandidates: [
            { id: 'w_1', term: 'issue', hasHint: false, correct: 0, total: 0 },
          ],
        }),
        random: randomOf(0),
      }),
    ).rejects.toBeInstanceOf(AppError)
  })
})
