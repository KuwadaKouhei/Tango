import { describe, expect, it } from 'vitest'
import { AppError } from '../../src/platform/app-error'
import { TRANSLATION_LIMITS } from '../../src/features/translation/domain/translation-limits'
import { createDeeplTranslationService } from '../../src/infrastructure/translation/deepl-translation-service'
import type { FetchLike } from '../../src/infrastructure/translation/deepl-translation-service'

const neverAbort = new AbortController().signal
const AUTH_KEY = 'test-deepl-auth-key:fx'

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const serviceOf = (fetchImpl: FetchLike) =>
  createDeeplTranslationService({ authKey: AUTH_KEY, fetchImpl })

describe('DeepL translation contract', () => {
  it('成功時はtranslations[0].textを1件の候補にする', async () => {
    const service = serviceOf(async (url, init) => {
      expect(url).toBe(TRANSLATION_LIMITS.deeplEndpoint)
      expect(url).not.toMatch(/auth_key/iu)
      expect(init.method).toBe('POST')
      const headers = new Headers(init.headers)
      expect(headers.get('Authorization')).toBe(`DeepL-Auth-Key ${AUTH_KEY}`)
      expect(headers.get('content-type')).toBe('application/json')
      const body: unknown = JSON.parse(String(init.body))
      expect(body).toEqual({
        text: ['issue'],
        source_lang: 'EN',
        target_lang: 'JA',
      })
      expect(JSON.stringify(body)).not.toMatch(/auth_key|DeepL-Auth-Key/iu)
      return jsonResponse({
        translations: [{ text: ' 問題 ', detected_source_language: 'EN' }],
      })
    })

    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).resolves.toEqual([{ text: '問題' }])
  })

  it('契約外の応答は502にする', async () => {
    const service = serviceOf(async () => jsonResponse({ message: 'nope' }))
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({
      code: 'PROVIDER_INVALID_RESPONSE',
      httpStatus: 502,
    })
  })

  it('空の訳文は502にする', async () => {
    const service = serviceOf(async () =>
      jsonResponse({ translations: [{ text: '   ' }] }),
    )
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE' })
  })

  it('timeoutしたAbortSignalは503にする', async () => {
    const service = serviceOf(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
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
    const service = serviceOf(async () => {
      throw new Error('fetch should not run')
    })
    const controller = new AbortController()
    controller.abort()
    await expect(
      service.translateToJapanese({ term: 'issue' }, controller.signal),
    ).rejects.toMatchObject({ code: 'AI_JUDGE_UNAVAILABLE' })
  })

  it('providerの429はRATE_LIMITEDへ変換する', async () => {
    const service = serviceOf(async () =>
      jsonResponse({ message: 'slow' }, 429),
    )
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', httpStatus: 429 })
  })

  it('月次quotaの456もRATE_LIMITEDへ変換する', async () => {
    const service = serviceOf(async () =>
      jsonResponse({ message: 'quota' }, 456),
    )
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED', httpStatus: 429 })
  })

  it('providerの5xxは503へ変換し、本文をerrorへ載せない', async () => {
    const service = serviceOf(async () =>
      jsonResponse({ message: 'upstream boom with prompt text' }, 503),
    )
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

  it('authKeyが空ならfetchせず503にする', async () => {
    let called = false
    const service = createDeeplTranslationService({
      authKey: '   ',
      fetchImpl: async () => {
        called = true
        return jsonResponse({ translations: [{ text: '問題' }] })
      },
    })
    await expect(
      service.translateToJapanese({ term: 'issue' }, neverAbort),
    ).rejects.toMatchObject({ code: 'AI_JUDGE_UNAVAILABLE' })
    expect(called).toBe(false)
  })
})
