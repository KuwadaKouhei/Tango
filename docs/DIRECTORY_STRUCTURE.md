# ディレクトリ構造: Tango

> 状態: **T06で単語編集画面とTanStack Queryを反映済み**
> 方針: TanStack Startのfile-based routesを守りつつ、プロダクトコードは機能単位、外部詳細はinfrastructureへ分離する。

## 1. 構造方針

- `src/routes`はURLと画面compositionだけを持つ。
- `src/features/<feature>`を変更理由の中心とし、`domain`、`application`、`api`、`ui`を必要な分だけ置く。
- D1、Better Auth、Workers AI、外部翻訳等の具体実装は`src/infrastructure`へ置く。
- Hono全体compositionと横断middlewareは`src/server/api`へ置く。
- 汎用化は昇格条件を満たすものだけに限定し、責務不明な`utils`/`common`を作らない。
- testは小さいunitを実装と同居させ、runtimeを跨ぐintegrationとブラウザーE2Eだけ`tests`へ分離する。

## 2. ディレクトリツリー

```text
Tango/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── deploy.yml                 # 本番運用決定後に追加
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── philosophy/
│   │   ├── PLAN_PHILOSOPHY.md
│   │   ├── CODING_PHILOSOPHY.md
│   │   └── TEST_PHILOSOPHY.md
│   ├── REQUIREMENTS.md
│   ├── OPEN_QUESTIONS.md
│   ├── FEASIBILITY.md
│   ├── GIT_CONVENTIONS.md
│   ├── TECH_STACK.md
│   ├── DESIGN.md
│   ├── DATABASE.md
│   ├── DIRECTORY_STRUCTURE.md
│   └── TASKS.md
├── drizzle/
│   ├── 0000_calm_lady_deathstrike.sql # T02 Better Auth。Drizzle Kit生成
│   └── meta/                          # Drizzle Kit生成物。手編集禁止
├── public/
│   ├── favicon.svg
│   └── manifest.webmanifest
├── src/
│   ├── components/                    # 複数featureで実利用する表示primitiveだけ
│   │   ├── button/
│   │   ├── field/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── application/
│   │   │   │   └── get-session.ts     # Web redirect用。public.tsへ出さない
│   │   │   ├── ui/
│   │   │   │   └── auth-client.ts
│   │   │   └── public.ts              # client-safe。authClientのみ
│   │   ├── words/
│   │   │   ├── domain/
│   │   │   │   ├── normalize-term.ts
│   │   │   │   ├── normalize-meaning.ts
│   │   │   │   ├── input-limits.ts
│   │   │   │   ├── prepare-word.ts
│   │   │   │   ├── word-stats.ts
│   │   │   │   ├── word-list-page.ts
│   │   │   │   ├── word-list-cursor.ts
│   │   │   │   ├── word.ts
│   │   │   │   └── word-repository.ts
│   │   │   ├── application/
│   │   │   │   ├── manage-word.ts
│   │   │   │   └── list-owned-words.ts
│   │   │   ├── api/
│   │   │   │   ├── word-routes.ts
│   │   │   │   └── word-schemas.ts
│   │   │   ├── ui/
│   │   │   │   ├── fetch-json.ts
│   │   │   │   ├── create-word-request.ts
│   │   │   │   ├── word-create-form.tsx
│   │   │   │   ├── word-fields.tsx
│   │   │   │   ├── word-edit-form.tsx
│   │   │   │   ├── word-detail-request.ts
│   │   │   │   ├── word-query-keys.ts
│   │   │   │   ├── list-words-request.ts
│   │   │   │   ├── format-word-stats.ts
│   │   │   │   └── word-list.tsx
│   │   │   └── public.ts
│   │   ├── translation/
│   │   │   ├── domain/
│   │   │   ├── application/
│   │   │   ├── api/
│   │   │   ├── ui/
│   │   │   └── public.ts
│   │   ├── study/
│   │   │   ├── domain/
│   │   │   │   ├── answer-judge.ts
│   │   │   │   ├── normalize-meaning.ts
│   │   │   │   ├── question-selector.ts
│   │   │   │   └── semantic-judge.ts
│   │   │   ├── application/
│   │   │   │   ├── answer-question.ts
│   │   │   │   ├── get-hint.ts
│   │   │   │   └── select-question.ts
│   │   │   ├── api/
│   │   │   ├── ui/
│   │   │   └── public.ts
│   │   └── history/
│   │       ├── domain/
│   │       ├── application/
│   │       ├── api/
│   │       ├── ui/
│   │       └── public.ts
│   ├── infrastructure/
│   │   ├── auth/
│   │   │   ├── better-auth.ts
│   │   │   ├── better-auth.cli.ts     # `auth generate` 専用。secretなし
│   │   │   └── session-adapter.ts
│   │   ├── db/
│   │   │   ├── drizzle.ts
│   │   │   ├── schema/
│   │   │   │   ├── auth.generated.ts
│   │   │   │   ├── words.ts
│   │   │   │   ├── word-meanings.ts
│   │   │   │   └── test-results.ts
│   │   │   └── repositories/
│   │   │       ├── d1-word-repository.ts
│   │   │       └── d1-test-result-repository.ts
│   │   ├── semantic-judge/
│   │   │   └── workers-ai-semantic-judge.ts
│   │   └── translation/
│   │       └── workers-ai-translation-service.ts
│   ├── platform/
│   │   ├── app-error.ts
│   │   ├── clock.ts
│   │   └── ids.ts
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── index.tsx
│   │   ├── login.tsx
│   │   ├── _authenticated.tsx
│   │   └── _authenticated/
│   │       ├── words/
│   │       │   ├── index.tsx
│   │       │   ├── new.tsx
│   │       │   └── $wordId.edit.tsx
│   │       ├── study/
│   │       │   ├── index.tsx
│   │       │   └── session.tsx
│   │       └── history.tsx
│   ├── server/
│   │   ├── api/
│   │   │   ├── app.ts
│   │   │   ├── bindings.ts
│   │   │   ├── error-handler.ts
│   │   │   └── middleware/
│   │   │       ├── auth.ts
│   │   │       ├── origin.ts
│   │   │       ├── rate-limit.ts
│   │   │       └── request-id.ts
│   │   └── composition-root.ts
│   ├── env.d.ts                       # .dev.vars の secret 型。wrangler types と merge
│   ├── styles.css                     # T01公式blank。カード色追加時に分割してよい
│   ├── router.tsx
│   ├── routeTree.gen.ts               # TanStack生成。手編集禁止
│   └── server.ts                      # Hono / Start fetch dispatch
├── tests/
│   ├── integration/
│   │   ├── health.test.ts
│   │   ├── auth.test.ts
│   │   ├── error-contract.test.ts
│   │   ├── ownership.test.ts
│   │   ├── schema-constraints.test.ts
│   │   ├── create-word.test.ts
│   │   ├── list-words.test.ts
│   │   ├── list-words-api.test.ts     # HTTP契約。query parse・422・応答JSON
│   │   ├── update-word.test.ts
│   │   ├── word-detail-api.test.ts    # HTTP契約。GET/PUT・404・Origin・422
│   │   ├── study-api.test.ts
│   │   └── translation-api.test.ts
│   ├── contract/
│   │   ├── semantic-judge.contract.test.ts
│   │   └── translation.contract.test.ts
│   ├── e2e/
│   │   ├── auth.setup.ts
│   │   ├── word-learning.spec.ts
│   │   └── fixtures.ts
│   ├── workers/
│   │   └── dispatch-worker.ts         # Start仮想moduleを避けたWorkers test entry
│   ├── setup/
│   │   ├── apply-migrations.ts
│   │   ├── signed-in-api.ts           # requireAuthだけ差し替えた本番Hono app
│   │   └── test-builders.ts
│   ├── cloudflare-test.d.ts
│   └── tsconfig.json
├── .cta.json
├── .dev.vars.example                  # 名前とダミー値だけ
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── pnpm-workspace.yaml                # pnpm 11 の allowBuilds 等
├── prettier.config.js                 # 公式CLIは .js
├── tsconfig.json
├── tsr.config.json
├── vite.config.ts
├── vitest.config.ts
├── worker-configuration.d.ts          # wrangler types生成。手編集禁止
├── wrangler.jsonc                     # Cloudflare構成の正本
└── wrangler.test.jsonc                # Start仮想moduleを避けるtest worker用
```

