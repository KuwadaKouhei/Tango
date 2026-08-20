# 設計: Tango MVP

> 状態: **思想承認済み。Worker entryはT01、Google認証はT02で確認済み。**
> 入力: `REQUIREMENTS.md`、`FEASIBILITY.md`、`philosophy/PLAN_PHILOSOPHY.md`、`TECH_STACK.md`
> 未決事項は `OPEN_QUESTIONS.md` を参照し、本文の暫定案を確定仕様として扱わない。

## 1. 概要・設計方針

Tangoを、TanStack StartのWeb UIとHono REST APIを1つのCloudflare Workerで配信するモジュラーモノリスとして設計する。機能はドメイン単位で分け、判定・正規化・出題などの中心ロジックをD1、Hono、React、AI providerから独立させる。

設計の要点:

- API入口で認証し、全ユースケースへセッション由来の`actorUserId`を渡す。
- repositoryは全クエリを所有者IDでscopeし、他ユーザーの資源を404として扱う。
- exact → normalized → AIの順序を1つの`AnswerJudge`に集約する。
- AI・翻訳はport越しに呼び、provider固有のmodel・timeout・errorをadapterへ閉じ込める。
- 履歴を正本とし、統計はまずqueryで算出する。
- 将来Chrome拡張は同じ`/api/v1`を使うが、拡張認証・CORSはMVP外とする。

## 2. アーキテクチャ概要

```text
Browser
  │
  ├── page/asset request ───────────────────────────────┐
  │                                                     │
  └── /api/* request ───────────────┐                   │
                                    v                   v
                         +-------------------------------+
                         | Cloudflare Worker server.ts   |
                         | requestId / route dispatch    |
                         +-------------+-----------------+
                                       |
                    +------------------+------------------+
                    |                                     |
                    v                                     v
          +-------------------+                 +-------------------+
          | Hono API          |                 | TanStack Start    |
          | /api/auth/*       |                 | SSR / routes / UI |
          | /api/v1/*         |                 +---------+---------+
          +---------+---------+                           |
                    |                                     |
                    +------------------+------------------+
                                       v
                          +-------------------------+
                          | Application use cases   |
                          | actor / policy / ports  |
                          +------------+------------+
                                       |
                           +-----------+-----------+
                           |                       |
                           v                       v
                 +------------------+    +---------------------+
                 | Domain           |    | Infrastructure      |
                 | words / study    |    | Drizzle+D1          |
                 | judge / stats    |    | Better Auth         |
                 +------------------+    | Workers AI/other    |
                                         +---------------------+
```

### 2.1 Worker entryの責務

1. request IDを生成または`CF-Ray`から関連付ける。
2. `/api/*`をHonoへ渡す。
3. その他をTanStack Start handlerへ渡す。
4. 未捕捉例外を構造化ログへ記録し、APIは共通JSON、Webは汎用error boundaryで返す。

StartとHonoの共存はPOC-02で確認した。`wrangler.jsonc` の `main` は `src/server.ts` とし、`/api` と `/api/*` をHono、それ以外を TanStack Start の `createServerEntry` へ渡す。

## 3. コンポーネント／モジュール

| モジュール | 主な責務 | 依存してよい先 |
|---|---|---|
| `auth` | Better Auth handler、session取得、認証middleware | Better Auth adapter、D1 |
| `words` | 単語・複数意味・ヒントのCRUD、所有者scope | domain、WordRepository port |
| `translation` | 候補取得、provider応答検証、候補整形 | TranslationService port |
| `study` | 出題、ヒント取得、回答判定、履歴保存 | Word/Result repositories、SemanticJudge port、domain |
| `history` | 回答履歴一覧、単語別統計query | ResultRepository、stats domain |
| `api` | Hono route、validation、auth、HTTP mapping | application modules |
| `web` | TanStack routes、Query hooks、forms、表示状態 | `/api/v1` client |
| `infrastructure/db` | Drizzle schema、D1 repository、migration | D1 binding |
| `infrastructure/ai` | Workers AI等のprovider adapter | provider binding/API |

