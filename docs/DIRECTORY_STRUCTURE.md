# ディレクトリ構造: Tango

> 状態: **レビュー待ち**
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
│   ├── migrations/
│   └── meta/                          # Drizzle Kit生成物
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
│   │   │   ├── api/
│   │   │   ├── ui/
│   │   │   └── public.ts
│   │   ├── words/
│   │   │   ├── domain/
│   │   │   │   ├── normalize-term.ts
│   │   │   │   ├── word.ts
│   │   │   │   └── word-repository.ts
│   │   │   ├── application/
│   │   │   │   ├── create-word.ts
│   │   │   │   ├── list-words.ts
│   │   │   │   ├── update-word.ts
│   │   │   │   └── delete-word.ts
│   │   │   ├── api/
│   │   │   │   ├── word-routes.ts
│   │   │   │   └── word-schemas.ts
│   │   │   ├── ui/
│   │   │   │   ├── word-card.tsx
│   │   │   │   ├── word-form.tsx
│   │   │   │   └── word-queries.ts
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
│   │   ├── ids.ts
│   │   ├── pagination.ts
│   │   └── result.ts
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
│   ├── styles/
│   │   ├── global.css
│   │   ├── tokens.css
│   │   └── mastery-colors.ts
│   ├── router.tsx
│   ├── routeTree.gen.ts               # TanStack生成。手編集禁止
│   ├── server.ts                      # Hono / Start fetch dispatch
│   └── start.ts                       # Start middleware設定
├── tests/
│   ├── integration/
│   │   ├── auth-isolation.test.ts
│   │   ├── word-api.test.ts
│   │   ├── study-api.test.ts
│   │   └── translation-api.test.ts
│   ├── contract/
│   │   ├── semantic-judge.contract.test.ts
│   │   └── translation.contract.test.ts
│   ├── e2e/
│   │   ├── auth.setup.ts
│   │   ├── word-learning.spec.ts
│   │   └── fixtures.ts
│   └── setup/
│       ├── apply-migrations.ts
│       └── test-builders.ts
├── .dev.vars.example                  # 名前とダミー値だけ
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── drizzle.config.ts
├── eslint.config.js
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── prettier.config.mjs
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── worker-configuration.d.ts          # wrangler types生成。手編集禁止
└── wrangler.jsonc                     # Cloudflare構成の正本
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
- `routeTree.gen.ts`、`worker-configuration.d.ts`、Drizzle meta等の生成物は手編集しない。

## 5. 依存方向・import規約

```text
routes/ui -> api client
api routes -> application -> domain
infrastructure -> domain ports
composition-root -> application + infrastructure
```

- aliasは`~/`を`src/`へ割り当てる。
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
- `src/server.ts`はTanStack Start公式server entryを拡張する場所とし、Hono分岐以外の業務処理を置かない。
- `wrangler.jsonc`をCloudflare構成の正本とし、D1/AI binding typeは`wrangler types`で生成する。
- Start server functionsはWeb専用の薄い補助に限定し、外部再利用が必要な業務APIはHonoへ置く。

## 8. 設計思想からの逸脱

現時点で意図的な逸脱はない。`src/platform`が肥大化する場合はfeatureへ戻すか、責務別top-level directoryへ分割する。

## 9. 未決事項

- 実scaffoldによるroute filenameとconfig差はT01で確定する。
- AI/翻訳providerがWorkers bindingでなくHTTP APIの場合も、adapter配置は変えない。
- test session採用時のdirectoryはOQ-005/OQ-010決定後に更新する。

## 10. 参照

- [TanStack Start tutorial structure](https://tanstack.com/start/latest/docs/framework/react/tutorial/reading-writing-file)
- [TanStack Router file-based routing](https://tanstack.com/router/latest/docs/routing/file-based-routing)
- [TanStack Start server entry](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

## 11. 更新履歴

- 2026-08-20 初版作成
