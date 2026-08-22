import type { Clock } from '../../../platform/clock'
import { AppError } from '../../../platform/app-error'
import { createOpaqueId } from '../../../platform/ids'
import {
  requirePreparedHint,
  requirePreparedMeanings,
  requirePreparedTerm,
} from '../domain/prepare-word'
import type { Word } from '../domain/word'
import type { WordRepository } from '../domain/word-repository'

export type CreateWordInput = {
  actorUserId: string
  term: string
  meanings: string[]
  hint: string | null
}

/**
 * OQ-008の事前照合。分かりやすいerrorを返すためのもので、真値はDBのUNIQUE制約。
 * ここを通過しても同時実行で衝突しうるので、repository側でも同じ409へ変換する。
 * keepWordIdは更新時に自分自身を重複扱いしないための除外指定。
 */
const requireNoDuplicateTerm = async (input: {
  actorUserId: string
  normalizedTerm: string
  keepWordId?: string
  wordRepository: WordRepository
}): Promise<void> => {
  const duplicatedId = await input.wordRepository.findOwnedIdByNormalizedTerm(
    input.actorUserId,
    input.normalizedTerm,
  )

  if (duplicatedId && duplicatedId !== input.keepWordId) {
    throw AppError.wordDuplicate(duplicatedId)
  }
}

export const createWord = async (input: {
  command: CreateWordInput
  wordRepository: WordRepository
  clock: Clock
}): Promise<Word> => {
  const preparedTerm = requirePreparedTerm(input.command.term)
  const preparedMeanings = requirePreparedMeanings(input.command.meanings)
  await requireNoDuplicateTerm({
    actorUserId: input.command.actorUserId,
    normalizedTerm: preparedTerm.normalizedTerm,
    wordRepository: input.wordRepository,
  })
  const now = input.clock.nowEpochMs()
  const wordId = createOpaqueId('w')

  return input.wordRepository.create({
    id: wordId,
    userId: input.command.actorUserId,
    term: preparedTerm.term,
    normalizedTerm: preparedTerm.normalizedTerm,
    hint: requirePreparedHint(input.command.hint),
    createdAt: now,
    updatedAt: now,
    meanings: preparedMeanings.map((meaning) => ({
      id: createOpaqueId('wm'),
      meaning: meaning.meaning,
      normalizedMeaning: meaning.normalizedMeaning,
      sortOrder: meaning.sortOrder,
    })),
  })
}

export const getOwnedWord = async (input: {
  actorUserId: string
  wordId: string
  wordRepository: WordRepository
}): Promise<Word> => {
  const word = await input.wordRepository.findOwnedById(
    input.actorUserId,
    input.wordId,
  )
  if (!word) {
    throw AppError.wordNotFound()
  }

  return word
}

export const updateWord = async (input: {
  command: CreateWordInput & { wordId: string }
  wordRepository: WordRepository
  clock: Clock
}): Promise<Word> => {
  const existing = await input.wordRepository.findOwnedById(
    input.command.actorUserId,
    input.command.wordId,
  )
  if (!existing) {
    throw AppError.wordNotFound()
  }

  const preparedTerm = requirePreparedTerm(input.command.term)
  const preparedMeanings = requirePreparedMeanings(input.command.meanings)
  await requireNoDuplicateTerm({
    actorUserId: input.command.actorUserId,
    normalizedTerm: preparedTerm.normalizedTerm,
    keepWordId: existing.id,
    wordRepository: input.wordRepository,
  })
  const now = input.clock.nowEpochMs()

  return input.wordRepository.update({
    id: existing.id,
    userId: input.command.actorUserId,
    term: preparedTerm.term,
    normalizedTerm: preparedTerm.normalizedTerm,
    hint: requirePreparedHint(input.command.hint),
    createdAt: existing.createdAt,
    updatedAt: now,
    meanings: preparedMeanings.map((meaning) => ({
      id: createOpaqueId('wm'),
      meaning: meaning.meaning,
      normalizedMeaning: meaning.normalizedMeaning,
      sortOrder: meaning.sortOrder,
    })),
  })
}

/**
 * 履歴の明示削除はしない。OQ-009のCASCADEが原子性を担う。
 */
export const deleteOwnedWord = async (input: {
  actorUserId: string
  wordId: string
  wordRepository: WordRepository
}): Promise<void> => {
  const deleted = await input.wordRepository.deleteOwned(
    input.actorUserId,
    input.wordId,
  )
  if (!deleted) {
    throw AppError.wordNotFound()
  }
}
