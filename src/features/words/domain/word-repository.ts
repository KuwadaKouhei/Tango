import type {
  UserId,
  Word,
  WordId,
  NewWord,
  UpdatedWord,
  WordWithStats,
} from './word'
import type { Page, WordListCursor } from './word-list-page'
import type { WordListSearchNeedles } from './word-list-search'

export type ListWordsQuery = {
  ownerUserId: UserId
  cursor: WordListCursor | null
  limit: number
  search?: WordListSearchNeedles | null
}

export type OwnedQuestionCandidate = {
  id: WordId
  term: string
  hasHint: boolean
}

export type WordRepository = {
  findOwnedById: (ownerUserId: UserId, wordId: WordId) => Promise<Word | null>
  /**
   * 出題用。意味とヒント本文は載せない。所有単語だけを返す。
   */
  listOwnedQuestionCandidates: (
    ownerUserId: UserId,
  ) => Promise<OwnedQuestionCandidate[]>
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
