import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { env } from 'cloudflare:workers'
import { getSessionFromHeaders } from '../../infrastructure/auth/session-adapter'

/**
 * Web画面の未認証redirect用。API認可の正本は Hono の requireAuth。
 * public.ts へ出さない。client bundle に cloudflare:workers を混ぜないため。
 */
export type CurrentSession = {
  userId: string
}

export const getCurrentSession = createServerFn({ method: 'GET' }).handler(
  async (): Promise<CurrentSession | null> => {
    const session = await getSessionFromHeaders(env, getRequest().headers)
    if (!session) {
      return null
    }

    return { userId: session.user.id }
  },
)
