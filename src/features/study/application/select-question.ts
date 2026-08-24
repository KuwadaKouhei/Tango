import { AppError } from '../../../platform/app-error'
import type { RandomSource } from '../../../platform/random'
import type { WordRepository } from '../../words/public'
import {
  selectRandomCandidate,
  selectWeightedCandidate,
  toExcludedWordIdSet,
} from '../domain/question-selector'
import { STUDY_LIMITS } from '../domain/study-limits'
import type { StudyMode } from '../domain/study-limits'
import type {
  NextStudyQuestion,
  StudyCandidate,
  WeightedStudyCandidate,
} from '../domain/study-question'

const toQuestion = (
  candidate: StudyCandidate | WeightedStudyCandidate | null,
): NextStudyQuestion['question'] =>
  candidate
    ? {
        wordId: candidate.wordId,
        term: candidate.term,
        hasHint: candidate.hasHint,
      }
    : null

export const selectNextQuestion = async (input: {
  actorUserId: string
  mode: StudyMode
  excludeWordIds: readonly string[]
  wordRepository: WordRepository
  random: RandomSource
}): Promise<NextStudyQuestion> => {
  if (input.excludeWordIds.length > STUDY_LIMITS.excludeWordIdsMax) {
    throw AppError.validation(
      `除外する単語は${String(STUDY_LIMITS.excludeWordIdsMax)}件までです。`,
      { fields: ['excludeWordIds'] },
    )
  }

  const excluded = toExcludedWordIdSet(input.excludeWordIds)

  if (input.mode === 'weak') {
    const owned = await input.wordRepository.listOwnedWeakQuestionCandidates(
      input.actorUserId,
    )
    if (owned.length === 0) {
      throw AppError.noStudyWords()
    }

    const candidates: WeightedStudyCandidate[] = owned.map((word) => ({
      wordId: word.id,
      term: word.term,
      hasHint: word.hasHint,
      correct: word.correct,
      total: word.total,
    }))

    return {
      ownedWordCount: owned.length,
      question: toQuestion(
        selectWeightedCandidate(candidates, excluded, input.random),
      ),
    }
  }

  const owned = await input.wordRepository.listOwnedQuestionCandidates(
    input.actorUserId,
  )
  if (owned.length === 0) {
    throw AppError.noStudyWords()
  }

  const candidates: StudyCandidate[] = owned.map((word) => ({
    wordId: word.id,
    term: word.term,
    hasHint: word.hasHint,
  }))
  const selected = selectRandomCandidate(candidates, excluded, input.random)

  return {
    ownedWordCount: owned.length,
    question: toQuestion(selected),
  }
}
