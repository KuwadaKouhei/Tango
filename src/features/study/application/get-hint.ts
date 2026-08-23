import { AppError } from '../../../platform/app-error'
import type { WordRepository } from '../../words/public'

export const getOwnedHint = async (input: {
  actorUserId: string
  wordId: string
  wordRepository: WordRepository
}): Promise<{ hint: string }> => {
  const word = await input.wordRepository.findOwnedById(
    input.actorUserId,
    input.wordId,
  )
  if (!word || word.hint === null) {
    throw AppError.wordNotFound()
  }

  return { hint: word.hint }
}
