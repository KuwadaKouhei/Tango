import { apiApp } from '../../src/server/api/app'
import type { AuthBindings } from '../../src/server/api/bindings'
import { isApiPath } from '../../src/server/is-api-path'

const startStub = {
  fetch(): Response {
    return new Response('start', {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  },
}

/**
 * Startの仮想moduleを読まずに、Hono分岐をWorkers runtimeで検証するためのtest worker。
 */
export default {
  fetch(
    request: Request,
    env: AuthBindings,
    _ctx: ExecutionContext,
  ): Response | Promise<Response> {
    const url = new URL(request.url)
    if (isApiPath(url.pathname)) {
      return apiApp.fetch(request, env)
    }

    return startStub.fetch()
  },
}
