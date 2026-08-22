import {
  apiErrorSchema,
  translationCandidatesResponseSchema,
} from '../api/translation-schemas'
import { fetchJson } from '../../../platform/fetch-json'

export type TranslationClientResult =
  { ok: true; candidates: { text: string }[] } | { ok: false; message: string }

export const requestTranslationCandidates = async (
  term: string,
): Promise<TranslationClientResult> => {
  const outcome = await fetchJson('/api/v1/translation-candidates', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      term,
      sourceLanguage: 'en',
      targetLanguage: 'ja',
    }),
  })

  if (!outcome.received) {
    return { ok: false, message: outcome.message }
  }

  if (!outcome.ok) {
    const parsed = apiErrorSchema.safeParse(outcome.body)
    return {
      ok: false,
      message: parsed.success
        ? parsed.data.error.message
        : '翻訳に失敗しました。',
    }
  }

  const parsed = translationCandidatesResponseSchema.safeParse(outcome.body)
  if (!parsed.success) {
    return { ok: false, message: '翻訳結果の形式が正しくありません。' }
  }

  return { ok: true, candidates: parsed.data.candidates }
}
