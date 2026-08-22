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
  /**
   * OQ-008の重複照合。所有者scope内の正規形一致を1件だけ引く。
   * 更新時に自分自身を除外できるよう、Wordではなくidを返す。
   */
  findOwnedIdByNormalizedTerm: (
    ownerUserId: UserId,
    normalizedTerm: string,
  ) => Promise<WordId | null>
  listByOwner: (input: ListWordsQuery) => Promise<Page<WordWithStats>>
  create: (input: NewWord) => Promise<Word>
  update: (input: UpdatedWord) => Promise<Word>
  deleteOwned: (ownerUserId: UserId, wordId: WordId) => Promise<boolean>
}
