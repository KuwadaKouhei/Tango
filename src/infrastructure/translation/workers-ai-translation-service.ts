import { z } from 'zod'
import { AppError, isAppError } from '../../platform/app-error'
import { TRANSLATION_LIMITS } from '../../features/translation/domain/translation-limits'
import type { TranslationService } from '../../features/translation/domain/translation-service'

const workersAiTranslationOutputSchema = z.object({
  translated_text: z.string(),
})

/**
 * domainへCloudflareの `Ai` 型を漏らさないための狭い実行口。
 * 本番は `env.AI`、contract testはfakeを渡す。
 */
export type WorkersAiRunner = {
  run: (
    model: typeof TRANSLATION_LIMITS.model,
    input: {
      text: string
      source_lang: string
      target_lang: string
    },
  ) => Promise<unknown>
}

const readNumericField = (error: object, field: string): number | undefined => {
  if (!(field in error)) {
    return undefined
  }

  const value: unknown = (error as Record<string, unknown>)[field]
  return typeof value === 'number' ? value : undefined
}

const readProviderStatus = (error: unknown): number | undefined => {
  if (typeof error !== 'object' || error === null) {
    return undefined
  }

  return (
    readNumericField(error, 'status') ?? readNumericField(error, 'statusCode')
  )
}

const mapWorkersAiError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return error
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return AppError.aiJudgeUnavailable(error)
  }

  const status = readProviderStatus(error)
  if (status === 429) {
    return AppError.rateLimited()
  }

  return AppError.aiJudgeUnavailable(error)
}

const runWithTimeout = async (
  operation: Promise<unknown>,
  signal: AbortSignal,
): Promise<unknown> => {
  if (signal.aborted) {
    throw AppError.aiJudgeUnavailable()
  }

  return await new Promise((resolve, reject) => {
    const abortListener = (): void => {
      reject(AppError.aiJudgeUnavailable())
    }
    signal.addEventListener('abort', abortListener, { once: true })
    operation.then(
      (value) => {
        signal.removeEventListener('abort', abortListener)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', abortListener)
        reject(error)
      },
    )
  })
}

export const createWorkersAiTranslationService = (
  ai: WorkersAiRunner,
): TranslationService => ({
  translateToJapanese: async (input, signal) => {
    let raw: unknown
    try {
      raw = await runWithTimeout(
        ai.run(TRANSLATION_LIMITS.model, {
          text: input.term,
          source_lang: TRANSLATION_LIMITS.workersAiSourceLang,
          target_lang: TRANSLATION_LIMITS.workersAiTargetLang,
        }),
        signal,
      )
    } catch (error) {
      throw mapWorkersAiError(error)
    }

    const parsed = workersAiTranslationOutputSchema.safeParse(raw)
    if (!parsed.success) {
      throw AppError.providerInvalidResponse()
    }

    const text = parsed.data.translated_text.trim()
    if (text.length === 0) {
      throw AppError.providerInvalidResponse()
    }

    return [{ text }]
  },
})
