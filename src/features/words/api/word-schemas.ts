import { z } from 'zod'
import { INPUT_LIMITS } from '../domain/input-limits'

export const upsertWordBodySchema = z
  .object({
    term: z.string().max(INPUT_LIMITS.termMaxChars),
    meanings: z
      .array(z.string().max(INPUT_LIMITS.meaningMaxChars))
      .max(INPUT_LIMITS.meaningMaxCount),
    hint: z.string().max(INPUT_LIMITS.hintMaxChars).nullable().optional(),
  })
  .strict()

export const wordResponseSchema = z
  .object({
    word: z.object({
      id: z.string(),
      term: z.string(),
      meanings: z.array(
        z.object({
          id: z.string(),
          meaning: z.string(),
          order: z.number(),
        }),
      ),
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
