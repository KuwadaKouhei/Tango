import { createFileRoute } from '@tanstack/react-router'
import { WordEditForm } from '#/features/words/ui/word-edit-form'

export const Route = createFileRoute('/_authenticated/words/$wordId/edit')({
  component: EditWordPage,
})

function EditWordPage() {
  const { wordId } = Route.useParams()

  return (
    <main>
      <WordEditForm wordId={wordId} />
    </main>
  )
}
