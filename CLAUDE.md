# Tango — プロジェクトメモリ（CLAUDE.md / AGENTS.md 共通）

このファイルはコーディングエージェント（Claude Code / Codex等）が作業前に読むプロジェクト基準である。
`CLAUDE.md`と`AGENTS.md`は同一内容で運用し、片方を変えたら同じ変更でもう片方も更新する。

> 現在地: T16（単語の重複登録禁止）作業中。ブランチは `feature/T16-word-duplicate`。公開repositoryは `https://github.com/KuwadaKouhei/Tango`。

## 最優先ルール

- 思考は英語で行い、ユーザーへの回答は日本語の関西弁で返す。
- 実装前に対象タスクと関連ドキュメントを読む。コードは文書に沿って実装する。
- 原典の「要確認」や `docs/OPEN_QUESTIONS.md` の未決事項を、実装都合で確定仕様にしない。
- タスクの意思決定期限までに未決なら作業を止め、ユーザーへ判断を求める。
- コードを変更したら、影響する文書も同じPRで更新する。
- 仕様・設計変更は文書を先に更新し、合意してからコードへ反映する。
- エラーを握りつぶさない。検証結果は最終変更後に取り直す。

## ドキュメント体系

| ドキュメント | 役割 | 参照タイミング |
|---|---|---|
| `Tango_requirements.md` | ユーザー会話から作られた原典 | 決定済み/要確認の原文を確認するとき |
| `docs/REQUIREMENTS.md` | 正規化したMVP要件・AC-001〜011 | 何を作るか、完了を判断するとき |
| `docs/OPEN_QUESTIONS.md` | 未決事項・決定期限・状態 | 全タスク着手前。未決を勝手に固定しないため |
| `docs/FEASIBILITY.md` | 公式情報による実現性・制約・PoC | 技術リスク、料金、PoCを確認するとき |
| `docs/philosophy/PLAN_PHILOSOPHY.md` | 設計思想・依存方向 | 構造、境界、抽象化を判断するとき |
| `docs/philosophy/CODING_PHILOSOPHY.md` | 実装思想・型・エラー・命名 | コードを書く前 |
| `docs/philosophy/TEST_PHILOSOPHY.md` | テスト比率・mock・CI gate | テストを設計・実行するとき |
| `docs/GIT_CONVENTIONS.md` | branch、commit、PR規約 | Git初期化後の全変更 |
| `docs/TECH_STACK.md` | 採用技術・比較・候補version | scaffold、依存追加・更新時 |
| `docs/DESIGN.md` | アーキテクチャ、port、API、flow | 実装の全体像・契約を確認するとき |
| `docs/DATABASE.md` | D1 schema、ER図、FK、index、migration | DB・repository・migration変更時 |
| `docs/DIRECTORY_STRUCTURE.md` | 配置、命名、import方向 | ファイルの追加・移動時 |
| `docs/TASKS.md` | T01〜T15の実装駆動表 | 次タスク、依存、AC、状態を確認するとき |

## 文書の優先順位

1. ユーザーが明示した最新の指示。
2. `Tango_requirements.md` の決定済み事項と `docs/REQUIREMENTS.md`。
3. 決定済みになった `docs/OPEN_QUESTIONS.md`。
4. DESIGN / DATABASE / TECH_STACK。
5. philosophy / directory / task / conventions。

矛盾を見つけたら独断でコードに合わせず、影響を示して文書を直す。原典で「要確認」の事項は、他文書の暫定案より優先して未決として扱う。

## アーキテクチャの守り方

- 構成はCloudflare Workers上のモジュラーモノリス。
- `src/server.ts`で `/api/*` をHonoへ、その他をTanStack Startへ渡す。
- 依存方向は route/UI/adapters → application → domain。
- domainからReact、Hono、Drizzle、Better Auth、Cloudflare型をimportしない。
- Webと将来のChrome拡張で再利用する業務境界はHono `/api/v1`。
- session由来の `actorUserId` だけを信用し、bodyのuser IDで所有者を決めない。
- repository queryは所有者scopeを必須にし、他ユーザー資源は404で扱う。
- exact → normalized → AIの順序を変えず、先に決着したらAIを呼ばない。
- AI・翻訳はport越しにし、provider SDKをUI/application/domainへ漏らさない。
- 統計はまず `test_results` から算出し、計測なしに集計cacheを追加しない。

## 実装ルール

