import { expect, type Page } from '@playwright/test'

export const registerWord = async (
  page: Page,
  input: {
    term: string
    meanings: readonly string[]
    hint?: string
  },
) => {
  await page.goto('/words/new')
  await page.getByLabel('英単語').fill(input.term)

  for (const [index, meaning] of input.meanings.entries()) {
    if (index > 0) {
      await page.getByRole('button', { name: '意味を追加' }).click()
    }
    await page.getByLabel(`意味 ${String(index + 1)}`).fill(meaning)
  }

  if (input.hint !== undefined) {
    await page.getByLabel('ヒント（任意）').fill(input.hint)
  }

  await page.getByRole('button', { name: '登録する' }).click()
  await expect(page.getByRole('heading', { name: '登録しました' })).toBeVisible()
  await expect(page.getByText(input.term, { exact: true })).toBeVisible()
}
