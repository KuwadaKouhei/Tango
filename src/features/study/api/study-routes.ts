import { Hono } from 'hono'
import { AppError } from '../../../platform/app-error'
import type { RandomSource } from '../../../platform/random'
import { createAppServices } from '../../../server/composition-root'
import type { AuthBindings } from '../../../server/api/bindings'
import type { AuthVariables } from '../../../server/api/middleware/auth'
import type { RequestIdVariables } from '../../../server/api/middleware/request-id'
import { getOwnedHint } from '../application/get-hint'
import { selectNextQuestion } from '../application/select-question'
import { studyQuestionRequestSchema } from './study-schemas'

type StudyRouteEnv = {
  Bindings: AuthBindings
  Variables: AuthVariables & RequestIdVariables
}

const readQuestionBody = async (c: {
  req: { json: () => Promise<unknown> }
}) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch (cause) {
    throw AppError.invalidJson(cause)
  }

  const parsed = studyQuestionRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw AppError.validation('入力が正しくありません。', {
      fields: parsed.error.issues.map((issue) => issue.path.join('.')),
    })
  }

  return parsed.data
}

export const createStudyRoutes = (
  deps: {
    random?: RandomSource
  } = {},
) => {
  const routes = new Hono<StudyRouteEnv>()

  routes.post('/study/questions', async (c) => {
    const body = await readQuestionBody(c)
    const services = createAppServices(c.env)
    const result = await selectNextQuestion({
      actorUserId: c.get('actorUserId'),
      mode: body.mode,
      excludeWordIds: body.excludeWordIds,
      wordRepository: services.wordRepository,
      random: deps.random ?? services.random,
    })

    return c.json(result, 200)
  })

  routes.get('/study/questions/:wordId/hint', async (c) => {
    const services = createAppServices(c.env)
    const result = await getOwnedHint({
      actorUserId: c.get('actorUserId'),
      wordId: c.req.param('wordId'),
      wordRepository: services.wordRepository,
    })

    return c.json(result, 200)
  })

  return routes
}
