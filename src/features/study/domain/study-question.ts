export type StudyCandidate = {
  wordId: string
  term: string
  hasHint: boolean
}

export type WeightedStudyCandidate = StudyCandidate & {
  correct: number
  total: number
}

export type StudyQuestion = {
  wordId: string
  term: string
  hasHint: boolean
}

export type NextStudyQuestion = {
  ownedWordCount: number
  question: StudyQuestion | null
}
