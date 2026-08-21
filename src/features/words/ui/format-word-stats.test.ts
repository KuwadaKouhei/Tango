import { describe, expect, it } from 'vitest'
import { formatWordStatsLabel } from './format-word-stats'

describe('formatWordStatsLabel', () => {
  it('未回答と0%を文字で区別する', () => {
    expect(
      formatWordStatsLabel({
        status: 'unanswered',
        correct: 0,
        total: 0,
        accuracy: null,
      }),
    ).toBe('未回答')
    expect(
      formatWordStatsLabel({
        status: 'answered',
        correct: 0,
        total: 2,
        accuracy: 0,
      }),
    ).toBe('正解率 0%（正解 0 / 回答 2）')
  })
})
