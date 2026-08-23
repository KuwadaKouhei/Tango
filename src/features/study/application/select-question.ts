import { AppError } from '../../../platform/app-error'
import type { RandomSource } from '../../../platform/random'
import type { WordRepository } from '../../words/public'
import {
  selectRandomCandidate,
  toExcludedWordIdSet,
} from '../domain/question-selector'
import { STUDY_LIMITS } from '../domain/study-limits'
import type { StudyMode } from '../domain/study-limits'
import type {
  NextStudyQuestion,
  StudyCandidate,
} from '../domain/study-question'

export const selectNextQuestion = async (input: {
  actorUserId: string
  mode: StudyMode
  excludeWordIds: readonly string[]
  wordRepository: WordRepository
  random: RandomSource
}): Promise<NextStudyQuestion> => {
  if (input.mode === 'weak') {
    throw AppError.validation('苦手優先はまだ利用できません。', {
      fields: ['mode'],
    })
  }

  if (input.excludeWordIds.length > STUDY_LIMITS.excludeWordIdsMax) {
    throw AppError.validation(
      `除外する単語は${String(STUDY_LIMITS.excludeWordIdsMax)}件までです。`,
      { fields: ['excludeWordIds'] },
    )
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
  const selected = selectRandomCandidate(
    candidates,
    toExcludedWordIdSet(input.excludeWordIds),
    input.random,
  )

  return {
    ownedWordCount: owned.length,
    question: selected
      ? {
          wordId: selected.wordId,
          term: selected.term,
          hasHint: selected.hasHint,
        }
      : null,
  }
}
