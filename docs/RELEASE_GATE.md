# リリースゲート（T15）

> 状態: **T15マージ済み。CIとE2Eは自動化。2026-08-26に人間が preview smoke 成功を報告。POC-05 live品質は未実施。**
> OQ-012（本番規模・SLO）は未決のまま固定しない。本番公開判定の前に人間が決める。

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

Worker名は `tango`。公開URLは `https://tango.eitango.workers.dev`。`wrangler.jsonc` の vars は `BETTER_AUTH_URL` だけ。secret値はチャット・Git・logへ出さない。

このCloud Agent環境には `CLOUDFLARE_API_TOKEN` も wrangler login もない。`wrangler whoami` は未認証。`pnpm deploy` と remote D1操作は人間のマシンで行う。

### 4.1 2026-08-25 の確認結果（この環境）

| 確認 | 結果 |
|---|---|
| `GET /api/v1/health` | 200 `{"status":"ok"}` |
| `GET /` | 307 `/login` |
| `GET /login` | 200 HTML。Googleログイン導線あり |
| `GET /api/v1/words`（未認証） | 401 `UNAUTHENTICATED` |
| `POST /api/v1/study/questions`（Originなし） | 403 `ORIGIN_NOT_ALLOWED` |
| `POST /api/v1/translation-candidates`（Originなし） | 403 `ORIGIN_NOT_ALLOWED` |
| client asset | 現行mainの `pnpm build` と同一hash（`styles-Du0Xgb0F.css`、`index-PLRhwB41.js`、`study-BzhTj1fV.js`、`words-v_TwXIE1.js`、`login-DT3xAY2Y.js`） |
| `pnpm exec wrangler deploy --dry-run` | 成功。bindingは D1 `tango`、AI、`BETTER_AUTH_URL` |
| `wrangler whoami` / `secret list` / remote migration list | この環境では不可 |

コードの再uploadは必須ではない。2026-08-26に人間が 4.4 の smoke 成功を報告した。POC-05 liveは 5節。

2026-08-23 の配備Workerで POC-03/04/06 は live 合格済み。POC-05 live品質は未実施のまま。

### 4.2 準備（人間のマシン）

1. 最新 `main` を取る。Node は 22.13.0 以上（CIは 22.17.1）。pnpm は 11.22.0。
2. `pnpm install --frozen-lockfile`
3. Google Cloud Console に Authorized redirect URI `https://tango.eitango.workers.dev/api/auth/callback/google` があることだけ確認する。client secretの値は貼らない。
4. Cloudflare にログインできること。`pnpm exec wrangler whoami` がアカウントを返すこと。

Workers secret に次の**名前**があること。無ければ `pnpm exec wrangler secret put <NAME>` で入れる。値は標準入力または対話。チャットへ貼らない。

| 置く | 置かない |
|---|---|
| `BETTER_AUTH_SECRET` | `E2E_AUTH_SECRET`（本番Worker禁止） |
| `GOOGLE_CLIENT_ID` | `wrangler.jsonc` の vars への OAuth / DeepL |
| `GOOGLE_CLIENT_SECRET` | |
| `DEEPL_AUTH_KEY` | |

確認コマンド（名前だけ出る）:

```bash
pnpm exec wrangler whoami
pnpm exec wrangler secret list
```

### 4.3 D1 と配備

```bash
pnpm exec wrangler d1 migrations list tango --remote
```

remote D1 は 2026-08-23 に `0000`〜`0003` を適用済み。未適用がなければ `apply` しない。あれば:

```bash
pnpm exec wrangler d1 migrations apply tango --remote
```

`drizzle push` は使わない。適用済みSQLは改変しない。

再配備する場合:

```bash
pnpm deploy
```

これは `pnpm run build && wrangler deploy`。成功したら URL が `https://tango.eitango.workers.dev` と出る。失敗したら Worker は `wrangler rollback`、schemaは `docs/DATABASE.md` 9節の Time Travel または逆SQL。

### 4.4 smoke（ブラウザ。翻訳とAIの live は増やさない）

対象: `https://tango.eitango.workers.dev`

1. 未認証で `/` を開く → `/login` へ誘導される。
2. Googleでログイン → 単語一覧へ進む。
3. 単語を登録する（意味2件、hintは任意）。
4. 一覧に出る。検索欄で見出しまたは意味の一部を入れてヒットする。
5. 編集して保存し、一覧に反映される。
6. テストを random・5問で開始し、登録意味と exact 一致する回答を1問送る。正誤と登録意味が出る。
7. 一覧の正解数/回答数が更新される。
8. ログアウトし、再ログインできる。
9. 削除する場合は確認ダイアログのあと、一覧から消える。