### 3.1 Domain ports

```ts
interface WordRepository {
  listByOwner(input: ListWordsQuery): Promise<Page<WordWithStats>>
  findOwnedById(ownerUserId: UserId, wordId: WordId): Promise<Word | null>
  create(input: NewWord): Promise<Word>
  update(input: UpdatedWord): Promise<Word>
  deleteOwned(ownerUserId: UserId, wordId: WordId): Promise<boolean>
}

interface TestResultRepository {
  append(result: NewTestResult): Promise<TestResult>
  listByOwner(input: ListHistoryQuery): Promise<Page<TestResultView>>
}

interface TranslationService {
  translateToJapanese(input: TranslationInput, signal: AbortSignal): Promise<TranslationCandidate[]>
}

interface SemanticJudge {
  judge(input: SemanticJudgeInput, signal: AbortSignal): Promise<SemanticJudgeResult>
}

interface RandomSource {
  next(): number // 0 <= value < 1
}

interface Clock {
  nowEpochMs(): number
}
```

portの入力・出力はdomain型とprimitiveだけを使い、Hono `Context`、D1、provider SDK型を含めない。

## 4. 概念データモデル

```text
BetterAuthUser 1 ─── * Word 1 ─── 1..* WordMeaning
       │                 │
       └──────── * TestResult *
```

### 4.1 エンティティ

- **User**: Better Authが管理する認証主体。アプリは`id`だけを所有者参照に使う。
- **Word**: `userId`、`term`、検索/比較用`normalizedTerm`、任意`hint`、時刻を持つ。
- **WordMeaning**: Word配下の1件以上の意味。表示順と`normalizedMeaning`を持つ。
- **TestResult**: 回答時点の`userId`、`wordId`、回答、最終正誤、`exact|normalized|ai`、ヒント利用、時刻を持つ。

テストセッションは出題数・重複・終了画面が未決のためMVP schemaへ入れない。採用時は別migrationとタスクを追加する。

## 5. API設計

### 5.1 共通規約

- base path: `/api/v1`
- auth handler: `/api/auth/*`（Better Auth規約）
- content type: `application/json; charset=utf-8`
- ID: 推測不能なopaque text。クライアントは構造を解釈しない。
- 日時: APIはISO 8601 UTC文字列、DBはepoch milliseconds。
- pagination: cursor方式 `{ items, nextCursor }`。初期既定20、上限100を設計候補とする。
- mutationの成功: createは201、update/getは200、deleteは204。
- 他ユーザー資源: 存在有無を漏らさず404。
- request bodyに`userId`を定義しない。

### 5.2 共通エラー

```json
{
  "error": {
    "code": "WORD_NOT_FOUND",
    "message": "対象の単語が見つかりません。",
    "requestId": "req_...",
    "details": {}
  }
}
```

| status | code例 | 用途 |
|---:|---|---|
| 400 | `INVALID_JSON` | JSONとして読めない |
| 401 | `UNAUTHENTICATED` | 有効なsessionがない |
| 403 | `ORIGIN_NOT_ALLOWED` | mutationのOrigin不正 |
| 404 | `WORD_NOT_FOUND` | 未存在または非所有 |
| 409 | `CONFLICT` | 決定後の重複規則や更新競合 |
| 422 | `VALIDATION_FAILED` | schema/domain invariant違反 |
| 429 | `RATE_LIMITED` | AI/翻訳等の利用制限 |
| 502 | `PROVIDER_INVALID_RESPONSE` | 外部provider応答が契約外 |
| 503 | `AI_JUDGE_UNAVAILABLE` | AI/翻訳が一時利用不可 |
| 500 | `INTERNAL_ERROR` | 想定外障害。内部詳細は非公開 |

