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

  it('全問正解でないときに100%と表示しない', () => {
    expect(
      formatWordStatsLabel({
        status: 'answered',
        correct: 249,
        total: 250,
        accuracy: 249 / 250,
      }),
    ).toBe('正解率 99%（正解 249 / 回答 250）')
    expect(
      formatWordStatsLabel({
        status: 'answered',
        correct: 3,
        total: 3,
        accuracy: 1,
      }),
    ).toBe('正解率 100%（正解 3 / 回答 3）')
  })
})
