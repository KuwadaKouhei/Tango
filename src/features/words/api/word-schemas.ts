import { z } from 'zod'
import { INPUT_LIMITS } from '../domain/input-limits'
import { WORD_LIST_PAGE } from '../domain/word-list-page'

export const upsertWordBodySchema = z
  .object({
    term: z.string().max(INPUT_LIMITS.termMaxChars),
    meanings: z
      .array(z.string().max(INPUT_LIMITS.meaningMaxChars))
      .max(INPUT_LIMITS.meaningMaxCount),
    hint: z.string().max(INPUT_LIMITS.hintMaxChars).nullable().optional(),
  })
  .strict()

const meaningResponseSchema = z.object({
  id: z.string(),
  meaning: z.string(),
  order: z.number(),
})

export const wordStatsSchema = z
  .object({
    status: z.enum(['unanswered', 'answered']),
    correct: z.number().int(),
    total: z.number().int(),
    accuracy: z.number().nullable(),
  })
  .strict()

export const wordListItemSchema = z
  .object({
    id: z.string(),
    term: z.string(),
    meanings: z.array(meaningResponseSchema),
    hint: z.string().nullable(),
    stats: wordStatsSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()

export const wordListResponseSchema = z
  .object({
    items: z.array(wordListItemSchema),
    nextCursor: z.string().nullable(),
  })
  .strict()

export const listWordsQuerySchema = z
  .object({
    cursor: z.string().min(1).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(WORD_LIST_PAGE.maxLimit)
      .optional(),
  })
  .strict()

export const wordResponseSchema = z
  .object({
    word: z.object({
      id: z.string(),
      term: z.string(),
      meanings: z.array(meaningResponseSchema),
      hint: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
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

export type UpsertWordBody = z.infer<typeof upsertWordBodySchema>
export type WordResponse = z.infer<typeof wordResponseSchema>
export type WordListResponse = z.infer<typeof wordListResponseSchema>
