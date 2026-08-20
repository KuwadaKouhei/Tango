import { createFileRoute, redirect } from '@tanstack/react-router'
import { getCurrentSession } from '#/features/auth/application/get-session'
import { authClient } from '#/features/auth/public'

export const Route = createFileRoute('/login')({
  beforeLoad: async () => {
    const session = await getCurrentSession()
    if (session) {
      throw redirect({ to: '/words' })
    }
  },
  component: LoginPage,
})

function LoginPage() {
  const signInWithGoogle = async () => {
    await authClient.signIn.social({
      provider: 'google',
      callbackURL: '/words',
    })
  }

  return (
    <main>
      <h1>Tango</h1>
      <p>英単語と日本語の意味を登録して、テストで覚えるアプリです。</p>
      <p>
        <button type="button" onClick={() => void signInWithGoogle()}>
          Googleでログイン
        </button>
      </p>
    </main>
  )
}
