# ディレクトリ構造: Tango

> 状態: **T14で一覧カードの正解率色を追加済み**
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
│   │   │   │   ├── mastery-card-color.ts
│   │   │   │   ├── word-list-page.ts
│   │   │   │   ├── word-list-cursor.ts
│   │   │   │   ├── word-list-search.ts
│   │   │   │   ├── escape-like-pattern.ts
│   │   │   │   ├── word.ts
│   │   │   │   └── word-repository.ts
│   │   │   ├── application/
│   │   │   │   ├── manage-word.ts
│   │   │   │   └── list-owned-words.ts
│   │   │   ├── api/
│   │   │   │   ├── word-routes.ts
│   │   │   │   └── word-schemas.ts
│   │   │   ├── ui/
│   │   │   │   ├── create-word-request.ts
│   │   │   │   ├── word-create-form.tsx
│   │   │   │   ├── word-fields.tsx
│   │   │   │   ├── apply-translation-candidate.ts
│   │   │   │   ├── word-edit-form.tsx
│   │   │   │   ├── word-detail-request.ts
│   │   │   │   ├── word-query-keys.ts
│   │   │   │   ├── list-words-request.ts
│   │   │   │   ├── format-word-stats.ts
│   │   │   │   └── word-list.tsx
│   │   │   └── public.ts
│   │   ├── translation/
│   │   │   ├── domain/
│   │   │   │   ├── translation-limits.ts
│   │   │   │   └── translation-service.ts
│   │   │   ├── application/
│   │   │   │   └── get-translation-candidates.ts
│   │   │   ├── api/
│   │   │   │   ├── translation-routes.ts
│   │   │   │   └── translation-schemas.ts
│   │   │   ├── ui/
│   │   │   │   └── request-translation-candidates.ts
│   │   │   └── public.ts
│   │   ├── study/
│   │   │   ├── domain/
│   │   │   │   ├── study-limits.ts
│   │   │   │   ├── study-question.ts
│   │   │   │   ├── planned-count.ts
│   │   │   │   ├── question-selector.ts
│   │   │   │   ├── weakness-weight.ts
│   │   │   │   ├── normalize-for-judgement.ts
│   │   │   │   ├── answer-judge.ts
│   │   │   │   ├── prepare-answer.ts
│   │   │   │   ├── ai-judge-limits.ts
│   │   │   │   ├── ai-judge-prompt.ts
│   │   │   │   ├── semantic-judge.ts
│   │   │   │   └── summarize-study-session.ts
│   │   │   ├── application/
│   │   │   │   ├── get-hint.ts
│   │   │   │   ├── select-question.ts
│   │   │   │   └── answer-question.ts
│   │   │   ├── api/
│   │   │   │   ├── study-routes.ts
│   │   │   │   └── study-schemas.ts
│   │   │   ├── ui/
│   │   │   │   ├── study-setup-form.tsx
│   │   │   │   ├── study-session.tsx
│   │   │   │   ├── study-session-search.ts
│   │   │   │   ├── request-next-question.ts
│   │   │   │   ├── request-hint.ts
│   │   │   │   ├── request-answer.ts
│   │   │   │   ├── describe-answer-judgement.ts
│   │   │   │   ├── describe-answer-result-announcement.ts
│   │   │   │   ├── study-answer-result.tsx
│   │   │   │   ├── format-study-session-summary.ts
│   │   │   │   └── study-session-summary.tsx
│   │   │   └── public.ts
│   │   └── history/
│   │       ├── domain/
│   │       │   ├── test-result.ts
│   │       │   └── test-result-repository.ts
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
│   │       └── deepl-translation-service.ts
│   ├── platform/
│   │   ├── app-error.ts
│   │   ├── clock.ts
│   │   ├── random.ts
│   │   ├── fetch-json.ts
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
│   ├── styles.css                     # T01公式blank。T14のカード色はここに残す
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
│   │   ├── word-duplicate-api.test.ts # HTTP契約。409・正規化同一視・UNIQUE違反変換
│   │   ├── word-delete-api.test.ts    # HTTP契約。DELETE 204・cascade・404・Origin
│   │   ├── study-api.test.ts              # HTTP契約。出題・hint・404・422・所有者分離
│   │   └── translation-api.test.ts    # HTTP契約。200・DB未更新・422・429・502・503
│   ├── contract/
│   │   ├── semantic-judge.contract.test.ts
│   │   └── translation.contract.test.ts
│   ├── eval/
│   │   └── ai-judge.eval.test.ts      # POC-05固定評価セット。live callしない
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
| `tests/eval` | AI判定の固定評価セット | live Workers AI を通常CIの合否へ使う |
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

