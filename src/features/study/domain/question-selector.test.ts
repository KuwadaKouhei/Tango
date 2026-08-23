import { describe, expect, it } from 'vitest'
import type { RandomSource } from '../../../platform/random'
import {
  remainingStudyCandidates,
  selectRandomCandidate,
  toExcludedWordIdSet,
} from './question-selector'
import type { StudyCandidate } from './study-question'

const candidates: StudyCandidate[] = [
  { wordId: 'w_a', term: 'alpha', hasHint: false },
  { wordId: 'w_b', term: 'bravo', hasHint: true },
  { wordId: 'w_c', term: 'charlie', hasHint: false },
]

const randomOf = (value: number): RandomSource => ({
  nextUnitInterval: () => value,
})

describe('selectRandomCandidate', () => {
  it('除外済みと重複IDを除いた残りから選ぶ', () => {
    const excluded = toExcludedWordIdSet(['w_a', 'w_a', 'unknown'])
    expect(remainingStudyCandidates(candidates, excluded)).toEqual([
      candidates[1],
      candidates[2],
    ])
  })

  it('残り0件はnullになる', () => {
    const excluded = toExcludedWordIdSet(['w_a', 'w_b', 'w_c'])
    expect(selectRandomCandidate(candidates, excluded, randomOf(0))).toBeNull()
  })

  it('unit 0 は先頭の残りを返す', () => {
    expect(
      selectRandomCandidate(candidates, toExcludedWordIdSet([]), randomOf(0)),
    ).toEqual(candidates[0])
  })

  it('unit が1に近いときは末尾を返す', () => {
    expect(
      selectRandomCandidate(
        candidates,
        toExcludedWordIdSet([]),
        randomOf(0.999),
      ),
    ).toEqual(candidates[2])
  })

  it('除外後の並びに対してindexを取る', () => {
    expect(
      selectRandomCandidate(
        candidates,
        toExcludedWordIdSet(['w_a']),
        randomOf(0),
      ),
    ).toEqual(candidates[1])
  })
})
