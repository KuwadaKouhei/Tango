import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/app-error'
import { createWorkersAiTranslationService } from '../../src/infrastructure/translation/workers-ai-translation-service'
import type { WorkersAiRunner } from '../../src/infrastructure/translation/workers-ai-translation-service'

const neverAbort = new AbortController().signal

const serviceOf = (run: WorkersAiRunner['run']) =>
  createWorkersAiTranslationService({ run })

describe('Workers AI translation contract', () => {
  it('成功時はtranslated_textを1件の候補にする', async () => {
    const service = serviceOf(async () => ({ translated_text: ' 問題 ' }))
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).resolves.toEqual([{ text: '問題' }])
  })

  it('契約外の応答は502にする', async () => {
    const service = serviceOf(async () => ({ request_id: 'async-1' }))
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
      httpStatus: 502,
    })
  })

  it('空のtranslated_textは502にする', async () => {
    const service = serviceOf(async () => ({ translated_text: '   ' }))
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE' })
  })

  it('timeoutしたAbortSignalは503にする', async () => {
    const service = serviceOf(
      () =>
        new Promise(() => {
          // 応答しない。signal側で打ち切る。
        }),
    )
    const controller = new AbortController()
    const pending = service.translateToJapanese(
      { term: 'issue' },
      controller.signal,
    )
    controller.abort()
    await expect(pending).rejects.toMatchObject({
      code: 'AI_JUDGE_UNAVAILABLE',
      httpStatus: 503,
    })
  })

  it('呼び出し前にabort済みなら503にする', async () => {
    const service = serviceOf(async () => ({ translated_text: '問題' }))
    const controller = new AbortController()
    controller.abort()
    await expect(
      service.translateToJapanese({ term: 'issue' }, controller.signal),
    ).rejects.toMatchObject({ code: 'AI_JUDGE_UNAVAILABLE' })
  })

  it('providerの429はRATE_LIMITEDへ変換する', async () => {
    const error = Object.assign(new Error('too many requests'), { status: 429 })
    const service = serviceOf(async () => {
      throw error
    })
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', httpStatus: 429 })
  })

  it('providerの5xxは503へ変換し、本文をerrorへ載せない', async () => {
    const error = Object.assign(new Error('upstream boom with prompt text'), {
      status: 503,
    })
    const service = serviceOf(async () => {
      throw error
    })
    try {
      await service.translateToJapanese({ term: 'issue' }, neverAbort)
      throw new Error('expected failure')
    } catch (caught) {
      expect(caught).toBeInstanceOf(AppError)
      expect(caught).toMatchObject({
        code: 'AI_JUDGE_UNAVAILABLE',
        httpStatus: 503,
      })
      expect((caught as AppError).message).not.toMatch(/prompt|boom/iu)
    }
  })
})
