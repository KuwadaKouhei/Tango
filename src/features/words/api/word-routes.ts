import { Hono } from 'hono'
import { AppError } from '../../../platform/app-error'
import { listOwnedWords } from '../application/list-owned-words'
import {
  createWord,
  deleteOwnedWord,
  getOwnedWord,
  updateWord,
} from '../application/manage-word'
import type { Word, WordWithStats } from '../domain/word'
import { createAppServices } from '../../../server/composition-root'
import type { AuthBindings } from '../../../server/api/bindings'
import type { AuthVariables } from '../../../server/api/middleware/auth'
import type { RequestIdVariables } from '../../../server/api/middleware/request-id'
import { listWordsQuerySchema, upsertWordBodySchema } from './word-schemas'

type WordRouteEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

const toIso = (epochMs: number): string => new Date(epochMs).toISOString()

const toMeaningResponse = (word: Word) =>
  word.meanings.map((meaning) => ({
    id: meaning.id,
    meaning: meaning.meaning,
    order: meaning.sortOrder,
  }))

const toWordResponse = (word: Word) => ({
  word: {
    id: word.id,
    term: word.term,
    meanings: toMeaningResponse(word),
    hint: word.hint,
    createdAt: toIso(word.createdAt),
    updatedAt: toIso(word.updatedAt),
  },
})

const toListItem = (word: WordWithStats) => ({
  id: word.id,
  term: word.term,
  meanings: toMeaningResponse(word),
  hint: word.hint,
  stats: word.stats,
  createdAt: toIso(word.createdAt),
  updatedAt: toIso(word.updatedAt),
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

  routes.get('/words', async (c) => {
    // 先に既知paramだけ抜き出すとschemaのstrictが効かず、綴り違いを黙って無視してしまう。
    const parsed = listWordsQuerySchema.safeParse(c.req.query())
    if (!parsed.success) {
      throw AppError.validation('入力が正しくありません。', {
        fields: parsed.error.issues.map((issue) => issue.path.join('.')),
      })
    }

    const services = createAppServices(c.env)
    const page = await listOwnedWords({
      actorUserId: c.get('actorUserId'),
      cursor: parsed.data.cursor ?? null,
      limit: parsed.data.limit ?? null,
      wordRepository: services.wordRepository,
    })

    return c.json(
      {
        items: page.items.map(toListItem),
        nextCursor: page.nextCursor,
      },
      200,
    )
  })

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

  routes.delete('/words/:wordId', async (c) => {
    const services = createAppServices(c.env)
    await deleteOwnedWord({
      actorUserId: c.get('actorUserId'),
      wordId: c.req.param('wordId'),
      wordRepository: services.wordRepository,
    })

    return c.body(null, 204)
  })

  return routes
}
