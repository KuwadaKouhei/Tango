# 実現可能性調査: Tango MVP

> 調査日: 2026-08-20
> 状態: **条件付きで実現可能。POC-01/02は合格。**
> 主要技術は公式ドキュメントとnpmレジストリの当日スナップショットで確認した。バージョンと料金は実装開始時・本番公開前に再確認する。

## 1. 概要・調査範囲

認証、ユーザー分離、単語CRUD、複数意味、D1永続化、翻訳、段階的正誤判定、AI判定、統計、Cloudflare配備、将来のREST API再利用性を検証した。既存コードはなく、`Tango_requirements.md` だけの新規プロジェクトである。

判定は次を用いる。

- **実現可能**: 公式に対応する既知の手段があり、通常の実装で達成できる。
- **条件付き可能**: 公式対応はあるが、PoC、仕様決定、上限・料金・障害設計が必要。
- **困難**: 現構成のまま達成する既知の手段がない。

## 2. 判定サマリ

| 検証単位 | 判定 | 根拠・主な条件 |
|---|---|---|
| TanStack StartをCloudflare Workersへ配備 | 条件付き可能 | 公式Cloudflare Workers手順とViteプラグインがある一方、製品ページはRC表記。最小構成PoCが必要 |
| TanStack StartとHono REST APIの単一Worker共存 | 条件付き可能 | Startはfetch形式のカスタムserver entryを提供し、HonoもWorkersのfetch handlerを提供。`/api/*` 分岐をPoCする |
| Better Auth + Google OAuth + D1 | 条件付き可能 | Google OAuthとD1が公式対応。Workersではリクエスト時bindingで構成し、生成スキーマ・Cookie・callback URLを検証する |
| Drizzle + D1 | 実現可能 | DrizzleがD1 driverとWorkers環境を公式サポート |
| ユーザー分離・単語CRUD・複数意味 | 実現可能 | RDBのFK、API所有者スコープ、D1 batchで整合性を持たせられる |
| 完全一致・正規化一致 | 実現可能 | TypeScriptの決定的な純粋関数で実装・単体テスト可能 |
| AI意味判定 | 条件付き可能 | Workers AI等で実装可能だが、モデル、構造化出力、品質、料金、タイムアウト、障害時仕様が未決 |
| 翻訳候補 | 条件付き可能 | Workers AIには翻訳タスクがあるが、候補品質・件数・料金とプロバイダーが未決 |
| ランダム／苦手優先出題 | 条件付き可能 | 履歴集計と重み付き抽選で可能。重み、未回答、重複、件数の仕様決定が必要 |
| 履歴・正解率・カード色 | 実現可能 | 履歴集計で算出可能。正確な色・アクセシビリティ基準のみ未決 |
| 将来Chrome拡張から同じAPIを利用 | 条件付き可能 | REST境界は再利用可能。拡張向け認証、CORS、権限は将来PoCが必要 |
| 想定MVP規模でのD1利用 | 条件付き可能 | 最大容量は十分と見込むが、単一DBはクエリを逐次処理するため、件数・同時利用の目標設定と計測が必要 |

困難判定はない。ただし条件付き項目を検証せずに本実装へ進めると、認証・配備・AI品質で大きな手戻りが発生する。

## 3. 調査詳細

### 3.1 TanStack Start / Cloudflare / Hono

- TanStack Start公式ホスティングガイドはCloudflareを公式パートナーとして挙げ、`@cloudflare/vite-plugin` と `wrangler` を使う配備手順を示している。
- TanStack Startの現行製品ページは **RC** と表示されており、API・生成物・統合手順の変化を前提にlockfile固定が必要である。
- Startのserver entryはWinterCG互換の `fetch(Request)` 形式でカスタマイズできる。HonoもCloudflare Workers上で `app.fetch` を提供するため、同一entryで `/api/*` をHonoへ、それ以外をStartへ委譲できると判断する。これは公式仕様を組み合わせた**設計上の推論**であり、T01で実ビルド・preview・deployを検証する。
- Cloudflare WorkersはFreeでCPU 10ms、メモリ128MB、50 subrequests/request等の制限がある。SSRとAI呼び出しを含むため、Freeのみを前提にせず計測する。

