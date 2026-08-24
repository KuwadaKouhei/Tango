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

export const studyAnswerRequestSchema = z
  .object({
    wordId: z.string().min(1),
    answer: z.string().max(STUDY_LIMITS.answerMaxChars),
    hintUsed: z.boolean(),
  })
  .strict()

export const studyAnswerResultSchema = z
  .object({
    id: z.string(),
    wordId: z.string(),
    answer: z.string(),
    isCorrect: z.boolean(),
    judgeType: z.enum(['exact', 'normalized', 'ai']),
    hintUsed: z.boolean(),
    meanings: z.array(z.string()),
    judgedByAi: z.boolean(),
    answeredAt: z.string(),
  })
  .strict()

export const studyAnswerResponseSchema = z
  .object({
    result: studyAnswerResultSchema,
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
export type StudyAnswerRequest = z.infer<typeof studyAnswerRequestSchema>
export type StudyAnswerResponse = z.infer<typeof studyAnswerResponseSchema>
export type StudyAnswerResult = z.infer<typeof studyAnswerResultSchema>
