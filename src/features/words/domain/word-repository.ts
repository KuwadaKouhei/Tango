import type {
  UserId,
  Word,
  WordId,
  NewWord,
  UpdatedWord,
  WordWithStats,
} from './word'
import type { Page, WordListCursor } from './word-list-page'

export type ListWordsQuery = {
  ownerUserId: UserId
  cursor: WordListCursor | null
  limit: number
}

export type WordRepository = {
  findOwnedById: (ownerUserId: UserId, wordId: WordId) => Promise<Word | null>
  listByOwner: (input: ListWordsQuery) => Promise<Page<WordWithStats>>
  create: (input: NewWord) => Promise<Word>
  update: (input: UpdatedWord) => Promise<Word>
  deleteOwned: (ownerUserId: UserId, wordId: WordId) => Promise<boolean>
}
