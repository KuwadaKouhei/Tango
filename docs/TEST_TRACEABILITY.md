# 受け入れ条件のテスト追跡（T15）

> 状態: **T15でCI gateとE2Eを追加**。通常CIは外部Google / DeepL / Workers AI を live call しない。

## 1. 追跡表

| AC | 主証明 | 補足 |
|---|---|---|
| AC-001 | `tests/e2e/word-learning.spec.ts`（E2E session後に `/words`） / POC-03 live Google | E2Eは TEST_PHILOSOPHY のテスト用代替。本番ログインはGoogleのみ |
| AC-002 | `tests/e2e/word-learning.spec.ts` / `tests/integration/create-word.test.ts` | 複数意味と任意ヒント |
| AC-003 | `tests/integration/ownership.test.ts` | isolation suite。E2Eは単一ユーザー |
| AC-004 | `tests/integration/translation-api.test.ts` / `tests/contract/translation.contract.test.ts` | E2Eは翻訳ボタンを押さない（DeepL live禁止） |
| AC-005 | `tests/e2e/word-learning.spec.ts` / `tests/integration/study-api.test.ts` | E2Eは random + 全部。weakはintegration |
| AC-006 | `tests/e2e/word-learning.spec.ts` | ヒントありだけbutton。押すまで本文なし |
| AC-007 | `tests/e2e/word-learning.spec.ts` / `src/features/study/domain/answer-judge.test.ts` / `tests/integration/study-api.test.ts` | exact一致。E2EはAI文を出さない |
| AC-008 | `tests/integration/study-api.test.ts` / `tests/contract/semantic-judge.contract.test.ts` / `tests/eval/ai-judge.eval.test.ts` | 通常CIは live AI しない |
| AC-009 | `tests/integration/study-api.test.ts` | D1履歴の所有者scope |
| AC-010 | `tests/e2e/word-learning.spec.ts` / `src/features/words/ui/format-word-stats.test.ts` | 未回答と正解率の文字 |
| AC-011 | `tests/e2e/word-learning.spec.ts` / `src/features/words/domain/mastery-card-color.test.ts` | 未回答白、回答済みは白以外。コントラストはunit |
| AC-012 | `tests/e2e/word-learning.spec.ts` / `tests/integration/word-duplicate-api.test.ts` | 大小文字違いの409 |
| AC-013 | `tests/e2e/word-learning.spec.ts` / `tests/integration/word-delete-api.test.ts` | 確認操作のうえ削除 |
| AC-014 | `tests/e2e/word-learning.spec.ts` / `tests/integration/list-words.test.ts` | 見出し検索 |
| AC-015 | `tests/e2e/word-learning.spec.ts` / `src/features/study/domain/summarize-study-session.test.ts` | 終了結果から一覧へ戻る |

## 2. CI gate

`.github/workflows/ci.yml` が PR と `main` で次を必須化する。

- `pnpm install --frozen-lockfile`
- `pnpm format:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`（unit / integration / contract / eval。AI/翻訳は mock）
- `pnpm build`
- `pnpm test:e2e`（Chromium。localhost のダミー secret のみ）

## 3. 更新履歴

- 2026-08-25 T15で初版
