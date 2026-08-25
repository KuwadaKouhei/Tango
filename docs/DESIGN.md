# 設計: Tango MVP

> 状態: **思想承認済み。Worker entryはT01、Google認証はT02、所有者分離基盤はT03で確認済み。**
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

テストセッションの正本はクライアントの今回テスト状態とする。`test_sessions` テーブルは作らない（OQ-005/010）。各回答は従来どおり `test_results` へ1件ずつ保存する。

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
| 404 | `NO_STUDY_WORDS` | テスト開始時に所有単語が0件 |
| 409 | `WORD_DUPLICATE` | 同一ユーザー内で正規形が一致する単語が既にある |
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
| GET | `/api/v1/words` | 必須 | 所有単語と意味・統計のcursor一覧。任意の `q` で見出し・意味を部分一致検索 |
| POST | `/api/v1/words` | 必須 | 単語と1件以上の意味を原子的に作成 |
| GET | `/api/v1/words/:wordId` | 必須 | 所有単語の詳細 |
| PUT | `/api/v1/words/:wordId` | 必須 | 単語・意味・ヒントを原子的に置換更新 |
| DELETE | `/api/v1/words/:wordId` | 必須 | 単語と意味と回答履歴をカスケード削除（OQ-009） |
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

入力上限はOQ-018で確定した term 100、meaning 200、意味20件、hint 500 を適用する。`meanings`は空配列を拒否し、空白だけのmeaningも拒否する。request bodyに`userId`は無い。

#### 単語の重複拒否（OQ-008）

POST と PUT は、`normalizeTerm` の正規形が同一ユーザーの既存単語と一致したら `409 WORD_DUPLICATE` を返す。

```json
409 Conflict
{
  "error": {
    "code": "WORD_DUPLICATE",
    "message": "この単語はすでに登録されています。",
    "requestId": "req_...",
    "details": { "existingWordId": "w_..." }
  }
}
```

- 真値はDBの `UNIQUE(user_id, normalized_term)`。applicationは保存前に所有者scopeで照合して分かりやすく落とすが、そこを通過してもUNIQUE違反を捕まえて同じ409へ変換する。事前照合だけだと同時実行で抜ける。
- PUTは自分自身を除外して判定する。termを変えない保存を409にしない。
- 判定対象は `words.normalized_term` だけ。意味の重複は拒否しない。
- `existingWordId` は所有者scopeで引いた自分の単語IDに限る。他ユーザーの単語IDを返さない。
- OQ-010の「重複警告」はMVP外のまま。既存単語の編集画面へ誘導するUIは作らない。

#### 単語削除

```http
DELETE /api/v1/words/:wordId
```

`204 No Content`。非所有・未存在は `404 WORD_NOT_FOUND` で区別しない。DBのFK `ON DELETE CASCADE` により意味と回答履歴も消える。application側で履歴を明示削除せず、削除の原子性はDBに任せる。UIは実行前に確認操作を挟み、履歴も消えることを伝える。`fetch-json` は204を本文なし成功として扱う。

一覧の削除は2段階。最初の「削除」では送らず、確認文言（履歴も消える・取り消せない）を出したあとの「削除する」でDELETEする。`window.confirm` は使わない。削除成功後は一覧を表示中なので Query を取り直す。

#### 単語一覧

```http
GET /api/v1/words?limit=20&cursor=opaque&q=
```

`q` は任意。trim後0文字または未指定は通常一覧。trim後1〜100文字。`normalizeTerm(q)` が `words.normalized_term` に部分一致するか、`normalizeMeaning(q)` がいずれかの `word_meanings.normalized_meaning` に部分一致すればヒットする。所有者scope必須。他ユーザーはヒットしない。LIKEの `%` `_` `!` は `!` でエスケープする。空結果は `items: []`。

`limit`未指定は20。上限100はOQ-012未決のため防御値。`accuracy`は回答0件で`null`、回答済み0%は`0`。cursorは`(created_at,id)`のopaque値。

