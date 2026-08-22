# 技術スタック選定: Tango MVP

> 調査日: 2026-08-20
> 状態: **T06で `@tanstack/react-query` 5.101.4 をlockfileへ追加済み（OQ-013/OQ-014）。T08で翻訳をWorkers AI `@cf/meta/m2m100-1.2b` に固定（OQ-001）**
> 要件で指定された中核スタックを尊重し、公式CLIとnpmレジストリで互換セットを確認した。以後の更新は独立PRでbuild/testを再実行する。

## 1. 選定方針

評価優先度は `PLAN_PHILOSOPHY.md` に従い、次の順とする。

1. 認証・ユーザー分離・データ整合性を安全に実装できる。
2. Cloudflare WorkersのWeb標準runtimeで動く。
3. Webと将来のChrome拡張が同じAPI/ドメイン処理を再利用できる。
4. TypeScriptで境界からUIまで型とvalidationを一貫させられる。
5. 個人MVPに過剰な運用基盤を持ち込まず、外部providerを交換できる。

## 2. 選定サマリ

| 領域 | 採用 | 主な理由 |
|---|---|---|
| 言語 | TypeScript strict | Web、API、domain、schemaを1言語・型で共有できる |
| UI | React 19 | 要件指定、TanStack Startの標準UI |
| フルスタック | TanStack Start | Router中心、SSR、server entry、Cloudflare公式手順 |
| Router | TanStack Router | Startのアプリ契約、型付きroute/search |
| サーバー状態 | TanStack Query | キャッシュ、mutation、再取得をUIローカル状態と分離 |
| REST API | Hono | Workers向け軽量fetch、middleware、型付きbinding、将来クライアント再利用 |
| validation | Zod + `@hono/zod-validator` | HTTPとAI応答をruntimeで検証し型を推論 |
| DB | Cloudflare D1 | 要件指定、Workers binding、SQLite互換RDB、FK |
| ORM/migration | Drizzle ORM + Drizzle Kit | D1公式対応、TypeScript schema、SQLを隠し過ぎない |
| 認証 | Better Auth + Google OAuth | 要件指定、Google social provider、D1/Drizzle対応 |
| AI/翻訳 | port + Workers AI `@cf/meta/m2m100-1.2b` | 同一Cloudflare基盤、binding利用。翻訳はT08で固定。AI判定は未決 |
| build/deploy | Vite + Cloudflare Vite plugin + Wrangler | TanStack Start公式Cloudflare手順 |
| package manager | pnpm | lockfile、厳格な依存、workspace拡張余地 |
| unit/integration | Vitest + Workers Vitest integration | Workers runtimeとD1 migrationをローカル検証 |
| E2E | Playwright | Chromiumを含む主要動線のブラウザー検証 |
| format/lint | Prettier + ESLint | 自動整形とTypeScript/Reactの静的検査 |
| CI | GitHub Actions | GitHub FlowとPR gateに統合しやすい |
| UI style | CSS Modules/通常CSS + CSS custom properties | MVPにUI framework依存を増やさず、カード色を明示的に制御 |

## 3. T01で固定したバージョン

次はT01（2026-08-20）で `package.json` / `pnpm-lock.yaml` へ exact 固定した値である。調査時点のnpm latestを盲採用せず、公式 TanStack CLI（`--blank --deployment cloudflare --toolchain eslint`）とWorkers Vitestのpeer範囲を優先した。

| package/tool | 固定値 | 備考 |
|---|---:|---|
| Node.js | 開発機 22.17.1 / 要件 `>=22.12.0` | `engines` とCIで固定する。Workers本番runtimeとは別 |
| pnpm | 11.22.0 | `packageManager` で固定。設定は `pnpm-workspace.yaml` |
| TypeScript | 6.0.2 | 公式CLI互換。npm latestの7.0.2は未採用 |
| React / React DOM | 19.2.8 | Startのpeer範囲内 |
| `@tanstack/react-start` | 1.168.48 | 公式ページはRC表記。POC-01/02合格により採用 |
| `@tanstack/react-router` | 1.170.31 | Start 1.168.48と組み合わせてbuild/test成功 |
| Vite | 8.2.2 | `@cloudflare/vite-plugin` 1.53.0と互換 |
| `@vitejs/plugin-react` | 6.1.0 | Vite 8 peer |
| Hono | 4.13.3 | `/api/v1` REST API |
| Wrangler | 4.124.0 | `compatibility_date` は 2026-08-20 |
| `@cloudflare/vite-plugin` | 1.53.0 | Start公式配備経路 |
| Vitest | 4.1.11 | Workers test pool要件 `^4.1.0` |
| `@cloudflare/vitest-pool-workers` | 0.22.0 | health/dispatch integration |
| ESLint / Prettier | 10.8.1 / 3.9.6 | `@tanstack/eslint-config` 0.4.0 が ESLint 10 を要求 |
| `@tanstack/eslint-config` | 0.4.0 | 公式CLI toolchain |
| `@tanstack/router-cli` | 1.167.32 | `tsr generate` |
| `better-auth` | 1.7.1 | Google social provider。D1はDrizzle adapter経由 |
| `@better-auth/drizzle-adapter` | 1.7.1 | D1に対話的transactionがないため `transaction: false` |
| `auth`（CLI） | 1.7.1 | schema生成。`@better-auth/cli` は 1.7 系を公開していない |
| `drizzle-orm` | 0.45.2 | D1 / Better Auth schema |
| `drizzle-kit` | 0.31.10 | SQL migration生成。出力先は `drizzle/` |
| `zod` | 4.4.3 | HTTP入力のruntime検証。T03で導入 |
| `@tanstack/react-query` | 5.101.4 | 単語一覧・詳細のserver state。T06で導入 |

