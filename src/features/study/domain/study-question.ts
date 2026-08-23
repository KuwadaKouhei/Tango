export type StudyCandidate = {
  wordId: string
  term: string
  hasHint: boolean
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
