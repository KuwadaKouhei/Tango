import handler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { apiApp } from './server/api/app'
import { isApiPath } from './server/is-api-path'

export default createServerEntry({
  fetch(request) {
    const url = new URL(request.url)
    if (isApiPath(url.pathname)) {
      return apiApp.fetch(request)
    }

    return handler.fetch(request)
  },
})
