import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authClient } from '#/features/auth/public'
import { WordList } from '#/features/words/ui/word-list'

export const Route = createFileRoute('/_authenticated/words/')({
  component: WordsPage,
})

function WordsPage() {
  const navigate = useNavigate()

  const signOut = () => {
    void authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          void navigate({ to: '/login' })
        },
      },
    })
  }

  return (
    <main>
      <WordList onSignOut={signOut} />
    </main>
  )
}
