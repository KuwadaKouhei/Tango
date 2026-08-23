import { z } from 'zod'
import { AppError, isAppError } from '../../platform/app-error'
import { TRANSLATION_LIMITS } from '../../features/translation/domain/translation-limits'
import type { TranslationService } from '../../features/translation/domain/translation-service'

const deeplTranslationOutputSchema = z.object({
  translations: z
    .array(
      z.object({
        text: z.string(),
      }),
    )
    .min(1),
})

/**
 * domainへfetch/Responseを漏らさないための狭い実行口。
 * 本番はglobal fetch、contract testはfakeを渡す。
 */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

const mapHttpStatus = (status: number): AppError => {
  if (status === 429 || status === 456) {
    return AppError.rateLimited()
  }
  if (status >= 500) {
    return AppError.aiJudgeUnavailable()
  }
  // 401/403を含む設定ミスも公開errorへ詳細を出さない。
  return AppError.aiJudgeUnavailable()
}

export const createDeeplTranslationService = (input: {
  authKey: string
  fetchImpl?: FetchLike
}): TranslationService => {
  const fetchImpl = input.fetchImpl ?? fetch
  const authKey = input.authKey.trim()

  return {
    translateToJapanese: async (termInput, signal) => {
      if (authKey.length === 0) {
        throw AppError.aiJudgeUnavailable()
      }
      if (signal.aborted) {
        throw AppError.aiJudgeUnavailable()
      }

      let response: Response
      try {
        response = await fetchImpl(TRANSLATION_LIMITS.deeplEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `DeepL-Auth-Key ${authKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            text: [termInput.term],
            source_lang: TRANSLATION_LIMITS.deeplSourceLang,
            target_lang: TRANSLATION_LIMITS.deeplTargetLang,
          }),
          signal,
        })
      } catch (error) {
        if (isAppError(error)) {
          throw error
        }
        if (error instanceof Error && error.name === 'AbortError') {
          throw AppError.aiJudgeUnavailable(error)
        }
        throw AppError.aiJudgeUnavailable(error)
      }

      if (!response.ok) {
        throw mapHttpStatus(response.status)
      }

      let raw: unknown
      try {
        raw = await response.json()
      } catch (cause) {
        throw AppError.providerInvalidResponse(cause)
      }

      const parsed = deeplTranslationOutputSchema.safeParse(raw)
      if (!parsed.success) {
        throw AppError.providerInvalidResponse()
      }

      const text = parsed.data.translations[0]?.text.trim() ?? ''
      if (text.length === 0) {
        throw AppError.providerInvalidResponse()
      }

      return [{ text }]
    },
  }
}
