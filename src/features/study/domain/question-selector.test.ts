import { describe, expect, it } from 'vitest'
import type { RandomSource } from '../../../platform/random'
import {
  remainingStudyCandidates,
  selectRandomCandidate,
  selectWeightedCandidate,
  toExcludedWordIdSet,
} from './question-selector'
import type { StudyCandidate, WeightedStudyCandidate } from './study-question'
import { toWeaknessWeight } from './weakness-weight'

const candidates: StudyCandidate[] = [
  { wordId: 'w_a', term: 'alpha', hasHint: false },
  { wordId: 'w_b', term: 'bravo', hasHint: true },
  { wordId: 'w_c', term: 'charlie', hasHint: false },
]

const weighted: WeightedStudyCandidate[] = [
  { wordId: 'w_weak', term: 'weak', hasHint: false, correct: 0, total: 4 },
  { wordId: 'w_mid', term: 'mid', hasHint: false, correct: 1, total: 2 },
  { wordId: 'w_strong', term: 'strong', hasHint: false, correct: 4, total: 4 },
]

const randomOf = (value: number): RandomSource => ({
  nextUnitInterval: () => value,
})

const mulberry32 = (seed: number): RandomSource => {
  let state = seed >>> 0
  return {
    nextUnitInterval: () => {
      state = (state + 0x6d2b79f5) >>> 0
      let t = state
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
}

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

describe('selectWeightedCandidate', () => {
  it('全候補の重みは0より大きい', () => {
    for (const candidate of weighted) {
      expect(
        toWeaknessWeight(candidate.correct, candidate.total),
      ).toBeGreaterThan(0)
    }
  })

  it('残り0件はnullになる', () => {
    expect(
      selectWeightedCandidate(
        weighted,
        toExcludedWordIdSet(['w_weak', 'w_mid', 'w_strong']),
        randomOf(0),
      ),
    ).toBeNull()
  })

  it('除外済みを除いて重み付き抽選する', () => {
    expect(
      selectWeightedCandidate(
        weighted,
        toExcludedWordIdSet(['w_weak']),
        randomOf(0),
      )?.wordId,
    ).toBe('w_mid')
  })

  it('固定seedでは低正解率ほど高頻度になる', () => {
    const random = mulberry32(20260824)
    const counts = { w_weak: 0, w_mid: 0, w_strong: 0 }
    const draws = 8000
    for (let index = 0; index < draws; index += 1) {
      const selected = selectWeightedCandidate(
        weighted,
        toExcludedWordIdSet([]),
        random,
      )
      if (selected) {
        counts[selected.wordId as keyof typeof counts] += 1
      }
    }

    expect(counts.w_weak).toBeGreaterThan(counts.w_mid)
    expect(counts.w_mid).toBeGreaterThan(counts.w_strong)
    expect(counts.w_strong).toBeGreaterThan(0)
  })
})
