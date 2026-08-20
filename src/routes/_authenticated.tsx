import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession } from '#/features/auth/application/get-session'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (!session) {
      throw redirect({ to: '/login' })
    }

    return { session }
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return <Outlet />
}
