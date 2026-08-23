import { z } from 'zod'
import { STUDY_LIMITS } from '../domain/study-limits'

export const studyQuestionRequestSchema = z
  .object({
    mode: z.enum(['random', 'weak']),
    excludeWordIds: z
      .array(z.string().min(1))
      .max(STUDY_LIMITS.excludeWordIdsMax)
      .default([]),
  })
  .strict()

export const studyQuestionSchema = z
  .object({
    wordId: z.string(),
    term: z.string(),
    hasHint: z.boolean(),
  })
  .strict()

export const studyQuestionResponseSchema = z
  .object({
    ownedWordCount: z.number().int(),
    question: studyQuestionSchema.nullable(),
  })
  .strict()

export const studyHintResponseSchema = z
  .object({
    hint: z.string(),
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

export type StudyQuestionRequest = z.infer<typeof studyQuestionRequestSchema>
export type StudyQuestionResponse = z.infer<typeof studyQuestionResponseSchema>
export type StudyHintResponse = z.infer<typeof studyHintResponseSchema>
