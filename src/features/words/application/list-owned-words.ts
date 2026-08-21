import { AppError } from '../../../platform/app-error'
import { decodeWordListCursor } from '../domain/word-list-cursor'
import { WORD_LIST_PAGE } from '../domain/word-list-page'
import type { Page } from '../domain/word-list-page'
import type { WordWithStats } from '../domain/word'
import type { WordRepository } from '../domain/word-repository'

export const listOwnedWords = async (input: {
  actorUserId: string
  cursor: string | null
  limit: number | null
  wordRepository: WordRepository
}): Promise<Page<WordWithStats>> => {
  const limit = input.limit ?? WORD_LIST_PAGE.defaultLimit
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > WORD_LIST_PAGE.maxLimit
  ) {
    throw AppError.validation(
      `一覧は1件から${String(WORD_LIST_PAGE.maxLimit)}件までです。`,
      { field: 'limit' },
    )
  }

  const cursor =
    input.cursor === null ? null : decodeWordListCursor(input.cursor)

  return input.wordRepository.listByOwner({
    ownerUserId: input.actorUserId,
    cursor,
    limit,
  })
}
