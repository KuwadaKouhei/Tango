import { describe, expect, it } from 'vitest'
import { AppError } from '../../../platform/app-error'
import { getTranslationCandidates } from './get-translation-candidates'
import type { TranslationService } from '../domain/translation-service'

const neverAbort = new AbortController().signal

describe('getTranslationCandidates', () => {
  it('空白だけのtermを422にする', async () => {
    const translationService: TranslationService = {
      translateToJapanese: async () => [{ text: '問題' }],
    }

    await expect(
      getTranslationCandidates({
        term: '   ',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        translationService,
        signal: neverAbort,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('en→ja以外の言語を拒否する', async () => {
    const translationService: TranslationService = {
      translateToJapanese: async () => [{ text: '問題' }],
    }

    await expect(
      getTranslationCandidates({
        term: 'issue',
        sourceLanguage: 'ja',
        targetLanguage: 'en',
        translationService,
        signal: neverAbort,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })

  it('providerが複数件返しても1件だけ残す', async () => {
    const translationService: TranslationService = {
      translateToJapanese: async () => [{ text: '問題' }, { text: '論点' }],
    }

    await expect(
      getTranslationCandidates({
        term: ' issue ',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        translationService,
        signal: neverAbort,
      }),
    ).resolves.toEqual({
      candidates: [{ text: '問題' }],
      provider: 'workers-ai',
      model: '@cf/meta/m2m100-1.2b',
    })
  })

  it('空の候補配列は502にする', async () => {
    const translationService: TranslationService = {
      translateToJapanese: async () => [],
    }

    await expect(
      getTranslationCandidates({
        term: 'issue',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        translationService,
        signal: neverAbort,
      }),
    ).rejects.toBeInstanceOf(AppError)

    await expect(
      getTranslationCandidates({
        term: 'issue',
        sourceLanguage: 'en',
        targetLanguage: 'ja',
        translationService,
        signal: neverAbort,
      }),
    ).rejects.toMatchObject({ code: 'PROVIDER_INVALID_RESPONSE' })
  })

  it('AbortSignalで打ち切られたら503にする', async () => {
    const translationService: TranslationService = {
      translateToJapanese: () =>
        new Promise(() => {
          // hang
        }),
    }
    const controller = new AbortController()
    const pending = getTranslationCandidates({
      term: 'issue',
      sourceLanguage: 'en',
      targetLanguage: 'ja',
      translationService,
      signal: controller.signal,
    })
    controller.abort()
    await expect(pending).rejects.toMatchObject({
      code: 'AI_JUDGE_UNAVAILABLE',
    })
  })
})
