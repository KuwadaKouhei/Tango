import { describe, expect, it } from 'vitest'
import { judgeAnswerLocally } from '../../src/features/study/domain/answer-judge'
import { AI_JUDGE_LIMITS } from '../../src/features/study/domain/ai-judge-limits'
import { createWorkersAiSemanticJudge } from '../../src/infrastructure/semantic-judge/workers-ai-semantic-judge'

/**
 * POC-05 の固定評価セット。通常CIは live call せず、
 * local不一致であることと contract mock の JSON 写像だけを固定する。
 * live の品質・p95 は配備Workerでの人手確認。
 */
export const AI_JUDGE_EVAL_CASES = [
  {
    id: 'issue-synonym',
    term: 'issue',
    meanings: ['問題'],
    answer: '課題',
    expectedIsCorrect: true,
    note: '同義。localは不一致でAIへ進む',
  },
  {
    id: 'issue-unrelated',
    term: 'issue',
    meanings: ['問題'],
    answer: '全然違う',
    expectedIsCorrect: false,
    note: '無関係',
  },
  {
    id: 'child-kana-kanji',
    term: 'child',
    meanings: ['子供'],
    answer: '子ども',
    expectedIsCorrect: true,
    note: '漢字とかなのゆれ。localは不一致',
  },
  {
    id: 'computer-long-vowel',
    term: 'computer',
    meanings: ['コンピュータ'],
    answer: 'コンピューター',
    expectedIsCorrect: true,
    note: '長音の有無。localは不一致',
  },
] as const

const neverAbort = new AbortController().signal

describe('POC-05 AI judge eval fixture', () => {
  it('lockしたmodelとprompt versionが空でない', () => {
    expect(AI_JUDGE_LIMITS.model).toBe('@cf/meta/llama-3.1-8b-instruct-fast')
    expect(AI_JUDGE_LIMITS.promptVersion).toBe('tango-judge-v1')
    expect(AI_JUDGE_LIMITS.provider).toBe('workers-ai')
  })

  it('固定評価セットはlocal判定では不一致になり、AI経路へ進む', () => {
    for (const evalCase of AI_JUDGE_EVAL_CASES) {
      expect(
        judgeAnswerLocally(evalCase.answer, evalCase.meanings).isCorrect,
        evalCase.id,
      ).toBe(false)
    }
  })

  it('contract mockは評価セットの期待booleanを履歴用metadata付きで返す', async () => {
    const judge = createWorkersAiSemanticJudge({
      run: async (_model, inputs) => {
        const user = inputs.messages[1]?.content ?? ''
        const matched = AI_JUDGE_EVAL_CASES.find(
          (evalCase) =>
            user.includes(`English term: ${evalCase.term}`) &&
            user.includes(evalCase.answer),
        )
        return {
          response: { isCorrect: matched?.expectedIsCorrect ?? false },
        }
      },
    })

    for (const evalCase of AI_JUDGE_EVAL_CASES) {
      const result = await judge.judge(
        {
          term: evalCase.term,
          answer: evalCase.answer,
          meanings: evalCase.meanings,
        },
        neverAbort,
      )
      expect(result.isCorrect, evalCase.id).toBe(evalCase.expectedIsCorrect)
      expect(result.model).toBe(AI_JUDGE_LIMITS.model)
      expect(result.promptVersion).toBe(AI_JUDGE_LIMITS.promptVersion)
    }
  })
})
