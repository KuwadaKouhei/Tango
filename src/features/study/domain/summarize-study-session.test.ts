import { describe, expect, it } from 'vitest'
import { summarizeStudySession } from './summarize-study-session'
import type { StudySessionItem } from './summarize-study-session'

const item = (
  term: string,
  isCorrect: boolean,
  wordId = `w_${term}`,
): StudySessionItem => ({
  wordId,
  term,
  isCorrect,
})

describe('summarizeStudySession', () => {
  it('0問は出題数0・正解率nullにする', () => {
    expect(summarizeStudySession([])).toEqual({
      askedCount: 0,
      correctCount: 0,
      accuracy: null,
      items: [],
    })
  })

  it('今回の出題数・正解数・正解率を判定応答から算出する', () => {
    const items = [
      item('issue', true),
      item('computer', false),
      item('child', true),
    ]
    expect(summarizeStudySession(items)).toEqual({
      askedCount: 3,
      correctCount: 2,
      accuracy: 2 / 3,
      items,
    })
  })

  it('全問正解は1、全問不正解は0にする', () => {
    expect(summarizeStudySession([item('a', true), item('b', true)])).toMatchObject({
      askedCount: 2,
      correctCount: 2,
      accuracy: 1,
    })
    expect(
      summarizeStudySession([item('a', false), item('b', false)]),
    ).toMatchObject({
      askedCount: 2,
      correctCount: 0,
      accuracy: 0,
    })
  })
})
