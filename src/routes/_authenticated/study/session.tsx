import { createFileRoute } from '@tanstack/react-router'
import { StudySession, parseStudySessionSearch } from '#/features/study/public'

export const Route = createFileRoute('/_authenticated/study/session')({
  validateSearch: parseStudySessionSearch,
  component: StudySessionPage,
})

function StudySessionPage() {
  const search = Route.useSearch()
  return (
    <main>
      <StudySession mode={search.mode} count={search.count} />
    </main>
  )
}
