import type { UserId, Word, WordId, NewWord, UpdatedWord } from './word'

export type WordRepository = {
  findOwnedById: (ownerUserId: UserId, wordId: WordId) => Promise<Word | null>
  listByOwner: (ownerUserId: UserId) => Promise<Word[]>
  create: (input: NewWord) => Promise<Word>
  update: (input: UpdatedWord) => Promise<Word>
  deleteOwned: (ownerUserId: UserId, wordId: WordId) => Promise<boolean>
}
