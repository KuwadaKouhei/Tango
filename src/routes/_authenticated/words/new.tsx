import { createFileRoute } from '@tanstack/react-router'
import { WordCreateForm } from '#/features/words/ui/word-create-form'

export const Route = createFileRoute('/_authenticated/words/new')({
  component: NewWordPage,
})

function NewWordPage() {
  return (
    <main>
      <WordCreateForm />
    </main>
  )
}