Playwright は未導入。各タスクで追加し、この表へ exact versionを追記する。

T01で確認した公式scaffoldとの差:

- 公式 `wrangler.jsonc` の `main` は `@tanstack/react-start/server-entry`（仮想module）。Hono分岐のため `src/server.ts` を `main` にする。
- `@tanstack/vitest-pool-workers` は仮想moduleを静的解析できないため、integration testは `wrangler.test.jsonc` + Start stub worker を使う。
- 公式 blank は `#/*` import alias と `src/styles.css` を使う。Tailwindは入れない。
- TypeScript 7 ではなく公式CLIの 6.0.2 を使う。

## 4. 領域別比較

### 4.1 フルスタック: TanStack Start

| 候補 | 要件適合 | Cloudflare | 成熟度/リスク | 判定 |
|---|---|---|---|---|
| TanStack Start | Router/Queryと統一、要件指定 | 公式Workers手順あり | RC表記。PoC必須 | **採用候補** |
| Next.js | React SSR、エコシステム大 | Cloudflare adapter選定が追加 | 要件スタックから逸脱、Vercel前提機能が混ざる | 不採用 |
| Vite SPA + Hono | 単純でWorkers適合 | 高い | SSR/Start要件を捨てる | Start PoC失敗時の代替 |

採用理由: 要件で決定済みであり、現行公式ガイドにCloudflare Workersの配備手順とfetch server entryがある。RCリスクを無視せず、POC-01/02を採用ゲートにする。

