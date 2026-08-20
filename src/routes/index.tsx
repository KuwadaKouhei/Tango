import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession } from '#/features/auth/application/get-session'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    throw redirect({ to: session ? '/words' : '/login' })
  },
})
