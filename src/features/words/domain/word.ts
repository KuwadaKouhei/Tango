export type UserId = string
export type WordId = string

export type WordMeaning = {
  id: string
  meaning: string
  normalizedMeaning: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export type Word = {
  id: WordId
  userId: UserId
  term: string
  normalizedTerm: string
  hint: string | null
  meanings: WordMeaning[]
  createdAt: number
  updatedAt: number
}

export type NewWordMeaning = {
  id: string
  meaning: string
  normalizedMeaning: string
  sortOrder: number
}

export type NewWord = {
  id: WordId
  userId: UserId
  term: string
  normalizedTerm: string
  hint: string | null
  meanings: NewWordMeaning[]
  createdAt: number
  updatedAt: number
}

export type UpdatedWord = NewWord