実際のTanStack Start scaffoldが生成する名前と異なる場合は、T01で公式生成物を優先し、本書を同じPRで更新する。

## 3. 各ディレクトリの責務

| directory | 置くもの | 置かないもの |
|---|---|---|
| `src/routes` | URL、loader、layout、feature UIのcomposition | SQL、provider call、domain rule |
| `src/features/*/domain` | entity、value、pure rule、port interface | React、Hono、Drizzle、Cloudflare型 |
| `src/features/*/application` | use case、port orchestration、actor scope | 生HTTP、JSX、具体provider SDK |
| `src/features/*/api` | route factory、Zod schema、HTTP mapping | SQL、prompt、UI state |
| `src/features/*/ui` | feature固有component/query/form | 他featureの内部import、DB |
| `src/infrastructure` | portの具体adapter、Drizzle schema/repository | product UI、route composition |
| `src/platform` | featureを跨ぐ小さな基礎型 | 業務概念、何でも入るhelper |
| `src/server/api` | Hono composition、横断middleware | 個別featureの業務処理 |
| `src/components` | 2つ以上のfeatureで実利用するUI primitive | 1画面専用component |
| `tests/integration` | Worker/Hono/D1を跨ぐ振る舞い | pure functionの細粒度case |
| `tests/contract` | 外部provider portの契約 | live providerを通常CIで呼ぶテスト |
| `tests/e2e` | 主要ユーザー動線 | 全組合せ、細部のunit検証 |

## 4. 命名・可読性規約

