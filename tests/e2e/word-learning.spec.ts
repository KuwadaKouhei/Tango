import { expect, test } from '@playwright/test'
import { registerWord } from './fixtures'

test('登録から検索・テスト・終了結果・統計まで通る', async ({ page }, testInfo) => {
  const suffix = crypto.randomUUID().slice(0, 8)
  const apple = `apple-${suffix}`
  const banana = `banana-${suffix}`

  await page.goto('/words')
  await expect(page.getByRole('heading', { name: '単語一覧' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'ログアウト' })).toBeVisible()

  await registerWord(page, {
    term: apple,
    meanings: ['りんご', '林檎'],
    hint: '赤い果実',
  })
  await page.getByRole('link', { name: '一覧へ' }).click()
  await registerWord(page, {
    term: banana,
    meanings: ['バナナ'],
  })
  await page.getByRole('link', { name: '一覧へ' }).click()

  const appleCard = page.locator('article.word-card', {
    has: page.getByRole('heading', { name: apple }),
  })
  await expect(appleCard.getByText('未回答（正解 0 / 回答 0）')).toBeVisible()
  await expect(appleCard).toHaveCSS('background-color', 'rgb(255, 255, 255)')

  await page.getByLabel('単語を検索').fill(apple)
  await page.getByRole('button', { name: '検索' }).click()
  await expect(appleCard).toBeVisible()
  await expect(
    page.getByRole('heading', { name: banana }),
  ).toHaveCount(0)

  await page.getByLabel('単語を検索').fill('')
  await page.getByRole('button', { name: '検索' }).click()
  await expect(page.getByRole('heading', { name: banana })).toBeVisible()

  await page.getByRole('link', { name: 'テストを始める' }).click()
  await expect(page.getByRole('heading', { name: 'テストを始める' })).toBeVisible()
  await page.getByLabel('完全ランダム').check()
  await page.getByLabel('全部').check()
  await page.getByRole('button', { name: '開始する' }).click()

  for (let remaining = 2; remaining > 0; remaining -= 1) {
    await expect(page.getByText(`問題 ${String(3 - remaining)} / 2`)).toBeVisible()
    const term = (await page.locator('.study-term').innerText()).trim()
    const isApple = term === apple

    if (isApple) {
      await expect(page.getByRole('button', { name: 'ヒントを見る' })).toBeVisible()
      await page.getByRole('button', { name: 'ヒントを見る' }).click()
      await expect(page.getByText('赤い果実')).toBeVisible()
    } else {
      await expect(page.getByRole('button', { name: 'ヒントを見る' })).toHaveCount(0)
    }

    await page.getByLabel('日本語の意味').fill(isApple ? 'りんご' : 'バナナ')
    await page.getByRole('button', { name: '回答する' }).click()
    await expect(page.locator('.study-correct')).toHaveText('正解')
    await expect(page.getByText('この判定にはAIを使いました。')).toHaveCount(0)

    await page
      .getByRole('button', { name: remaining === 1 ? '終了する' : '次の問題へ' })
      .click()
  }

  await expect(page.getByRole('heading', { name: '今回の結果' })).toBeVisible()
  await expect(page.getByText('出題数 2 問 / 正解数 2 問')).toBeVisible()
  await page.screenshot({
    path: testInfo.outputPath('session-summary.png'),
    fullPage: true,
  })

  await page.getByRole('link', { name: '一覧へ戻る' }).click()
  await expect(appleCard.getByText('正解率 100%（正解 1 / 回答 1）')).toBeVisible()
  const answeredBackground = await appleCard.evaluate(
    (node) => getComputedStyle(node).backgroundColor,
  )
  expect(answeredBackground).not.toBe('rgb(255, 255, 255)')
  await page.screenshot({
    path: testInfo.outputPath('word-list-after-study.png'),
    fullPage: true,
  })

  await page.getByRole('link', { name: '単語を登録' }).click()
  await page.getByLabel('英単語').fill(apple.toUpperCase())
  await page.getByLabel('意味 1').fill('りんご')
  await page.getByRole('button', { name: '登録する' }).click()
  await expect(
    page.getByRole('alert').filter({ hasText: 'この単語はすでに登録されています。' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'キャンセル' }).click()
  await appleCard.getByRole('button', { name: '削除' }).click()
  await expect(
    page.getByText('この単語と、この単語の回答履歴を削除します。取り消せません。'),
  ).toBeVisible()
  await appleCard.getByRole('button', { name: '削除する' }).click()
  await expect(page.getByRole('heading', { name: apple })).toHaveCount(0)
})
