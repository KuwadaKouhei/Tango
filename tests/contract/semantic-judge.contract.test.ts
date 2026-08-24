import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/app-error'
import { AI_JUDGE_LIMITS } from '../../src/features/study/domain/ai-judge-limits'
import { AI_JUDGE_SYSTEM_PROMPT } from '../../src/features/study/domain/ai-judge-prompt'
import {
  AI_JUDGE_JSON_SCHEMA,
  createWorkersAiSemanticJudge,
} from '../../src/infrastructure/semantic-judge/workers-ai-semantic-judge'
import type { WorkersAiRun } from '../../src/infrastructure/semantic-judge/workers-ai-semantic-judge'

const neverAbort = new AbortController().signal

const input = {
  term: 'issue',
  answer: '課題',
  meanings: ['問題', '論点'],
}

const judgeOf = (run: WorkersAiRun) => createWorkersAiSemanticJudge({ run })

describe('Workers AI semantic judge contract', () => {
  it('JSON Modeのobject応答をbooleanへ写し、lockしたmodelとprompt versionを返す', async () => {
    const judge = judgeOf(async (model, inputs, options) => {
      expect(model).toBe(AI_JUDGE_LIMITS.model)
      expect(options?.signal).toBe(neverAbort)
      expect(inputs.response_format).toEqual({
        type: 'json_schema',
        json_schema: AI_JUDGE_JSON_SCHEMA,
      })
      expect(inputs.messages[0]).toEqual({
        role: 'system',
        content: AI_JUDGE_SYSTEM_PROMPT,
      })
      const user = inputs.messages[1]?.content ?? ''
      expect(user).toContain('issue')
      expect(user).toContain('問題')
      expect(user).toContain('論点')
      expect(user).toContain('課題')
      expect(user).not.toMatch(/hint|userId|session|OAuth/u)
      return { response: { isCorrect: true } }
    })

    await expect(judge.judge(input, neverAbort)).resolves.toEqual({
      isCorrect: true,
      provider: AI_JUDGE_LIMITS.provider,
      model: AI_JUDGE_LIMITS.model,
      promptVersion: AI_JUDGE_LIMITS.promptVersion,
    })
  })

  it('responseがJSON文字列でも検証する', async () => {
    const judge = judgeOf(async () => ({
      response: '{"isCorrect":false}',
    }))
    await expect(judge.judge(input, neverAbort)).resolves.toMatchObject({
      isCorrect: false,
    })
  })

  it('契約外JSONは503にし、本文をerrorへ載せない', async () => {
    const judge = judgeOf(async () => ({
      response: { isCorrect: true, reason: 'prompt leaked' },
    }))
    try {
      await judge.judge(input, neverAbort)
      throw new Error('expected failure')
    } catch (caught) {
      expect(caught).toBeInstanceOf(AppError)
      expect(caught).toMatchObject({
        code: 'AI_JUDGE_UNAVAILABLE',
        httpStatus: 503,
      })
      expect((caught as AppError).message).not.toMatch(/prompt|leaked/iu)
    }
  })

  it('壊れたJSON文字列は503にする', async () => {
    const judge = judgeOf(async () => ({ response: '{nope' }))
    await expect(judge.judge(input, neverAbort)).rejects.toMatchObject({
      code: 'AI_JUDGE_UNAVAILABLE',
      httpStatus: 503,
    })
  })

  it('timeoutしたAbortSignalは503にする', async () => {
    const judge = judgeOf(
      (_model, _inputs, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        }),
    )
    const controller = new AbortController()
    const pending = judge.judge(input, controller.signal)
    controller.abort()
    await expect(pending).rejects.toMatchObject({
      code: 'AI_JUDGE_UNAVAILABLE',
      httpStatus: 503,
    })
  })

  it('呼び出し前にabort済みならrunせず503にする', async () => {
    let called = false
    const judge = judgeOf(async () => {
      called = true
      return { response: { isCorrect: true } }
    })
    const controller = new AbortController()
    controller.abort()
    await expect(judge.judge(input, controller.signal)).rejects.toMatchObject({
      code: 'AI_JUDGE_UNAVAILABLE',
    })
    expect(called).toBe(false)
  })

  it('providerの429/5xx相当の例外は503へ変換する', async () => {
    const judge = judgeOf(async () => {
      throw new Error('429 rate limited by workers ai')
    })
    await expect(judge.judge(input, neverAbort)).rejects.toMatchObject({
      code: 'AI_JUDGE_UNAVAILABLE',
      httpStatus: 503,
    })
  })
})