- TypeScript/TSXファイル: `kebab-case.ts(x)`。
- React component/type/class: `PascalCase`。関数/変数: `camelCase`。
- DB table/column/index: `snake_case`。indexは`idx_<table>_<columns>`。
- test: 対象と同居するunitは`*.test.ts(x)`、integration/E2Eも`*.test.ts`/`*.spec.ts`。
- server-only処理は可能なら`.server.ts`または`infrastructure/server`境界で明示する。
- 原則4階層程度まで。深くなる場合は責務の分け過ぎかfeature肥大化を見直す。
- `index.ts`の無差別barrel exportは禁止。feature外へ公開する契約は`public.ts`へ明示する。
- `features/auth/public.ts` は client bundle に載せてよいものだけ。Start server function は route の beforeLoad から対象moduleを直接importする。
- `routeTree.gen.ts`、`worker-configuration.d.ts`、Drizzle meta等の生成物は手編集しない。

## 5. 依存方向・import規約

```text
routes/ui -> api client
api routes -> application -> domain
infrastructure -> domain ports
composition-root -> application + infrastructure
```

- aliasはpackage.json `imports` の `#/*` を `src/` へ割り当てる。公式 blank scaffold に合わせる。
- feature間importは相手featureの`public.ts`だけを経由する。内部pathへのdeep importは禁止。
- `domain`は同featureのdomainと`platform`のprimitiveにだけ依存できる。
- `application`はdomainとportに依存し、infrastructureを直接`new`しない。
- `composition-root`だけがportとadapterを結線する。
- route/componentから`~/infrastructure/*`をimportしない。
- `platform`へコードを昇格する条件は「2つ以上のfeatureで実使用」「業務意味を持たない」「安定した責務」の3つ全て。

## 6. 拡張手順の例

### 6.1 新しい翻訳providerを追加

1. `TranslationService` portとcontract testは変更しない。
2. `src/infrastructure/translation/<provider>-translation-service.ts`を追加する。
3. provider応答Zod schemaとerror mappingをadapter内へ置く。
4. `composition-root.ts`の設定選択だけを変える。
5. `TECH_STACK.md`、必要なら`OPEN_QUESTIONS.md`とprovider評価結果を更新する。

### 6.2 品詞機能を将来追加

1. REQUIREMENTS/DATABASEを先に更新しmigrationを作る。
2. wordの属性に含めるだけなら`features/words`へ追加する。
3. 独自一覧・辞書連携・ルールを持つまで別featureへ分けない。
4. create/update/listのZod、use case、repository、UI、integration testを同じ縦スライスで更新する。

### 6.3 テスト終了画面を採用

1. OQ-005/OQ-010を決定済みにする。
2. `test_sessions`の必要性をDESIGN/DATABASEで再設計する。
3. `features/study`へsession use case/api/uiを追加する。
4. routesに終了画面を足し、TASKSへ独立タスクを追加する。

## 7. framework規約との整合

- TanStack Router推奨のfile-based routingと`src/routes`、生成`src/routeTree.gen.ts`を利用する。
- `src/server.ts`はTanStack Start公式の `createServerEntry` を拡張する場所とし、Hono分岐以外の業務処理を置かない。
- `wrangler.jsonc` の `main` は `src/server.ts`。公式デフォルトの仮想module `@tanstack/react-start/server-entry` はHono分岐とWorkers Vitestの相性のため使わない。
- Workers integration testは `wrangler.test.jsonc` で Start stub worker を指す。
- Start server functionsはWeb専用の薄い補助に限定し、外部再利用が必要な業務APIはHonoへ置く。

## 8. 設計思想からの逸脱

`getCurrentSession` を `public.ts` に出さない点は、client bundle へ Workers binding を混ぜないためのT02の意図的な例外である。routeのbeforeLoadだけが application module を直接importする。

## 9. 未決事項

- T01で確定したscaffold差: aliasは `#/*`、CSSは `src/styles.css`、Prettier設定は `prettier.config.js`、Start middleware用 `src/start.ts` は未生成（必要になったタスクで追加）。
- T02で確定: Drizzle KitのSQLは `drizzle/` 直下（`drizzle/migrations/` ではない）。secret型は `src/env.d.ts` で Cloudflare.Env へ mergeする。
- AI/翻訳providerがWorkers bindingでなくHTTP APIの場合も、adapter配置は変えない。
- test session採用時のdirectoryはOQ-005/OQ-010決定後に更新する。

## 10. 参照

- [TanStack Start tutorial structure](https://tanstack.com/start/latest/docs/framework/react/tutorial/reading-writing-file)
- [TanStack Router file-based routing](https://tanstack.com/router/latest/docs/routing/file-based-routing)
- [TanStack Start server entry](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 11. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 T01公式scaffoldとの差（alias、styles.css、test worker、wrangler main）を反映
- 2026-08-20 T02でauth配置、D1 migration直下、env.d.ts、public.tsの例外を反映
- 2026-08-20 T03でapp schema、AppError、ownership/error contract testを反映
- 2026-08-20 T04で `/words/new` と word-create-form を反映
- 2026-08-21 T05で `/words` 一覧、統計、`$wordId.edit` 導線を反映
- 2026-08-21 T06で編集フォーム、word-fields、TanStack Queryを反映
- 2026-08-21 T06のreviewで fetch-json、HTTP契約testとsigned-in-api harnessを反映