`details`はfield error等の安全な情報だけを含め、本番でstack・SQL・provider本文を返さない。

### 5.3 endpoint一覧

| method | path | auth | 概要 |
|---|---|---:|---|
| GET/POST | `/api/auth/*` | Better Auth | login、callback、session、logout |
| GET | `/api/v1/health` | 不要 | processのlivenessのみ。本文は `{ "status": "ok" }`。D1/AIの秘密や詳細を返さない |
| GET | `/api/v1/words` | 必須 | 所有単語と意味・統計のcursor一覧。T02は認証確認用の空一覧 `{ items: [], nextCursor: null }`。実データはT05 |
| POST | `/api/v1/words` | 必須 | 単語と1件以上の意味を原子的に作成 |
| GET | `/api/v1/words/:wordId` | 必須 | 所有単語の詳細 |
| PUT | `/api/v1/words/:wordId` | 必須 | 単語・意味・ヒントを原子的に置換更新 |
| DELETE | `/api/v1/words/:wordId` | 必須 | 削除。履歴方針OQ-009決定後に実装 |
| POST | `/api/v1/translation-candidates` | 必須 | DB保存せず日本語候補を返す |
| POST | `/api/v1/study/questions` | 必須 | modeに従い次の問題を1件返す |
| GET | `/api/v1/study/questions/:wordId/hint` | 必須 | 所有確認後にヒントを返す |
| POST | `/api/v1/study/answers` | 必須 | 所有確認→判定→履歴保存→結果返却 |
| GET | `/api/v1/history` | 必須 | 所有回答履歴のcursor一覧 |

### 5.4 主要request/response

#### 単語作成

```json
POST /api/v1/words
{
  "term": "issue",
  "meanings": ["問題", "論点"],
  "hint": "文脈で意味が変わる"
}
```

```json
201 Created
{
  "word": {
    "id": "w_...",
    "term": "issue",
    "meanings": [
      { "id": "wm_...", "meaning": "問題", "order": 0 },
      { "id": "wm_...", "meaning": "論点", "order": 1 }
    ],
    "hint": "文脈で意味が変わる",
    "stats": { "status": "unanswered", "correct": 0, "total": 0, "accuracy": null },
    "createdAt": "2026-08-20T00:00:00.000Z",
    "updatedAt": "2026-08-20T00:00:00.000Z"
  }
}
```

入力上限はOQ-018で確定する。`meanings`は空配列を拒否し、空白だけのmeaningも拒否する。

#### 翻訳候補

```json
POST /api/v1/translation-candidates
{ "term": "issue", "sourceLanguage": "en", "targetLanguage": "ja" }
```

```json
200 OK
{
  "candidates": [
    { "text": "問題" },
    { "text": "論点" }
  ],
  "provider": "workers-ai",
  "model": "configured-model"
}
```

候補取得ではwords/word_meaningsへ書き込まない。provider/modelは透明性のため返すが、secretや生promptは返さない。

#### 問題取得

```json
POST /api/v1/study/questions
{
  "mode": "random",
  "excludeWordIds": []
}
```

```json
200 OK
{
  "question": {
    "wordId": "w_...",
    "term": "issue",
    "hasHint": true
  }
}
```

`excludeWordIds`と重複制御はOQ-005が決まるまで暫定。候補がなければ404 `NO_STUDY_WORDS`を返す。

#### ヒント取得

```json
GET /api/v1/study/questions/w_.../hint
{ "hint": "文脈で意味が変わる" }
```

ヒント本文は問題初期responseへ含めない。UIはこのendpoint成功時だけローカルの`hintUsed=true`にする。

#### 回答送信

```json
POST /api/v1/study/answers
{
  "wordId": "w_...",
  "answer": "論点",
  "hintUsed": true
}
```

