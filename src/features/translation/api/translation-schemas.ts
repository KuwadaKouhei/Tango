import { z } from 'zod'
import { TRANSLATION_LIMITS } from '../domain/translation-limits'

export const translationCandidatesBodySchema = z
  .object({
    term: z.string().max(TRANSLATION_LIMITS.termMaxChars),
    sourceLanguage: z.literal(TRANSLATION_LIMITS.sourceLanguage),
    targetLanguage: z.literal(TRANSLATION_LIMITS.targetLanguage),
  })
  .strict()

export const translationCandidateSchema = z
  .object({
    text: z.string(),
  })
  .strict()

export const translationCandidatesResponseSchema = z
  .object({
    candidates: z.array(translationCandidateSchema),
    provider: z.string(),
    model: z.string(),
  })
  .strict()

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
})

export type TranslationCandidatesResponse = z.infer<
  typeof translationCandidatesResponseSchema
>