- TypeScript strict。外部入力は `unknown` からZod等で検証し、`any`を原則使わない。
- business ruleはpure functionへ寄せ、DB、時刻、乱数、networkを注入可能にする。
- HTTP routeへSQL、prompt、正規化ruleを書かない。
- 想定内失敗は安定したerror code、想定外はcauseを保持してAPI境界で安全な500へ変換する。
- 生のSQL/stack/provider応答/secretを公開errorへ含めない。
- `routeTree.gen.ts`、`worker-configuration.d.ts`、Drizzle生成metaを手編集しない。
- 責務不明な `utils` / `common` を作らない。feature間は `public.ts` だけを介する。
- 未使用の将来抽象、microservice、event bus、集計tableを先に作らない。

## セキュリティ

- OAuth secret、API key、Cloudflare token、Cookie、`.env`、`.dev.vars`をcommit・表示・logしない。
- secret値をユーザーへ要求しない。設定が必要なら保存先と変数名だけ案内する。
- private APIは全てsession確認。mutationはOriginも検証する。
- CORSはMVPではsame-origin。将来extension用の `*` やtoken認証を先回りしない。
- AIへuser profile、session、OAuth情報を送らない。
- answer/meaning/prompt全文を既定logへ出さない。
- AI/翻訳には入力長、timeout、rate limit、料金上限を設ける。

## DB・migration

- Better Auth schemaはlockした採用versionのCLIで生成し、手で推測しない。
- word + meaningsの複数SQLはD1 batchで原子的に扱う。
- 意味0件を保存しない。
- `test_results(word_id,user_id)` と `words(id,user_id)` の所有者一致を守る。
- OQ-009はカスケード削除で決定済み。migration適用まで公開DELETEを出さない。
- 適用済みmigrationを改変しない。productionで無審査のschema pushをしない。
- schema変更時は `docs/DATABASE.md` とmigration/rollback/testを同時更新する。

## テストと検証

- pure domainはunit、Hono/D1/Workers境界はWorkers Vitest integration、主要動線だけPlaywright。
- 外部AI/翻訳を通常CIでlive callせず、contract mockと別の固定評価runを使う。
- 認可・判定順序・正規化の全branchを重点的に覆う。
- バグ修正は失敗する再現testを先に追加する。
- 最終変更後にformat、lint、typecheck、unit/integration、buildを再実行する。
- 実装後にpackage scriptが存在することを確認してからコマンドを実行し、存在しないコマンドを推測しない。
- gate未実行・失敗・外部環境未検証を「成功」と報告しない。

## Git・タスク運用

- GitHub repositoryは `KuwadaKouhei/Tango`、visibilityはPUBLIC、既定branchは`main`。公開範囲を変える前に確認する。
- ユーザーの明示依頼なしにpush、PR作成、merge、visibility変更、repository削除をしない。
- Git導入後は `docs/GIT_CONVENTIONS.md` に従う。
- `docs/TASKS.md` の上から依存順に、1タスク=1branch=1PRで進める。
- branchは `feature/<task-id>-<slug>`。
- AIはPRをmergeしない。人間のmerge後に次タスクへ進む。
- PR本文にタスクID、AC、test結果、review結果、未確認事項、文書更新を書く。
- 状態が変わったらTASKSの状態列を更新する。

## 変更時の文書更新例

- 要件/AC変更 → `Tango_requirements.md`、REQUIREMENTS、OPEN_QUESTIONS、TASKS。
- API変更 → DESIGN、contract test、必要ならREQUIREMENTS。
- schema変更 → DATABASE、Drizzle migration、integration test。
- provider/model変更 → TECH_STACK、FEASIBILITY、DESIGN、評価結果。
- directory/import変更 → DIRECTORY_STRUCTURE。
- 方針の例外 → 対応philosophyとDESIGNの逸脱節。
- task追加・分割・完了 → TASKS。

## 現在の必須レビュー項目

- OQ-013/014/016/017: 承認済み。
- OQ-008/009/018: 2026-08-22に決定済み。決定内容は `docs/OPEN_QUESTIONS.md` 3節。
- T01〜T06: マージ済み。T16は作業中。
- OQ-008は `0002_boring_kabuki` で適用済み。重複登録は409で拒否する。
- OQ-009のmigrationは未適用。履歴ありwordは消せないままで、実装はT07。
- 各タスク前: TASKSの意思決定列にあるOQ。
