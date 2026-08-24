import { AppError, isAppError } from '../../../platform/app-error'
import type { Clock } from '../../../platform/clock'
import { createOpaqueId } from '../../../platform/ids'
import type { JudgeType, TestResultRepository } from '../../history/public'
import type { WordRepository } from '../../words/public'
import { judgeAnswerLocally } from '../domain/answer-judge'
import { requirePreparedAnswer } from '../domain/prepare-answer'
import type { SemanticJudge } from '../domain/semantic-judge'

const rejectWhenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    const fail = (): void => {
      reject(AppError.aiJudgeUnavailable())
    }
    if (signal.aborted) {
      fail()
      return
    }
    signal.addEventListener('abort', fail, { once: true })
  })

const mapJudgeFailure = (error: unknown): never => {
  if (isAppError(error)) {
    throw error
  }
  if (error instanceof Error && error.name === 'AbortError') {
    throw AppError.aiJudgeUnavailable(error)
  }
  throw error
}

export type AnsweredQuestion = {
  id: string
  wordId: string
  answer: string
  isCorrect: boolean
  judgeType: JudgeType
  hintUsed: boolean
  meanings: string[]
  judgedByAi: boolean
  answeredAtEpochMs: number
}

type PersistedJudgement =
  | {
      isCorrect: true
      judgeType: 'exact' | 'normalized'
      judgedByAi: false
      judgeProvider: null
      judgeModel: null
      promptVersion: null
    }
  | {
      isCorrect: false
      judgeType: 'normalized'
      judgedByAi: false
      judgeProvider: null
      judgeModel: null
      promptVersion: null
    }
  | {
      isCorrect: boolean
      judgeType: 'ai'
      judgedByAi: true
      judgeProvider: string
      judgeModel: string
      promptVersion: string
    }

const localMissWithoutAi = (): PersistedJudgement => ({
  isCorrect: false,
  judgeType: 'normalized',
  judgedByAi: false,
  judgeProvider: null,
  judgeModel: null,
  promptVersion: null,
})

const resolveJudgement = async (input: {
  term: string
  answer: string
  meanings: readonly string[]
  semanticJudge: SemanticJudge | null
  signal: AbortSignal
}): Promise<PersistedJudgement> => {
  const local = judgeAnswerLocally(input.answer, input.meanings)
  if (local.isCorrect) {
    return {
      isCorrect: true,
      judgeType: local.judgeType,
      judgedByAi: false,
      judgeProvider: null,
      judgeModel: null,
      promptVersion: null,
    }
  }

  if (input.semanticJudge === null) {
    return localMissWithoutAi()
  }

  try {
    const ai = await Promise.race([
      input.semanticJudge.judge(
        {
          term: input.term,
          answer: input.answer,
          meanings: input.meanings,
        },
        input.signal,
      ),
      rejectWhenAborted(input.signal),
    ])
    return {
      isCorrect: ai.isCorrect,
      judgeType: 'ai',
      judgedByAi: true,
      judgeProvider: ai.provider,
      judgeModel: ai.model,
      promptVersion: ai.promptVersion,
    }
  } catch (error) {
    throw mapJudgeFailure(error)
  }
}

export const answerQuestion = async (input: {
  actorUserId: string
  wordId: string
  answer: string
  hintUsed: boolean
  wordRepository: WordRepository
  testResultRepository: TestResultRepository
  clock: Clock
  semanticJudge: SemanticJudge | null
  signal: AbortSignal
}): Promise<AnsweredQuestion> => {
  const answer = requirePreparedAnswer(input.answer)
  const word = await input.wordRepository.findOwnedById(
    input.actorUserId,
    input.wordId,
  )
  if (!word) {
    throw AppError.wordNotFound()
  }

  const meanings = word.meanings.map((meaning) => meaning.meaning)
  const judgement = await resolveJudgement({
    term: word.term,
    answer,
    meanings,
    semanticJudge: input.semanticJudge,
    signal: input.signal,
  })

  const saved = await input.testResultRepository.append({
    id: createOpaqueId('tr'),
    userId: input.actorUserId,
    wordId: word.id,
    answer,
    isCorrect: judgement.isCorrect,
    judgeType: judgement.judgeType,
    hintUsed: input.hintUsed,
    judgeProvider: judgement.judgeProvider,
    judgeModel: judgement.judgeModel,
    promptVersion: judgement.promptVersion,
    createdAt: input.clock.nowEpochMs(),
  })

  return {
    id: saved.id,
    wordId: saved.wordId,
    answer: saved.answer,
    isCorrect: saved.isCorrect,
    judgeType: saved.judgeType,
    hintUsed: saved.hintUsed,
    meanings,
    judgedByAi: judgement.judgedByAi,
    answeredAtEpochMs: saved.createdAt,
  }
}
