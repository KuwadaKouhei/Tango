import { z } from 'zod'

export const upsertWordBodySchema = z
  .object({
    term: z.string(),
    meanings: z.array(z.string()),
    hint: z.string().nullable().optional(),
  })
  .strict()

export type UpsertWordBody = z.infer<typeof upsertWordBodySchema>
