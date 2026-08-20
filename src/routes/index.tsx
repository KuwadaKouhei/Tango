import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <main>
      <h1>Tango</h1>
      <p>
        単語学習アプリの開始画面です。Workers上で応答できていることを確認するための最小画面です。
      </p>
    </main>
  )
}
