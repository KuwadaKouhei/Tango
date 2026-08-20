import { Hono } from 'hono'
import { AppError } from '../../../platform/app-error'
import {
  createWord,
  getOwnedWord,
  updateWord,
} from '../application/manage-word'
import type { Word } from '../domain/word'
import { createAppServices } from '../../../server/composition-root'
import type { AuthBindings } from '../../../server/api/bindings'
import type { AuthVariables } from '../../../server/api/middleware/auth'
import type { RequestIdVariables } from '../../../server/api/middleware/request-id'
import { upsertWordBodySchema } from './word-schemas'

type WordRouteEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

const toWordResponse = (word: Word) => ({
  word: {
    id: word.id,
    term: word.term,
    meanings: word.meanings.map((meaning) => ({
      id: meaning.id,
      meaning: meaning.meaning,
      order: meaning.sortOrder,
    })),
    hint: word.hint,
    createdAt: toIso(word.createdAt),
    updatedAt: toIso(word.updatedAt),
  },
})

const readUpsertBody = async (c: { req: { json: () => Promise<unknown> } }) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch (cause) {
    throw AppError.invalidJson(cause)
  }

  const parsed = upsertWordBodySchema.safeParse(body)
  if (!parsed.success) {
    throw AppError.validation('入力が正しくありません。', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    })
  }

  return {
    term: parsed.data.term,
    meanings: parsed.data.meanings,
    hint: parsed.data.hint ?? null,
  }
}

export const createWordRoutes = () => {
  const routes = new Hono<WordRouteEnv>()

  routes.post('/words', async (c) => {
    const body = await readUpsertBody(c)
    const services = createAppServices(c.env)
    const word = await createWord({
      command: {
        actorUserId: c.get('actorUserId'),
        ...body,
      },
      wordRepository: services.wordRepository,
      clock: services.clock,
    })

    return c.json(toWordResponse(word), 201)
  })

  routes.get('/words/:wordId', async (c) => {
    const services = createAppServices(c.env)
    const word = await getOwnedWord({
      actorUserId: c.get('actorUserId'),
      wordId: c.req.param('wordId'),
      wordRepository: services.wordRepository,
    })

    return c.json(toWordResponse(word), 200)
  })

  routes.put('/words/:wordId', async (c) => {
    const body = await readUpsertBody(c)
    const services = createAppServices(c.env)
    const word = await updateWord({
      command: {
        actorUserId: c.get('actorUserId'),
        wordId: c.req.param('wordId'),
        ...body,
      },
      wordRepository: services.wordRepository,
      clock: services.clock,
    })

    return c.json(toWordResponse(word), 200)
  })

  return routes
}