```json
201 Created
{
  "result": {
    "id": "tr_...",
    "wordId": "w_...",
    "answer": "論点",
    "isCorrect": true,
    "judgeType": "exact",
    "hintUsed": true,
    "meanings": ["問題", "論点"],
    "judgedByAi": false,
    "answeredAt": "2026-08-20T00:00:00.000Z"
  }
}
```

serverは`wordId`をsession userで再取得し、クライアントから意味・正誤・judgeTypeを受け取らない。AI障害時に履歴を保存するかはOQ-003決定まで未確定とし、暫定設計は503で保存しない。

## 6. 主要処理フロー

### 6.1 認証済みAPI

```text
Request
  -> requestId付与
  -> Origin検証（mutation）
  -> Better Auth session取得
  -> 未認証なら401
  -> Zod validation
  -> use case(actorUserId, validatedInput)
  -> repositoryがowner scopeでquery
  -> response schemaへmapping
  -> JSON response + structured log
```

### 6.2 単語作成・更新

```text
入力検証
  -> term/meaningsをnormalize（保存用原文は維持）
  -> meanings 1件以上のdomain invariant
  -> word + meanings SQLをD1 batch
  -> 途中失敗なら全rollback
  -> 作成結果を再取得
```

重複規則はOQ-008、入力上限はOQ-018、削除挙動はOQ-009の決定後に固定する。

### 6.3 回答判定

```text
session.user.id + wordIdで単語と全意味を取得
  -> 未存在/非所有なら404
  -> raw answerがいずれかと完全一致?
       yes -> exact / correct
       no  -> answerと全意味を必須規則でnormalize
             -> いずれかと一致?
                  yes -> normalized / correct
                  no  -> SemanticJudgeをtimeout付きで1回呼ぶ
                        -> response schemaを検証
                        -> ai / providerのboolean結果
  -> test_resultを1件保存
  -> 登録意味と透明性情報を返す
```

`AnswerJudge`はAI呼び出し回数が0または1であることをテストする。AIへuser ID、hint、履歴、OAuth情報を送らない。

### 6.4 出題

- `random`: 所有単語全体から一様抽選する。
- `weak`: 所有単語と履歴集計を読み、各単語に正の重みを与えてapplicationで重み付き抽選する。
- 正確な重み、未回答、件数、重複制御はOQ-005/006の決定までstrategyの設定として隔離する。
- MVPは個人データ規模で全候補を扱う。OQ-012が大規模ならquery方式を再設計する。

### 6.5 統計

```text
LEFT JOIN words -> test_results
  -> total = COUNT(test_results.id)
  -> correct = SUM(is_correct)
  -> total == 0 ? status=unanswered, accuracy=null
                : status=answered, accuracy=correct/total
```

UIは`accuracy === null`を白、それ以外を赤→黄緑の色関数へ渡し、必ず文字列も併記する。色式はOQ-007で確定する。

## 7. 横断的関心事

### 7.1 認証・認可

- Better Auth session CookieをMVPのWeb認証に使う。CookieはHttpOnly、SameSite=Lax。`BETTER_AUTH_URL` が https のときだけ Secure。
- login pageのredirectはUXであり、APIの認可境界ではない。全private APIでsessionを検証する。
- Webの未認証redirectは Start server function `getCurrentSession` が session cookie を読む。`actorUserId` は session の `user.id` だけを使う。request body の user ID は定義しない。
- `/api/v1/health` 以外の `/api/v1/*` は `requireAuth` の配下。未認証は `401 UNAUTHENTICATED`。
- repository queryは必ず`WHERE id = ? AND user_id = ?`または所有者scopeを含める。
- 将来拡張用token/CORSをMVPへ先回り実装しない。
- secretは `.dev.vars`（local）またはWorkers secret。`wrangler.jsonc` の vars には `BETTER_AUTH_URL` だけを置き、OAuth secretは置かない。

### 7.2 CSRF / CORS

