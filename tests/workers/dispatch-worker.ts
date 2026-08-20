import { apiApp } from '../../src/server/api/app'
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
  fetch(request: Request): Response | Promise<Response> {
    const url = new URL(request.url)
    if (isApiPath(url.pathname)) {
      return apiApp.fetch(request)
    }

    return startStub.fetch()
  },
}