1. `TranslationService` portの入出力契約（成功/502/503/429）は維持する。adapter固有のrequest/response testは差し替える。
2. `src/infrastructure/translation/<provider>-translation-service.ts`を追加する。
3. provider応答Zod schemaとerror mappingをadapter内へ置く。
4. `composition-root.ts`の設定選択だけを変える。
5. `TECH_STACK.md`、必要なら`OPEN_QUESTIONS.md`とprovider評価結果を更新する。

### 6.2 品詞機能を将来追加

1. REQUIREMENTS/DATABASEを先に更新しmigrationを作る。
2. wordの属性に含めるだけなら`features/words`へ追加する。
3. 独自一覧・辞書連携・ルールを持つまで別featureへ分けない。
4. create/update/listのZod、use case、repository、UI、integration testを同じ縦スライスで更新する。

### 6.3 テスト終了画面（OQ-010採用、T13）

1. `test_sessions` は作らない。今回の判定応答をクライアントが保持し、同じ `/study/session` 上で終了結果へ切り替える。
2. 別URLの終了画面は作らない。URLへ結果を載せず、リロードで状態は消える。
3. 再テスト操作とsession repositoryは作らない。一覧へ戻るを必須導線にする。

### 6.4 単語検索（OQ-010採用、T18）

1. 新featureは作らず `features/words` の list use case / schema / 一覧UIへ `q` を足す。
2. FTSテーブルは作らない。

### 6.5 正解率カード色（OQ-007採用、T14）

1. 色の式は `features/words/domain/mastery-card-color.ts` の純粋関数へ置く。routeやCSS変数へ式を埋め込まない。
2. 段階パレットは作らない。未回答と0%は背景と文字labelの両方で分ける。
3. カード用CSSは件数少ないので `src/styles.css` に残す。分割はルールが増えてからでよい。

## 7. framework規約との整合

- TanStack Router推奨のfile-based routingと`src/routes`、生成`src/routeTree.gen.ts`を利用する。
- `src/server.ts`はTanStack Start公式の `createServerEntry` を拡張する場所とし、Hono分岐以外の業務処理を置かない。
- `wrangler.jsonc` の `main` は `src/server.ts`。公式デフォルトの仮想module `@tanstack/react-start/server-entry` はHono分岐とWorkers Vitestの相性のため使わない。
- Workers integration testは `wrangler.test.jsonc` で Start stub worker を指す。
- Start server functionsはWeb専用の薄い補助に限定し、外部再利用が必要な業務APIはHonoへ置く。

## 8. 設計思想からの逸脱

`getCurrentSession` を `public.ts` に出さない点は、client bundle へ Workers binding を混ぜないためのT02の意図的な例外である。routeのbeforeLoadだけが application module を直接importする。

## 9. 未決事項

- T01で確定したscaffold差: aliasは `#/*`、CSSは `src/styles.css`（T14のカード色も分割せず残す）、Prettier設定は `prettier.config.js`、Start middleware用 `src/start.ts` は未生成（必要になったタスクで追加）。
- T02で確定: Drizzle KitのSQLは `drizzle/` 直下（`drizzle/migrations/` ではない）。secret型は `src/env.d.ts` で Cloudflare.Env へ mergeする。
- AI/翻訳providerがWorkers bindingでなくHTTP APIの場合も、adapter配置は変えない。
- T10で `features/study/domain/normalize-for-judgement.ts` を追加した。保存用 normalize とは分ける。`SemanticJudge` portはT10で型と呼び出し点を用意し、Workers AI adapterはT12で追加した。

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
- 2026-08-22 T16で word-duplicate-api.test.ts を追加
- 2026-08-22 T07で word-delete-api.test.ts を追加
- 2026-08-22 T08で translation feature、Workers AI adapter、fetch-jsonのplatform昇格、contract testを追加
- 2026-08-23 T17で翻訳adapterを deepl-translation-service へ差し替え
- 2026-08-23 OQ-005/010決定。終了画面はsession tableなし、検索はwords featureへ足す。T10で判定用normalizeをstudy domainへ置く
- 2026-08-23 T18で word-list-search と escape-like-pattern を追加
- 2026-08-23 T09で study feature、`/study`、`/study/session`、study-api test を追加。判定と苦手抽選のfileはT10/T11
- 2026-08-23 T10で判定用normalize、answer API、history/public.ts、セッション回答UIを追加。T12 adapterは未作成
- 2026-08-24 T11で weakness-weight と重み付き抽選を追加。苦手候補queryは words LEFT JOIN test_results
- 2026-08-24 T12で Workers AI semantic judge adapter、ai-judge-limits/prompt、contract/eval test を追加
- 2026-08-24 T13で summarize-study-session と終了結果UIを追加。別の `/history` route は作らない
- 2026-08-25 T14で mastery-card-color を追加。カード色CSSは styles.css に残す
