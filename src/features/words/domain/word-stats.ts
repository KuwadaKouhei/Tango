export type WordStatsStatus = 'unanswered' | 'answered'

export type WordStats = {
  status: WordStatsStatus
  correct: number
  total: number
  accuracy: number | null
}

export const toWordStats = (correct: number, total: number): WordStats => {
  if (
    !Number.isInteger(correct) ||
    !Number.isInteger(total) ||
    correct < 0 ||
    total < 0 ||
    correct > total
  ) {
    throw new Error('stats counts must be integers with 0 <= correct <= total')
  }

  if (total === 0) {
    return {
      status: 'unanswered',
      correct: 0,
      total: 0,
      accuracy: null,
    }
  }

  return {
    status: 'answered',
    correct,
    total,
    accuracy: correct / total,
  }
}
