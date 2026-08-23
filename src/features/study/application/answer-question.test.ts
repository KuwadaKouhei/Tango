import { describe, expect, it, vi } from 'vitest'
import type { TestResult, TestResultRepository } from '../../history/public'
import type { Word, WordRepository } from '../../words/public'
import { answerQuestion } from './answer-question'
import type { SemanticJudge } from '../domain/semantic-judge'

const wordOf = (meanings: readonly string[]): Word => ({
  id: 'w_1',
  userId: 'user-a',
  term: 'issue',
  normalizedTerm: 'issue',
  hint: '文脈で意味が変わる',
  meanings: meanings.map((meaning, index) => ({
    id: `wm_${String(index)}`,
    meaning,
    normalizedMeaning: meaning,
    sortOrder: index,
    createdAt: 1,
    updatedAt: 1,
  })),
  createdAt: 1,
  updatedAt: 1,
})

const wordRepositoryOf = (word: Word | null): WordRepository => ({
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

const recordingRepository = (): {
  repository: TestResultRepository
  saved: TestResult[]
} => {
  const saved: TestResult[] = []
  return {
    saved,
    repository: {
      append: async (result) => {
        saved.push(result)
        return result
      },
      listByOwner: async () => saved,
    },
  }
}

const unusedSemanticJudge: SemanticJudge = {
  judge: async () => {
    throw new Error('SemanticJudge must not be called')
  },
}

describe('answerQuestion', () => {
  it('exact一致はAIを呼ばず履歴へ保存する', async () => {
    const { repository, saved } = recordingRepository()
    const judge = vi.fn(unusedSemanticJudge.judge)

    const result = await answerQuestion({
      actorUserId: 'user-a',
      wordId: 'w_1',
      answer: '  問題  ',
      hintUsed: true,
      wordRepository: wordRepositoryOf(wordOf(['問題', '論点'])),
      testResultRepository: repository,
      clock: { nowEpochMs: () => 1_700_000_000_000 },
      semanticJudge: { judge },
    })

    expect(result).toMatchObject({
      wordId: 'w_1',
      answer: '問題',
      isCorrect: true,
      judgeType: 'exact',
      hintUsed: true,
      meanings: ['問題', '論点'],
      judgedByAi: false,
      answeredAtEpochMs: 1_700_000_000_000,
    })
    expect(result.id.startsWith('tr_')).toBe(true)
    expect(judge).not.toHaveBeenCalled()
    expect(saved).toHaveLength(1)
    expect(saved[0]).toMatchObject({
      userId: 'user-a',
      judgeProvider: null,
      judgeModel: null,
      promptVersion: null,
    })
  })

  it('normalized一致でもAIを呼ばない', async () => {
    const { repository } = recordingRepository()
    const judge = vi.fn(unusedSemanticJudge.judge)

    const result = await answerQuestion({
      actorUserId: 'user-a',
      wordId: 'w_1',
      answer: 'もんだい。',
      hintUsed: false,
      wordRepository: wordRepositoryOf(wordOf(['問題'])),
      testResultRepository: repository,
      clock: { nowEpochMs: () => 10 },
      semanticJudge: { judge },
    })

    expect(result.judgeType).toBe('normalized')
    expect(result.isCorrect).toBe(true)
    expect(result.judgedByAi).toBe(false)
    expect(judge).not.toHaveBeenCalled()
  })

  it('T10でport未注入の不一致は不正解としてnormalizedで保存する', async () => {
    const { repository, saved } = recordingRepository()

    const result = await answerQuestion({
      actorUserId: 'user-a',
      wordId: 'w_1',
      answer: '全然違う',
      hintUsed: false,
      wordRepository: wordRepositoryOf(wordOf(['問題'])),
      testResultRepository: repository,
      clock: { nowEpochMs: () => 20 },
      semanticJudge: null,
    })

    expect(result).toMatchObject({
      isCorrect: false,
      judgeType: 'normalized',
      judgedByAi: false,
    })
    expect(saved[0]?.judgeProvider).toBeNull()
  })

  it('不一致かつportがあるときだけSemanticJudgeを1回呼ぶ', async () => {
    const { repository } = recordingRepository()
    const judge = vi.fn(async () => ({
      isCorrect: true,
      provider: 'workers-ai',
      model: 'test-model',
      promptVersion: 'v1',
    }))

    const result = await answerQuestion({
      actorUserId: 'user-a',
      wordId: 'w_1',
      answer: '全然違う',
      hintUsed: false,
      wordRepository: wordRepositoryOf(wordOf(['問題'])),
      testResultRepository: repository,
      clock: { nowEpochMs: () => 30 },
      semanticJudge: { judge },
    })

    expect(judge).toHaveBeenCalledTimes(1)
    expect(judge).toHaveBeenCalledWith({
      term: 'issue',
      answer: '全然違う',
      meanings: ['問題'],
    })
    expect(result).toMatchObject({
      isCorrect: true,
      judgeType: 'ai',
      judgedByAi: true,
    })
  })

  it('非所有・未存在は404で履歴を書かない', async () => {
    const { repository, saved } = recordingRepository()

    await expect(
      answerQuestion({
        actorUserId: 'user-a',
        wordId: 'w_missing',
        answer: '問題',
        hintUsed: false,
        wordRepository: wordRepositoryOf(null),
        testResultRepository: repository,
        clock: { nowEpochMs: () => 40 },
        semanticJudge: null,
      }),
    ).rejects.toMatchObject({ code: 'WORD_NOT_FOUND' })
    expect(saved).toHaveLength(0)
  })
})
