import type { Clock } from '../../../platform/clock'
import { AppError } from '../../../platform/app-error'
import { createOpaqueId } from '../../../platform/ids'
import {
  emptyToNullHint,
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

export const createWord = async (input: {
  command: CreateWordInput
  wordRepository: WordRepository
  clock: Clock
}): Promise<Word> => {
  const preparedTerm = requirePreparedTerm(input.command.term)
  const preparedMeanings = requirePreparedMeanings(input.command.meanings)
  const now = input.clock.nowEpochMs()
  const wordId = createOpaqueId('w')

  return input.wordRepository.create({
    id: wordId,
    userId: input.command.actorUserId,
    term: preparedTerm.term,
    normalizedTerm: preparedTerm.normalizedTerm,
    hint: emptyToNullHint(input.command.hint),
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
  const now = input.clock.nowEpochMs()

  return input.wordRepository.update({
    id: existing.id,
    userId: input.command.actorUserId,
    term: preparedTerm.term,
    normalizedTerm: preparedTerm.normalizedTerm,
    hint: emptyToNullHint(input.command.hint),
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