```json
200 OK
{
  "items": [
    {
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
  ],
  "nextCursor": null
}
```

query paramは既知keyだけ抜き出さず、`c.req.query()` 全体をstrict schemaへ渡す。`q` は任意の既知key。`?limmit=20` のような綴り違いを黙って既定値で処理せず、`422 VALIDATION_FAILED` で返すため。

一覧はページ確定・意味・統計の3 queryに分ける（`docs/DATABASE.md` 6.1）。1本のjoin + `GROUP BY` + `ORDER BY` はSQLiteが一時B-treeで並べ直し、cursor indexが効かなくなる。

#### 翻訳候補

```json
POST /api/v1/translation-candidates
{ "term": "issue", "sourceLanguage": "en", "targetLanguage": "ja" }
```

```json
200 OK
{
  "candidates": [
    { "text": "問題" }
  ],
  "provider": "deepl",
  "model": "deepl-translate"
}
```

OQ-001（2026-08-23再決定）:

- providerはDeepL API Free。応答の `model` は公開IDがないため `deepl-translate` ラベル。候補は1件。追加の意味はフォームで手入力する。
- `en` → `ja` 以外は `422 VALIDATION_FAILED`。termはtrim後1〜100文字。DeepLへは `source_lang: "EN"` / `target_lang: "JA"`。
- 候補取得ではwords/word_meaningsへ書き込まない。provider/modelは透明性のため返すが、secretや訳文全文はlogしない。
- timeoutは8秒（AbortSignal）。サーバー側の自動retryはしない。
- 認証ユーザーあたり 10回 / 60秒。isolate内スライディングウィンドウ。超えたら `429 RATE_LIMITED`。DeepLの429と月次quota 456も同じcodeへ変換する。
- provider応答が契約外なら `502 PROVIDER_INVALID_RESPONSE`。timeoutや一時障害・キー未設定は `503 AI_JUDGE_UNAVAILABLE`。

通常CIはDeepLをlive callしない。adapterはfake `fetch` のcontract testで固定する。認証は `Authorization: DeepL-Auth-Key …` のみ。query/bodyにkeyを載せない。

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
  "ownedWordCount": 12,
  "question": {
    "wordId": "w_...",
    "term": "issue",
    "hasHint": true
  }
}
```

出題数の選択（5/10/20/全部、既定10）はクライアントのテスト状態であり、このrequestには載せない。サーバーは所有単語から `excludeWordIds` を除いた集合から1件返す（OQ-005）。

- `excludeWordIds` は opaque ID の配列。上限500。重複は無視。未知ID・他ユーザーIDは候補に出ないだけでエラーにしない。
- `mode` が `random` なら一様抽選、`weak` なら OQ-006 の重み付き抽選。
- 所有0件は `404 NO_STUDY_WORDS`。
- 所有はあるが除外で尽きた場合は `200` で `question: null`（今回テストの終了）。
- 同一テスト内の重複防止の正本は `excludeWordIds`。`test_sessions` は持たない。

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

serverは`wordId`をsession userで再取得し、クライアントから意味・正誤・judgeTypeを受け取らない。AI障害時（timeout / provider 429 / 5xx / 契約外JSON）は履歴を保存せず `503 AI_JUDGE_UNAVAILABLE` を返す（OQ-003）。アプリの isolate 内 10回/60秒超過は `429 RATE_LIMITED`。クライアントは同じ回答を再試行できる。翻訳の schema 不正は `502` だが、AI判定の schema 不正は未採点のまま `503` とする。

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

重複規則（OQ-008）と入力上限（OQ-018）、削除のカスケード（OQ-009）は確定済み。

保存の直前に所有者scopeで正規形を照合し、衝突したら保存へ進まず409にする。事前照合を通過してもD1のUNIQUE違反を捕まえて同じ409へ変換するため、同時実行でも2件目は保存されない。

### 6.3 回答判定

```text
session.user.id + wordIdで単語と全意味を取得
  -> 未存在/非所有なら404
  -> raw answerがいずれかと完全一致?
       yes -> exact / correct
       no  -> answerと全意味原文を `normalizeForJudgement` で正規化
             -> いずれかと一致?
                  yes -> normalized / correct
                  no  -> SemanticJudgeをtimeout付きで1回呼ぶ
                        -> 失敗なら履歴を書かず 503
                        -> JSON Mode + Zod で `{ isCorrect: boolean }` を検証
                        -> ai / providerのboolean結果
  -> test_resultを1件保存
  -> 登録意味と透明性情報を返す