出典:

- [TanStack Start: Hosting](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
- [TanStack Start: Server Entry Point](https://tanstack.com/start/latest/docs/framework/react/guide/server-entry-point)
- [TanStack Start 製品ページ](https://tanstack.com/start/latest)
- [Hono: Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)

### 3.2 Better Auth / Google OAuth / D1

- Better AuthはGoogleを含むsocial providerを公式にサポートする。
- Better Auth 1.5以降はD1 bindingを第一級のDBとして扱う。D1に対話的トランザクションがないため、Better Authはbatchを利用する。
- Better AuthのDrizzle adapterはSQLite providerをサポートし、CLIで認証スキーマを生成できる。認証テーブルを本設計で手作業推測せず、採用バージョンのCLI生成結果をレビューする方針は妥当である。
- Workersでは環境変数・bindingをリクエスト時に取得する必要がある。モジュール評価時の `process.env` 読み取りは未定義や秘密情報のbundle混入リスクがある。

出典:

- [Better Auth: OAuth](https://better-auth.com/docs/concepts/oauth)
- [Better Auth: Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Better Auth 1.5: Cloudflare D1 support](https://better-auth.com/blog/1-5)
- [TanStack Start: Environment Variables](https://tanstack.com/start/latest/docs/framework/react/guide/environment-variables)

### 3.3 D1 / Drizzle / データ整合性

- DrizzleはCloudflare D1とWorkers環境を公式にサポートする。
- D1はFKを定義・強制できる。複数意味の1件以上制約は単純なCHECKだけでは表現できないため、アプリの入力検証と単一batchによる親子更新を併用する。
- `D1Database.batch()` は複数文を順に実行するトランザクションで、途中失敗時は全体をrollbackするため、単語と意味の原子的な作成・更新に利用できる。
- D1はPaidで1DB最大10GB、Freeで500MB。各DBは本質的にsingle-threadedでクエリを順に処理するため、集計インデックス、ページング、クエリ計測が必要である。

出典:

- [Drizzle ORM: Cloudflare D1](https://orm.drizzle.team/docs/sqlite/connect-cloudflare-d1)
- [Cloudflare D1: Foreign keys](https://developers.cloudflare.com/d1/sql-api/foreign-keys/)
- [Cloudflare D1: batch](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

### 3.4 AI意味判定・翻訳

- Workers AIはWorkers bindingから利用でき、テキスト生成・翻訳を含むタスクを提供する。
- 2026-08-20時点の標準上限例はText Generation 300 requests/min、Translation 720 requests/minだが、モデル別制限・料金・プラン要件は変動する。
- AIの意味一致は決定的ではない。構造化出力のschema検証、temperature抑制、短いprompt、タイムアウト、結果の説明可能性、外部呼び出しモックが必要である。
- 文字列一致でAIを呼ばない設計はコスト・遅延・誤判定を減らし、要件に整合する。

出典:

- [Cloudflare Workers AI overview](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare Workers AI limits](https://developers.cloudflare.com/workers-ai/platform/limits/)
- [Cloudflare Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

### 3.5 テスト

- CloudflareはWorkers向けに `@cloudflare/vitest-pool-workers` を推奨し、D1 migration、binding、Workers runtime内の統合テストを提供する。
- 現行公式ガイドはVitest 4.1以上を要求する。ブラウザー主要動線はPlaywrightで少数のE2Eを用意する。

出典:

- [Cloudflare Workers: Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Cloudflare Workers: first Vitest test](https://developers.cloudflare.com/workers/testing/vitest-integration/write-your-first-test/)

## 4. 主要リスクと不確実性

| リスク | 影響 | 対策 |
|---|---|---|
| TanStack StartがRC | build・entry・ルーティングの破壊的変更 | T01で公式例から最小PoC、lockfile固定、更新は別PR |
| Better AuthとStart/Honoの境界 | callback、Cookie、SSR sessionの不整合 | T02でGoogle test clientを使う認証縦スライスを先行 |
| D1に対話的transactionがない | 親子更新・複雑な処理の整合性 | 単純な処理へ分解し、複数SQLはD1 batchを使用 |
| D1単一DBの逐次実行 | 履歴集計が増えた際の待ち | 複合index、ページング、計測、必要時だけ集計キャッシュ |
| AI品質・非決定性 | 同じ意味でも判定揺れ、誤判定 | 評価データセット、schema検証、モデル固定、閾値ではなくboolean+理由、品質基準を決定 |
| AI/翻訳の料金・容量 | denial-of-wallet、429、UX低下 | 認証、rate limit、短い入力上限、予算アラート、timeout、仕様化したfallback |
| 削除と履歴の扱いが未決 | FK・監査・統計の後戻り | OQ-009を初回migration確定前に決める |
| Chrome拡張認証が未決 | Cookie/CORS設計の作り直し | MVPではRESTドメイン境界のみ確保し、認証方式は将来設計 |

## 5. 必須PoC・検証

| PoC | 合格条件 | 関連タスク |
|---|---|---|
| POC-01 Start + Cloudflare | `dev`、Workers preview、production buildが成功し、SSR画面が応答する | T01 **合格**（2026-08-20: `vite dev` / `vite build` / `vite preview`、`/` が HTML） |
| POC-02 Hono共存 | `/api/v1/health` はHono、それ以外はStartが処理し、404/例外形式が混線しない | T01 **合格**（2026-08-20: healthは JSON `{"status":"ok"}`、未知APIはJSON 404、`/` はHTML） |
| POC-03 Better Auth + Google + D1 | login、callback、session、logout、再ログインがpreview環境で通る | T02 |
| POC-04 Drizzle migration | ローカルD1とpreview D1に同一migrationを適用し、FKとbatch rollbackを確認 | T03 |
| POC-05 AI意味判定 | 代表的な正解・不正解・曖昧回答の固定評価セットで品質とp95遅延、構造化出力失敗率を記録 | T11 |
| POC-06 翻訳候補 | 代表単語セットで候補品質、複数候補、遅延、料金を比較 | T08 |

## 6. 技術比較と推奨

- **ホスティング**: 要件でCloudflareが決定済み。Startの公式Cloudflare手順を第一候補にし、RC統合が失敗した場合だけHono Worker + SPA等への差し戻しを検討する。
- **認証**: Better Authが決定済み。D1 first-class supportかDrizzle adapterのどちらが採用バージョンで安定するかをPOC-03で比較する。
- **AI/翻訳**: Workers AIを最初の比較対象とするが、ポートを固定しない。品質または料金条件を満たさなければDeepL、Google Translation、他LLMへ交換する。
- **テスト**: Node上だけのVitestではWorkers固有差を見逃すため、CloudflareのWorkers Vitest integrationを採用する。

## 7. 前提・制約

- 依存バージョンは `TECH_STACK.md` の調査時点候補であり、POC-01〜04合格後にlockfileを正とする。
- MVPの実利用規模と性能SLOは未確定。公開前にOQ-012を決める。
- Google OAuthのclient ID/secret、Cloudflare token等はユーザーが安全なsecret storeへ設定し、文書・ログ・Gitへ保存しない。
- AIへ送るのは英単語、登録意味、回答に限定し、不要なユーザープロフィールやセッション情報を含めない。

## 8. 差し戻し提案

困難判定はないため要件全体の差し戻しは不要。ただし OQ-001〜OQ-009、OQ-012〜OQ-015 は記載したタスク期限までに決める。PoCが不合格なら、該当技術またはMVP範囲を要件フェーズへ差し戻す。

## 9. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 POC-01/02をT01で合格と記録
