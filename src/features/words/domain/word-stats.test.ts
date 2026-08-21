import { describe, expect, it } from 'vitest'
import { toWordStats } from './word-stats'

describe('toWordStats', () => {
  it('回答0件は未回答でaccuracyはnull', () => {
    expect(toWordStats(0, 0)).toEqual({
      status: 'unanswered',
      correct: 0,
      total: 0,
      accuracy: null,
    })
  })

  it('回答済み0%はansweredでaccuracyは0', () => {
    expect(toWordStats(0, 4)).toEqual({
      status: 'answered',
      correct: 0,
      total: 4,
      accuracy: 0,
    })
  })

  it('正解数/回答数をaccuracyにする', () => {
    expect(toWordStats(1, 2)).toEqual({
      status: 'answered',
      correct: 1,
      total: 2,
      accuracy: 0.5,
    })
  })
})
