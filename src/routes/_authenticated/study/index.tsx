import { createFileRoute } from '@tanstack/react-router'
import { StudySetupForm } from '#/features/study/public'

export const Route = createFileRoute('/_authenticated/study/')({
  component: StudySetupPage,
})

function StudySetupPage() {
  return (
    <main>
      <StudySetupForm />
    </main>
  )
}