```

`AnswerJudge`はAI呼び出し回数が0または1であることをテストする。AIへuser ID、hint、履歴、OAuth情報を送らない。

`normalizeForJudgement`（OQ-004）:

1. NFKC、trim、`toLocaleLowerCase('ja-JP')`、連続空白の1個化（`normalizeMeaning` と同じ）
2. カタカナをひらがなへ写す（U+30A1–U+30F6 → U+3041–U+3096。`ヴ` は `ゔ`）
3. Unicode句読点 `\p{P}` と記号 `\p{S}` を除去する。長音 `ー`（Lm）は残る
4. 結果が空文字なら normalized 一致にしない

`normalizeTerm` と保存用 `normalizeMeaning` は変えない。

### 6.4 出題

- 開始UI: `random` / `weak` と出題数 5 / 10 / 20 / 全部。既定10。
- 今回の出題数 `plannedCount = min(選択件数, ownedWordCount)`。全部なら `ownedWordCount`。
- `random`: 除外済みを除く所有単語から一様抽選する。
- `weak`: 除外済みを除く所有単語に OQ-006 の正の重みを付けて抽選する。
  - `accuracy = 未回答 ? 0 : correct / total`
  - `weight = max(1 - accuracy, 0.05)`
  - 回答回数と直近正誤は見ない。
- クライアントは出した `wordId` を `excludeWordIds` へ蓄積し、`plannedCount` 件回答するか `question === null` で終了結果へ進む。
- MVPは個人データ規模で全候補を扱う。OQ-012が大規模ならquery方式を再設計する。

### 6.5 統計

```text
LEFT JOIN words -> test_results
  -> total = COUNT(test_results.id)
  -> correct = SUM(is_correct)
  -> total == 0 ? status=unanswered, accuracy=null
                : status=answered, accuracy=correct/total
```

UIは`masteryCardBackground`へ`accuracy`を渡す。未回答（`accuracy === null`）は白 `#ffffff`、回答済みは OQ-007 のHSL線形補間（0% `hsl(0 70% 88%)` → 100% `hsl(95 55% 82%)`、50% は `hsl(47.5 62.5% 85%)`）。段階パレットは使わない。本文色は `#1a1816`。未回答は `未回答（正解 0 / 回答 0）`、回答済みは `正解率 n%（正解 a / 回答 b）` を併記する。

## 7. 横断的関心事

### 7.1 認証・認可