出典: [TanStack Start](https://tanstack.com/start/latest)、[Hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)、[Server Entry](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)

### 4.2 REST API: Hono

| 候補 | Workers適合 | 外部クライアント | 複雑性 | 判定 |
|---|---|---|---|---|
| Hono | fetch-native、typed bindings | REST/Hono RPCを選べる | 小さい | **採用** |
| Start server functionsだけ | Start Webには型安全 | 外部クライアント向けでない | Web内は簡単 | 外部API要件に不適合 |
| Fastify/Express | Nodeで成熟 | REST可 | Workers adapter/Node互換依存 | 不採用 |

採用理由: Cloudflare WorkersのWeb標準runtimeへ自然に適合し、将来Chrome拡張から呼ぶREST境界を保てる。Web UI専用のStart server functionsへドメインを閉じ込めない。

出典: [Hono Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)、[Hono validation](https://hono.dev/docs/guides/validation)、[Hono RPC](https://hono.dev/docs/guides/rpc)

### 4.3 DB/ORM: D1 + Drizzle

| 候補 | 要件適合 | 運用 | ロックイン | 判定 |
|---|---|---|---|---|
| D1 + Drizzle | 要件指定、FK/SQL、Workers binding | Cloudflare内で小さい | D1制約あり、Drizzle schemaは移行に有利 | **採用** |
| Supabase/Postgres | SQL機能・拡張性が高い | 外部接続・別運用 | provider依存 | MVPでは不採用 |
| Turso/libSQL | edge SQLite | 外部サービス追加 | 中 | 要件から逸脱 |
| KV | 単純key-value | relation/集計が難しい | Cloudflare依存 | データモデル不適合 |

採用理由: 複数意味、履歴、所有者スコープ、集計はRDBが自然で、D1とDrizzleは公式統合がある。D1の逐次実行とtransaction制約はbatch・index・計測で管理する。

出典: [Drizzle D1](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1)、[D1 limits](https://developers.cloudflare.com/d1/platform/limits/)、[D1 foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)

### 4.4 認証: Better Auth

| 候補 | Google OAuth | D1/Workers | データ所有 | 判定 |
|---|---|---|---|---|
| Better Auth | 公式provider | D1 first-class/Drizzle adapter | 自前DBに保持 | **採用** |
| Clerk | 対応 | SaaS依存 | 外部管理 | 要件指定と不一致 |
| Auth.js | 対応 | adapter検証が必要 | 選択可 | 要件指定と不一致 |
| 独自OAuth | 実装可能 | 任意 | 高リスク | 不採用 |

採用理由: 明示要件であり、Google social providerとD1/Drizzleの公式経路がある。認証schemaはCLI生成結果をversion管理する。

T02の比較結果: アプリテーブルもDrizzleにする（T03）ため、認証も `@better-auth/drizzle-adapter` に揃えた。Better AuthのD1 native adapterは使わない。D1は対話的transactionを持たないので adapter に `transaction: false` を渡す。

出典: [Better Auth OAuth](https://better-auth.com/docs/concepts/oauth)、[Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)、[D1 support](https://better-auth.com/blog/1-5)

### 4.5 AI/翻訳

| 候補 | 統合 | 品質/機能 | ロックイン | 判定 |
|---|---|---|---|---|
| Workers AI `@cf/meta/m2m100-1.2b` | bindingで低運用 | 1リクエスト1訳文。live品質はpreview人手 | Cloudflare model ID | **翻訳で採用（OQ-001）** |
| DeepL | 翻訳に強い | 翻訳用途へ明確 | 外部API/料金 | 翻訳の交換候補 |
| Google Translation | 翻訳API | 成熟 | GCP追加 | 翻訳の交換候補 |
| 外部LLM API | AI判定品質を選べる | model/料金/データ取扱差 | provider依存 | AI比較候補 |

採用理由: `TranslationService` / `SemanticJudge` portは交換境界として残す。翻訳adapterの最初の実装はWorkers AI `@cf/meta/m2m100-1.2b`（OQ-001）。AI判定のmodelはPOC-05/OQ-002まで固定しない。

出典: [Workers AI](https://developers.cloudflare.com/workers-ai/)、[m2m100-1.2b](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/)、[Limits](https://developers.cloudflare.com/workers-ai/platform/limits/)、[Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

### 4.6 テスト

| 候補 | Workers再現性 | 速度 | 用途 | 判定 |
|---|---|---|---|---|
| Vitest + Workers pool | 高い | 高速 | unit/integration/D1 | **採用** |
| Node Vitestのみ | binding差を見逃す | 高速 | domain unitのみ | 補助 |
| Jest | Workers統合の追加作業 | 標準 | 一般unit | 不採用 |
| Playwright | 実ブラウザー | 低速 | 主要E2E | **採用（限定）** |

出典: [Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)

## 5. スタック全体の整合性

- StartとHonoはいずれも`Request`/`Response` fetch契約を使い、単一Workers entryで分岐できる。
- HonoのBindings typeと`wrangler types`でD1/AI/envを型付けする。
- Drizzle schemaをアプリテーブルとBetter Auth生成テーブルの参照点にし、D1 migrationをWorkers testへ適用する。
- Zod schemaはHTTP入力とAI/翻訳出力に使い、DB entityをそのまま公開しない。
- TanStack QueryはHono APIのserver stateだけを扱い、route/local stateと責務を分ける。

## 6. リスク・ロックイン・更新方針

- Cloudflare固有bindingは`infrastructure/cloudflare`配下へ閉じ込め、domain/applicationへ露出しない。
- TanStack StartはRC表記のため、minor更新も独立PRでbuild/E2Eを再実行する。
- exact versionと`pnpm-lock.yaml`をcommitし、CIは`--frozen-lockfile`を使う。
- `compatibility_date`はPoC実施日を明示し、更新はcompatibility test付きPRで行う。
- Workers AI model ID、prompt version、料金情報はコード定数と運用文書で追跡する。
- Dependabot/Renovateはリポジトリ確立後に検討し、自動mergeしない。

## 7. 要件・思想との対応

| 要件/思想 | 対応 |
|---|---|
| AUTH-001〜003 | Better Auth、Google、session由来actor、D1所有者scope |
| TRANS-003 / JUDGE-004 | provider port + adapter |
| 将来Chrome拡張 | Hono `/api/v1` REST境界 |
| 保守性 | TypeScript strict、Zod、feature module、Drizzle migration |
| セキュリティ | server-only bindings、Origin/session/owner validation |
| テスト可能性 | pure domain + Workers integration + limited E2E |

## 8. 更新履歴

- 2026-08-20 公式情報・npmスナップショットに基づく初版作成
- 2026-08-20 T01でPOC-01/02合格後のlockfile固定値を反映
- 2026-08-20 T02で Better Auth 1.7.1 / Drizzle 0.45.2 / drizzle-kit 0.31.10 を固定
- 2026-08-20 T03で zod 4.4.3 を固定
- 2026-08-21 T06で `@tanstack/react-query` 5.101.4 を固定
- 2026-08-22 T08で翻訳providerを Workers AI `@cf/meta/m2m100-1.2b` に固定（OQ-001）。プランはWorkers Free（OQ-015）
