import { AppError, isAppError } from '../../../platform/app-error'
import { TRANSLATION_LIMITS } from '../domain/translation-limits'
import type {
  TranslationCandidate,
  TranslationService,
} from '../domain/translation-service'

export type TranslationCandidatesResult = {
  candidates: TranslationCandidate[]
  provider: typeof TRANSLATION_LIMITS.provider
  model: typeof TRANSLATION_LIMITS.model
}

const requireTranslationTerm = (term: string): string => {
  const trimmed = term.trim()
  if (trimmed.length === 0) {
    throw AppError.validation('英単語を入力してください。', {
      fields: ['term'],
    })
  }

  if (trimmed.length > TRANSLATION_LIMITS.termMaxChars) {
    throw AppError.validation('英単語が長すぎます。', { fields: ['term'] })
  }

  return trimmed
}

const requireEnToJa = (input: {
  sourceLanguage: string
  targetLanguage: string
}): void => {
  if (
    input.sourceLanguage !== TRANSLATION_LIMITS.sourceLanguage ||
    input.targetLanguage !== TRANSLATION_LIMITS.targetLanguage
  ) {
    throw AppError.validation('翻訳できるのは英語から日本語だけです。', {
      fields: ['sourceLanguage', 'targetLanguage'],
    })
  }
}

const toFormCandidate = (text: string): TranslationCandidate => {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    throw AppError.providerInvalidResponse()
  }

  return {
    text:
      trimmed.length > TRANSLATION_LIMITS.candidateMaxChars
        ? trimmed.slice(0, TRANSLATION_LIMITS.candidateMaxChars)
        : trimmed,
  }
}

const rejectWhenAborted = (signal: AbortSignal): Promise<never> =>
  new Promise((_resolve, reject) => {
    const fail = (): void => {
      reject(AppError.aiJudgeUnavailable())
    }
    if (signal.aborted) {
      fail()
      return
    }
    signal.addEventListener('abort', fail, { once: true })
  })

const mapTranslationFailure = (error: unknown): never => {
  if (isAppError(error)) {
    throw error
  }
  if (error instanceof Error && error.name === 'AbortError') {
    throw AppError.aiJudgeUnavailable(error)
  }
  throw error
}

/**
 * 翻訳候補を返すだけ。words / word_meanings へは一切書き込まない。
 */
export const getTranslationCandidates = async (input: {
  term: string
  sourceLanguage: string
  targetLanguage: string
  translationService: TranslationService
  signal: AbortSignal
}): Promise<TranslationCandidatesResult> => {
  requireEnToJa(input)
  const term = requireTranslationTerm(input.term)
  let raw: Awaited<ReturnType<TranslationService['translateToJapanese']>>
  try {
    raw = await Promise.race([
      input.translationService.translateToJapanese({ term }, input.signal),
      rejectWhenAborted(input.signal),
    ])
  } catch (error) {
    throw mapTranslationFailure(error)
  }
  const first = raw[0]
  if (!first) {
    throw AppError.providerInvalidResponse()
  }

  return {
    candidates: [toFormCandidate(first.text)],
    provider: TRANSLATION_LIMITS.provider,
    model: TRANSLATION_LIMITS.model,
  }
}