- Better Auth session CookieをMVPのWeb認証に使う。CookieはHttpOnly、SameSite=Lax。`BETTER_AUTH_URL` が https のときだけ Secure。
- login pageのredirectはUXであり、APIの認可境界ではない。全private APIでsessionを検証する。
- Webの未認証redirectは Start server function `getCurrentSession` が session cookie を読む。`actorUserId` は session の `user.id` だけを使う。request body の user ID は定義しない。
- `/api/v1/health` 以外の `/api/v1/*` は `requireAuth` の配下。未認証は `401 UNAUTHENTICATED`。
- repository queryは必ず`WHERE id = ? AND user_id = ?`または所有者scopeを含める。
- 将来拡張用token/CORSをMVPへ先回り実装しない。
- secretは `.dev.vars`（local）またはWorkers secret。`wrangler.jsonc` の vars には `BETTER_AUTH_URL` だけを置き、OAuth secretと `DEEPL_AUTH_KEY` は置かない。
- Workers AIは `wrangler.jsonc` の `ai.binding = "AI"`。T12のAI判定用。翻訳は使わない。
- 翻訳は `DEEPL_AUTH_KEY`。通常CIではDeepLを呼ばない。`wrangler.test.jsonc` の値はダミー。
- 共通errorは `AppError`。`requestId` は `cf-ray` または `req_`+UUID。公開errorにSQL/stack/secretを含めない。
- mutation（POST/PUT/PATCH/DELETE）は `BETTER_AUTH_URL` と `Origin` を照合し、不一致なら `403 ORIGIN_NOT_ALLOWED`。GETはOrigin不要。

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
- AI/翻訳はAbortSignalでtimeoutする。翻訳もAI判定も8秒。429/5xxのサーバー自動retryはしない。クライアントは失敗メッセージを見て再試行できる。
- mutationの自動retryはidempotencyが保証できる場合だけにする。

### 7.5 observability

- API log: `requestId`, method, route template, status, durationMs, actor hash/内部ID（必要最小限）, errorCode。
- provider log: provider/model, durationMs, outcome, token/usageが安全に取れる場合の数値。回答本文やprompt全文は記録しない。
- healthはlivenessとし、D1/AI障害の詳細を公開しない。運用監視は認証された内部probeまたはCloudflare telemetryで行う。

### 7.6 rate limit / abuse

- translationは認証ユーザー単位でisolate内スライディングウィンドウを適用する（10回 / 60秒）。
- AI判定も認証ユーザー単位で **別カウンタ** の 10回 / 60秒 を適用する（OQ-002）。
- Cloudflare Rate Limiting製品は使わない（OQ-015 Workers Free）。複数isolate間では共有されない。
- 入力長100文字、候補1件、timeout 8秒を上限化し、denial-of-walletを抑える。DeepLの月次quota（456）も `RATE_LIMITED`。
- AI判定へ送るのは英単語・登録意味・回答だけ。Workers AIのneuron消費はtimeoutとrate limitで抑える。

## 8. トレードオフ・代替案

| 採用 | 代替 | 採用理由 / 代替を見送る理由 |
|---|---|---|
| 単一Workerのモジュラーモノリス | Web/API別Worker | 配備・認証・same-originを単純化。独立scaleが必要になるまで分割しない |
| Hono REST API | Start server functionsのみ | 将来外部クライアント要件のため。UI固有呼び出しへ閉じない |
| 履歴から都度集計 | wordsへ集計値を保存 | MVPは整合性優先。実測で遅い場合のみcache/集計を導入 |
| normalized値を保存 | 判定時だけ計算 | 一覧検索・重複判定の将来利用と一貫性。ただし正規化version変更時の再計算が必要 |
| 問題1件ずつ取得 | test_sessionsを先に導入 | 出題数・終了結果はクライアントの今回状態で足りる。回答正本は `test_results` |
| AIを最後のfallback | 全回答をAI判定 | 費用・遅延・誤判定を減らし、決定的な一致を優先 |
| provider port | 翻訳SDKをUIへ直結 | 品質・料金・provider変更に備える。MVPの翻訳adapterはDeepL 1つ |

## 9. 設計思想からの逸脱

T10時点の意図的な限定:

