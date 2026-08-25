# リリースゲート（T15）

> 状態: **T15マージ済み。CIとE2Eは自動化。T15入り `main` の Worker 再配備と smoke は 2026-08-25 に人間が実施。**
> OQ-012 は決定済み（同時1〜5、単語100、履歴50、アプリ内p95目安約2秒）。CIのSLOゲートは作らない。

## 1. 自動化した条件

最終変更後に次が全部成功すること。GitHub Actions が PR / `main` で同じコマンドを回す。ランナーは Node 22.17.1 と pnpm 11.22.0。Node 22.12.0 は pnpm 11.22.0 が動かない。

```text
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

E2Eは `tests/e2e/dev.vars.ci` のダミー値を `.dev.vars` へコピーして localhost で動かす。値は本番secretではない。`E2E_AUTH_SECRET` と `http://localhost` / `http://127.0.0.1` が揃ったときだけ Better Auth の email/password が開く。本番 `BETTER_AUTH_URL`（https）では開かない。

## 2. secret・料金・log

| 項目 | 確認 |
|---|---|
| Git | `.dev.vars` / `.env` / 本番secretはcommitしない。CIのE2Eはダミーのみ |
| 変数名 | `BETTER_AUTH_SECRET`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`DEEPL_AUTH_KEY`。E2E専用 `E2E_AUTH_SECRET` は本番Workerに置かない |
| 翻訳 | DeepL API Free。通常CIとE2Eは live call しない |
| AI | Workers Free の neuron。通常CIは live call しない。model は `@cf/meta/llama-3.1-8b-instruct-fast` |
| log | 公開errorにSQL/stack/provider本文/secretを出さない。回答・意味・prompt全文は既定logへ出さない |
| CORS | MVPは same-origin。`BETTER_AUTH_URL` と Origin を照合 |

## 3. migration rehearsal

- 適用済みSQLは改変しない。local → preview → production の順。
- E2Eの webServer が `pnpm db:migrate:local` を先に実行する。
- remote D1 は 2026-08-23 に `0000`〜`0003` を適用済み（POC-04）。
- production適用前は D1 Time Travel の復帰ポイントを確認する。`drizzle push` は使わない。

rollbackの正本は `docs/DATABASE.md` 9節。コードrevertでWorkerを戻し、schemaはTime Travelまたは逆SQL。

## 4. preview 配備手順（人手）

同じ `wrangler.jsonc` と `drizzle/` で、手元から次を行う。Cloud Agent の VM には Cloudflare 配備tokenがない。

1. 本番と同じ `wrangler.jsonc` と `drizzle/` を使う。
2. secretはWorkers secretへ。`wrangler.jsonc` の vars には `BETTER_AUTH_URL` だけ。
3. `pnpm build` のあと `pnpm exec wrangler deploy`（または運用で決めた preview コマンド）。
4. remote D1へ未適用migrationがあれば `wrangler d1 migrations apply tango --remote`。
5. smoke: Google login、単語CRUD、検索、テスト1問（exact）、一覧統計。翻訳とAIは既存POCを再利用し、通常は live を増やさない。

### 4.1 実施記録

| 日 | 対象 | 実施 | 結果 |
|---|---|---|---|
| 2026-08-23 | 当時の配備Worker | POC-03/04/06 live | 合格。POC-05 liveは未実施 |
| 2026-08-25 | T15マージ後の `main` を `https://tango.eitango.workers.dev` へ `wrangler deploy` | RELEASE_GATE 4節の smoke（login、CRUD、検索、exact 1問、統計） | 人間が完了を報告。Cloud Agent は Google 動線を直接観察していない。翻訳とAIの live は増やしていない |

`0000`〜`0003` は 2026-08-23 に remote D1 へ適用済み。T15再配備で新しい migration は無い。POC-05 liveは 2026-08-25 に条件付き合格（`issue-synonym` 外れをMVP許容。`docs/FEASIBILITY.md`）。

## 5. OQ-012

2026-08-25 に決定。CIのSLOゲートは作らない。実装・timeout・schemaは変えない。

| 項目 | 値 |
|---|---|
| 同時利用者 | 1〜5人 |
| 1ユーザーあたり単語 | 100件 |
| 1ユーザーあたり回答履歴 | 50件 |
| p95目安 | 約2秒（一覧・検索・出題・exact/normalized。T11の約500msはこの内側） |
| 対象外 | 翻訳・AI判定（timeout 8秒据え置き） |

この規模では schema や query 方式を変えない。

## 6. 更新履歴

- 2026-08-25 T15初版。CI/E2Eを自動化。preview再配備は人手手順のみ
- 2026-08-25 T15マージ済み。OQ-012とpreview再配備・POC-05 liveは残作業
- 2026-08-25 人間が T15入り `main` を `tango.eitango.workers.dev` へ再配備し smoke 完了を報告。POC-05 liveとOQ-012は残作業
- 2026-08-25 POC-05 live一部。`issue-synonym` はAI不正解。差し替えは未決
- 2026-08-25 `issue-synonym` 外れをMVP許容。model/promptは据え置き
- 2026-08-25 OQ-012の規模を決定（同時1〜5、単語100、履歴50）。p95は未決
- 2026-08-25 OQ-012のp95目安を約2秒として決定。翻訳・AI判定は対象外。CIゲートは作らない
- 2026-08-25 人間が `docs/REQUIREMENTS.md` をレビュー済みへ更新
