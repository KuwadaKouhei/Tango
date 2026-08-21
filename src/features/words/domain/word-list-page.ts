/**
 * OQ-012 の性能目標は未決。DESIGNの初期候補を実装の防御値としてだけ使う。
 */
export const WORD_LIST_PAGE = {
  defaultLimit: 20,
  maxLimit: 100,
} as const

export type WordListCursor = {
  createdAt: number
  id: string
}

export type Page<T> = {
  items: T[]
  nextCursor: string | null
}