- `/api/v1` の mutation は Origin を `BETTER_AUTH_URL` と照合する。Better Auth `/api/auth/*` は従来どおり `trustedOrigins`。
- 公開DELETEはT07で適用済み。履歴もCASCADEで消える。確認操作なしではDELETEを送らない。
- 重複拒否（OQ-008）はT16で適用済み。`existingWordId` は応答に含めるが、既存単語の編集画面へ誘導するUIは作らない（OQ-010の重複誘導はMVP外）。
- 単語のサーバー状態はTanStack Query。相対URLのfetchはclientだけで行い、SSRではqueryをenabledにしない。
- clientのAPI呼び出しは `src/platform/fetch-json.ts` を通す。通信断やHTMLエラーページで`fetch`/`json()`がthrowすると、ブラウザ生成の英語メッセージがそのまま`role="alert"`へ出るため、ここで日本語の失敗結果へ畳む。204は本文なし成功として扱う。翻訳と単語で共用するため platform へ昇格した。
- 保存成功後の cache 無効化は `refetchType: 'none'`。離脱する画面のrefetch完了を待たず、遷移先のmountでstale判定により取り直す。
- 乱数をDOMの`id`へ入れない。SSRとhydrationで値が食い違うため、意味入力欄のidは並び順から作り、`crypto.randomUUID()`はReactの`key`だけに使う。
- カード色の補間はOQ-007。T14で `features/words/domain/mastery-card-color.ts` に置き、一覧カードへ inline background として渡す。CSS分割はせず `src/styles.css` の `.word-card` に幅・暗い本文・`:focus-visible` を足す。リンクは `color: inherit` と下線で、パステル上の既定青リンク対比切れを避ける。
- T09は出題とヒントまで。回答の判定APIはT10で追加した。苦手優先の抽選はT11で追加した。
- T10のlocal不一致は、DBの `judge_type` が `exact|normalized|ai` しか置けないため、AI portが無いときだけ `normalized` + `isCorrect:false` で保存する。第4のenumは作らない。T13は `!isCorrect && !judgedByAi` を「一致しませんでした」と見せる。
- 本番の `POST /api/v1/study/answers` は `SemanticJudge` を注入する。exact/normalizedで決着したらAIを呼ばない。不一致時だけ最大1回。通常CIの signed-in harness は live binding を避けるため `null` または mock を渡す。
- T10の結果UIは正誤・判定段階・登録意味と次問まで。AI利用は `judgedByAi` から明示する。
- T13の終了結果はクライアントが今回の判定応答から算出する。`test_sessions` も別URLの終了画面も作らない。状態を失わず `/study/session` 上で切り替える。再テスト専用操作は付けない。今回の正解率は切り上げず `Math.floor`。
- Web layoutのsession読取はStart server function。業務APIはHonoに置き、server functionへドメイン処理を閉じ込めない。
- `features/auth/public.ts` は client-safe な `authClient` だけを再exportする。`getCurrentSession` を混ぜると `cloudflare:workers` が client bundle へ入る。
- 翻訳のrate limitはisolate内メモリ。グローバルな正確な上限ではない。
- 通常CIはDeepLをlive callしない。POC-06の品質確認は2026-08-23に配備Workerで人手実施済み。
- 通常CIはWorkers AIをlive callしない。POC-05の固定評価セットはcontract mock。live品質は2026-08-25に一部実施（`issue-synonym` は期待外れ）。差し替えは未決。
- Workers AI bindingは翻訳では使わない。T12の `SemanticJudge` adapterが `env.AI.run` を呼ぶ。model IDは `@cf/meta/llama-3.1-8b-instruct-fast`。prompt versionは `tango-judge-v1`。
- wrangler 生成の `AiModels` はこの model ID をまだ含まないため、composition-rootは狭い `run` 口へ委譲する。`wrangler.test.jsonc` には `ai` binding を足さない。
- T15のE2EはGoogle OAuthをlive callしない。`E2E_AUTH_SECRET` と localhost の `BETTER_AUTH_URL` が揃ったときだけ Better Auth の email/password を開き、Playwrightがsession cookieを保存する。ログイン画面はGoogleのまま。本番httpsでは門を閉じる。
- E2Eの `vite dev` は `E2E=true` で Cloudflare Vite plugin の `remoteBindings` を閉じる。Workers AI remote proxy は API token が要るためCIでは使わない。exact一致のE2EはAIを呼ばない。

## 10. 未決事項

