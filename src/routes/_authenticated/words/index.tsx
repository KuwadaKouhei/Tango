import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/features/auth/public'

export const Route = createFileRoute('/_authenticated/words/')({
  component: WordsPage,
})

function WordsPage() {
  const navigate = useNavigate()

  const signOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          void navigate({ to: '/login' })
        },
      },
    })
  }

  return (
    <main>
      <h1>単語一覧</h1>
      <p>まだ単語がありません。</p>
      <p>
        <Link to="/words/new">単語を登録</Link>
      </p>
      <p>
        <button type="button" onClick={() => void signOut()}>
          ログアウト
        </button>
      </p>
    </main>
  )
}