- mutationはSameSite Cookieに加え、許可originと`Origin`/`Host`を照合する。
- MVPのCORSはsame-originのみ。`*`とcredentialsを併用しない。
- Better Auth callback pathは公式推奨と実環境URLで検証する。

### 7.3 validation

- body、path、queryをZodで検証する。
- JSONの型検証後もdomain invariant（意味1件以上、judge順序等）をapplication/domainで守る。
- term/meaning/answer/hintの上限はOQ-018後にschemaへ固定する。

### 7.4 timeout / retry

- D1の通常queryをアプリで無条件retryしない。
- AI/翻訳はAbortSignalでtimeoutし、429/5xxのretryは最大回数・jitter・全体時間予算をOQ-001/002で決める。
- mutationの自動retryはidempotencyが保証できる場合だけにする。

### 7.5 observability

- API log: `requestId`, method, route template, status, durationMs, actor hash/内部ID（必要最小限）, errorCode。
- provider log: provider/model, durationMs, outcome, token/usageが安全に取れる場合の数値。回答本文やprompt全文は記録しない。
- healthはlivenessとし、D1/AI障害の詳細を公開しない。運用監視は認証された内部probeまたはCloudflare telemetryで行う。

### 7.6 rate limit / abuse

- translationとAI回答は認証ユーザー単位でrate limitできるmiddleware境界を用意する。
- 具体値は料金プラン・想定利用量の決定後に設定する。
- 入力長、候補数、timeoutを必ず上限化し、denial-of-walletを抑える。

## 8. トレードオフ・代替案

| 採用 | 代替 | 採用理由 / 代替を見送る理由 |
|---|---|---|
| 単一Workerのモジュラーモノリス | Web/API別Worker | 配備・認証・same-originを単純化。独立scaleが必要になるまで分割しない |
| Hono REST API | Start server functionsのみ | 将来外部クライアント要件のため。UI固有呼び出しへ閉じない |
| 履歴から都度集計 | wordsへ集計値を保存 | MVPは整合性優先。実測で遅い場合のみcache/集計を導入 |
| normalized値を保存 | 判定時だけ計算 | 一覧検索・重複判定の将来利用と一貫性。ただし正規化version変更時の再計算が必要 |
| 問題1件ずつ取得 | test_sessionsを先に導入 | 出題数・終了画面が未決。採用決定までschemaを増やさない |
| AIを最後のfallback | 全回答をAI判定 | 費用・遅延・誤判定を減らし、決定的な一致を優先 |
| provider port | Workers AI直結 | 品質・料金・model変更に備える。MVPでadapterは1つだけ実装 |

## 9. 設計思想からの逸脱

T02時点の意図的な限定:

- アプリmutation用のOrigin middlewareはT03へ先送りする。T02のmutationはBetter Auth handlerのみで、`trustedOrigins` で Origin を検証する。
- `GET /api/v1/words` は空一覧stub。単語CRUDはT05。
- Web layoutのsession読取はStart server function。業務APIはHonoに置き、server functionへドメイン処理を閉じ込めない。
- `features/auth/public.ts` は client-safe な `authClient` だけを再exportする。`getCurrentSession` を混ぜると `cloudflare:workers` が client bundle へ入る。

## 10. 未決事項

- `OPEN_QUESTIONS.md` OQ-001〜OQ-018を参照。
- 特にOQ-009（削除と履歴）は物理FK、OQ-003（AI障害）は履歴一貫性、OQ-005（出題数）はtest session要否へ直結する。
- 人間が思想3文書を承認済み（OQ-016）。Worker entryのHono/Start分岐はPOC-02で確認済み。
- T02: Better Auth + Google + D1のコード経路は実装済み。live Google previewは人間がOAuth clientと `.dev.vars` を設定して確認する。

## 11. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 POC-02合格によりWorker entryのHono分岐を確定。health応答形を追記
- 2026-08-20 T02でGoogle OAuth、session Cookie、保護layout、private API 401を反映