- 残未決は `OPEN_QUESTIONS.md` の OQ-011（Chrome拡張）と OQ-012（本番規模）だけ。
- 人間が思想3文書を承認済み（OQ-016）。Worker entryのHono/Start分岐はPOC-02で確認済み。
- T02: Better Auth + Google + D1のコード経路は実装済み。live Googleは2026-08-23に配備Workerで確認済み。
- T08/T17: 翻訳はDeepL API Free。POC-06のlive確認は2026-08-23に配備Workerで実施済み。
- T12: Workers AI の model ID は `@cf/meta/llama-3.1-8b-instruct-fast` にlock。POC-05 liveは2026-08-25に一部実施。`issue-synonym` 外れの扱いと残り公式ケースは未決。

## 11. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 POC-02合格によりWorker entryのHono分岐を確定。health応答形を追記
- 2026-08-20 T02でGoogle OAuth、session Cookie、保護layout、private API 401を反映
- 2026-08-20 T03でAppError、requestId、Origin、words/test_results schema、所有者隔離を反映
- 2026-08-20 T04で単語登録画面と複数意味・ヒント保存を反映。OQ-018は未決のままguardrail候補を適用
- 2026-08-21 T05で所有単語のcursor一覧と未回答/正解率を反映。OQ-012は未決のままページサイズ候補を防御値として適用
- 2026-08-21 T06で単語編集画面とTanStack Query cache無効化を反映。OQ-008/018は未決のまま
- 2026-08-21 T06のreviewで fetch-json、query paramのstrict検証、一覧3 query分離、SSR安全なDOM idを反映
- 2026-08-22 OQ-008/009/018の決定を反映。`WORD_DUPLICATE` の409契約とDELETEのカスケード契約を追加。実装はT07以降
- 2026-08-22 T16で重複拒否を実装。事前照合とUNIQUE違反の両方を409へ揃え、`existingWordId` は所有者scopeに限ることをtestで固定。逸脱節をT16時点へ更新
- 2026-08-22 T07で公開DELETEとCASCADEを実装。204をfetch-jsonで本文なし成功とし、一覧は2段階確認のうえ取り直す。逸脱節をT07時点へ更新
- 2026-08-22 T08で翻訳候補APIとWorkers AI adapterを実装。OQ-001/015の決定を反映。逸脱節をT08時点へ更新
- 2026-08-23 T17で翻訳adapterをDeepL API Freeへ差し替え。OQ-001再決定。逸脱節をT17時点へ更新
- 2026-08-23 OQ-002/003/004/005/006/007/010決定。出題・判定正規化・苦手重み・AI障害・検索・終了結果・カード色を設計へ反映。`test_sessions` は作らない
- 2026-08-23 T18で一覧検索 `q` を実装。LIKE は `ESCAPE '!'`
- 2026-08-23 T09で `POST /api/v1/study/questions` と hint GET を実装。`weak` は422。回答判定はT10
- 2026-08-23 T10で `POST /api/v1/study/answers` と local判定を実装。AI adapterはT12。local missの `judge_type` は逸脱節を参照
- 2026-08-24 T11で `weak` の OQ-006 重み付き抽選を実装。random の一様抽選は変えない
- 2026-08-24 T12で Workers AI JSON Mode の意味判定を結線。model は `@cf/meta/llama-3.1-8b-instruct-fast`。契約外JSONは503
- 2026-08-24 T13で今回テストの終了結果をクライアント集計で表示。別URLは作らない
- 2026-08-25 T14で一覧カード背景をOQ-007のHSL線形補間にし、未回答と0%を文字でも区別する
- 2026-08-25 T15でCIとPlaywright E2Eを追加。OQ-012は未決のまま。preview再配備は人手手順
- 2026-08-25 人間が T15入り `main` を `tango.eitango.workers.dev` へ再配備し smoke 完了を報告。POC-05 liveは未実施
- 2026-08-25 POC-05 live一部。`issue-synonym` はAI不正解。差し替えは未決
- 2026-08-23 POC-03/04/06を配備Workerでの人手確認によりlive合格へ更新