翻訳候補とAI判定は既存POCを再利用する。通常のsmokeでは live を増やさない。AI判定の品質記録は 5節（POC-05）で行う。

2026-08-26: 人間が本節の smoke 成功を報告。

## 5. POC-05 live（人手。通常CIでは呼ばない）

対象: `https://tango.eitango.workers.dev`。model は `@cf/meta/llama-3.1-8b-instruct-fast`。prompt version は `tango-judge-v1`。評価セットの正本は `tests/eval/ai-judge.eval.test.ts` の `AI_JUDGE_EVAL_CASES`。

このCloud Agent環境は wrangler 未認証のため Workers AI を live call できない。人間がブラウザで4件を記録する。回答・意味・prompt全文はチャットやGitへ貼らない。記録するのは正誤、判定文言、AI使用の有無、所要時間、失敗codeだけ。

OQ-012のSLOは発明しない。timeout は 8秒。rate limit は認証ユーザーあたり 10回/60秒。同一テスト内に同じ単語は出ないため、`issue` の2件はテストを2回に分ける。

### 5.1 単語の用意

登録意味は評価セットどおり **1件だけ**。`課題` を意味に入れると local exact になり AI へ進まない。既存の `issue` / `child` / `computer` があれば新規作成せず編集する（重複は409）。

| ID | 見出し | 登録意味 | 送る回答 | 期待 |
|---|---|---|---|---|
| issue-synonym | issue | 問題 | 課題 | 正解（AI） |
| issue-unrelated | issue | 問題 | 全然違う | 不正解（AI） |
| child-kana-kanji | child | 子供 | 子ども | 正解（AI） |
| computer-long-vowel | computer | コンピュータ | コンピューター | 正解（AI） |

### 5.2 実施

1. `/words/new` または編集で 5.1 の3語を用意する。hintは空でよい。
2. 他の所有単語が出たら、登録意味を exact で答えて AI を消費しない。
3. `/study` で random・全部（所有が多ければ5でも可）を開始する。
4. 1回目: `issue` → `課題`、`child` → `子ども`、`computer` → `コンピューター`。
5. 2回目: `issue` → `全然違う`。他は exact。
6. ヒントは開かない。連打しない。503なら同じ回答を再試行してよい（履歴は未保存）。
7. 任意で DevTools の `POST /api/v1/study/answers` の所要時間を見る。本文は保存・貼付しない。

画面の合格サイン:

- 判定が `AI判定で正解` または `AI判定で不正解`
- 「この判定にはAIを使いました。」が出る
- 503は `外部サービスが一時的に利用できません。しばらくしてから再試行してください。`
- 10回超過は `AI判定の利用上限に達しました。しばらく待ってから再試行してください。`

### 5.3 記録と判定

| ID | 期待 | 判定文言 | AI使用 | 所要時間 | 503/429 |
|---|---|---|---|---|---|
| issue-synonym | AI判定で正解 | | | | |
| issue-unrelated | AI判定で不正解 | | | | |
| child-kana-kanji | AI判定で正解 | | | | |
| computer-long-vowel | AI判定で正解 | | | | |

- 4件すべて期待どおり、かつ構造化失敗（再試行しても続く503）が0なら live合格候補。p95は4件のwall clockを記録するだけで公開SLOにしない。
- 1件でも期待と違う、または503が続くなら OQ-002 の model / 提供者を要件へ差し戻す。portは維持する。

## 6. OQ-012

未決。T15は性能SLOを発明しない。

記録済みの個人規模計測（T11）: Workers Vitest の local D1 で所有80語の苦手集計+1件抽選。seed込みテストは約500ms。5秒超はhangとして落とすが、公開SLOではない。

本番公開判定の前に p95、同時利用者、単語数、履歴数を人間が決める。

## 7. 更新履歴

- 2026-08-25 T15初版。CI/E2Eを自動化。preview再配備は人手手順のみ
- 2026-08-25 T15マージ済み。OQ-012とpreview再配備・POC-05 liveは残作業
- 2026-08-25 live Workerのclient bundleが現行mainと一致することを確認。secret/migration/Google smokeの人手手順を4節へ展開
- 2026-08-26 人間が preview smoke 成功を報告。POC-05 liveの人手手順を5節へ追加
