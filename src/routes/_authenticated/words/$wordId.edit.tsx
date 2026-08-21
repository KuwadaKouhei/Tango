import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/words/$wordId/edit')({
  component: EditWordPlaceholderPage,
})

function EditWordPlaceholderPage() {
  const { wordId } = Route.useParams()

  return (
    <main>
      <h1>単語を編集</h1>
      <p>編集画面は次のタスクで実装します。</p>
      <p>対象ID: {wordId}</p>
      <p>
        <Link to="/words">一覧へ</Link>
      </p>
    </main>
  )
}
