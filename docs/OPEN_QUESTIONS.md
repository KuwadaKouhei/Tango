# 未決事項・意思決定ゲート（OPEN_QUESTIONS）

> 原典の「要確認」を実装都合で勝手に固定しないための台帳。`未決` の項目は、記載した期限までに人間が決定し、関連する REQUIREMENTS / DESIGN / DATABASE / TASKS を同じ変更で更新する。

## 1. プロダクト仕様

| ID | 論点 | 主な選択肢 | 決定期限 | 状態 |
|---|---|---|---|---|
| OQ-001 | 翻訳プロバイダー、モデル、候補件数、料金上限 | Workers AI / DeepL / Google Translation / その他 | T08着手前 | 決定済み（Workers AI / `@cf/meta/m2m100-1.2b` / 候補1件） |
| OQ-002 | AI判定プロバイダー、モデル、プロンプト、再試行、タイムアウト | Workers AIを含む交換可能な候補 | T11着手前 | 未決 |
| OQ-003 | AI障害時の回答扱い | 未採点で再試行 / 不正解として保存 / AIなしで不正解 | T11着手前 | 未決 |
| OQ-004 | 正規化の追加範囲 | 句読点・記号・かなカナ・長音・表記ゆれ | T09着手前 | 未決 |
| OQ-005 | テスト出題数・既定値・同一テスト内重複 | 1問ずつ継続 / 固定件数 / 選択式、重複可否 | T10着手前 | 未決 |
| OQ-006 | 苦手優先の重み | 正解率、未回答、回答回数、直近結果の組合せ | T10着手前 | 未決 |
| OQ-007 | カード色とアクセシビリティ基準 | 色空間・補間・コントラスト・段階 | T07着手前 | 未決 |
| OQ-008 | 重複単語の定義・扱い | 許可 / 警告 / ユーザー単位で禁止 | T05着手前 | 決定済み（ユーザー単位で禁止） |
| OQ-009 | 単語削除時の回答履歴 | カスケード削除 / 保持して匿名化 / ソフトデリート | T06着手前・初回本番データ投入前 | 決定済み（カスケード削除） |
| OQ-010 | MVP追加候補 | 検索、重複警告、終了結果、間違い再テスト、AI判定手動修正 | タスク追加前 | 未決（MVP外として計画） |
| OQ-011 | Chrome拡張の認証・CORS・配布 | Cookie / トークン、権限、ストア配布 | 将来フェーズ設計時 | 将来 |
| OQ-012 | 性能目標と想定規模 | p95応答、同時利用者、単語数、履歴数 | 本番公開判定前 | 未決 |

## 2. 技術・運用

| ID | 論点 | 現時点の推奨案 | 決定期限 | 状態 |
|---|---|---|---|---|
| OQ-013 | TanStack Start RC採用可否 | 公式Cloudflare例でPoCし、SSR・Hono分岐・認証・D1・本番ビルドを通してから固定 | T01完了時 | 決定済み（採用） |
| OQ-014 | 依存バージョン | 2026-08-20の候補を `TECH_STACK.md` に記録し、T01で互換セットをlockfileへ固定 | T01完了時 | 決定済み |
| OQ-015 | Cloudflare料金プラン・上限 | MVP利用量とWorkers AIモデル要件を見積もり、Free/Paidを選ぶ | T03完了時 | 決定済み（Workers Free） |
| OQ-016 | 設計・実装・テスト思想 | 個人MVP向け推奨デフォルトを暫定採用。人間レビュー後に承認へ変更 | 実装着手前 | 決定済み |
| OQ-017 | Git/GitHub運用 | Git管理と公開repository `KuwadaKouhei/Tango` は決定済み。GitHub Flow、Conventional Commits、1タスク=1PRは暫定案 | 実装着手前 | 決定済み |
| OQ-018 | 入力件数・文字数上限 | term 100、meaning 200、意味20件、hint/answer 500文字を初期guardrail候補とする | T05着手前 | 決定済み（候補値をそのまま確定） |

## 3. 決定記録

### OQ-013（2026-08-20）

TanStack Start 1.168.48（製品ページはRC表記）を採用する。公式CLIの Cloudflare blank scaffold を起点に、`vite dev`、`vite build`、`vite preview`、SSR画面応答が成功した（POC-01）。

### OQ-014（2026-08-20）

互換セットを `package.json` と `pnpm-lock.yaml` へ exact 固定した。公式CLIは TypeScript 6.0.2 を使うため、npm latest の TypeScript 7 は採用しない。pnpm は `packageManager` で 11.22.0 に固定。詳細は `TECH_STACK.md`。

### OQ-016（2026-08-20）

`PLAN_PHILOSOPHY` / `CODING_PHILOSOPHY` / `TEST_PHILOSOPHY` の推奨デフォルトを承認した。

### OQ-017（2026-08-20）

GitHub Flow、Conventional Commits、1タスク=1ブランチ=1PR、AIはmergeしない運用を承認した。公開repositoryは既存決定どおり `KuwadaKouhei/Tango`。

### OQ-008（2026-08-22）

同一ユーザー内で単語の重複登録を**禁止**する。同一判定は `normalizeTerm` の正規形（NFKC → trim → 小文字化 → 連続空白の1個化）の一致とする。`Issue` / `issue` / `ｉｓｓｕｅ` / ` issue ` は同じ単語として扱う。

- 判定範囲はユーザー単位。別ユーザーが同じ単語を持つのは正常。
- 真値はDBの `UNIQUE(user_id, normalized_term)`。applicationの事前照合は親切なエラーのためであり、同時実行で抜けた分はUNIQUE違反を `409` へ変換して塞ぐ。
- 編集時は自分自身を除外して判定する。term を変えない保存が409にならないこと。
- OQ-010の「重複警告」はMVP外のまま。今回決めたのは警告ではなく**保存の拒否**であり、既存単語の編集画面へ誘導するUIは作らない。
- 比較に使うのは `normalized_term` のみ。意味（`normalized_meaning`）の重複はDBでもUIでも禁止しない。

**OQ-004との依存**: 正規化の追加範囲（句読点・記号・かなカナ・長音）は未決。この決定によって `normalized_term` にUNIQUEが付くため、後からOQ-004で正規化を広げると、いま別行の2語が同じ正規形になりUNIQUE違反でmigrationが失敗しうる。OQ-004を決めるときは「全行の再計算」と「衝突行の解消」をセットで設計する（`DATABASE.md` 5.2）。

### OQ-009（2026-08-22）

単語を削除したら、その単語の回答履歴も**カスケード削除**する。

- `test_results` の複合FK `(word_id, user_id) → words(id, user_id)` を `ON DELETE RESTRICT` から `ON DELETE CASCADE` へ変更する。
- `word_meanings` は従来どおりCASCADE。
- 削除は不可逆で学習履歴を失う。UIは実行前に確認操作を必須とする。
- ソフトデリートと履歴の匿名化スナップショットは採用しない。`words.deleted_at` も履歴側のterm/meaningスナップショットも作らない。
- 統計は履歴から導出するため、削除後にその単語の正解率・回答数は残らない。全体集計を将来追加する場合、削除済み単語の回答は母数から消える。

### OQ-018（2026-08-22）

初期guardrail候補の値をそのまま確定値とする。変更しない。

| 項目 | 確定値 |
|---|---|
| term | 100文字 |
| meaning | 200文字 |
| 1単語あたりの意味 | 20件 |
| hint | 500文字 |
| answer | 500文字（T09以降で適用） |

`INPUT_LIMITS` の「決定までの防御値」という位置づけを解除する。値が変わらないため既存データへの影響はない。

上限はDBのCHECK制約で二重化しない。Zod schemaとUIの `maxLength` だけで守り、将来の見直しでmigrationが要らない状態を保つ。長さ0の拒否は既存のCHECKを維持する。

### OQ-001（2026-08-22）

翻訳は **Workers AI** の **`@cf/meta/m2m100-1.2b`** を使う。利用者決定。

| 項目 | 確定値 | 理由 |
|---|---|---|
| provider | Workers AI | 同一Cloudflare基盤。bindingでsecretを増やさない |
| model | `@cf/meta/m2m100-1.2b` | 公式の翻訳モデル。1リクエスト1訳文 |
| 候補件数 | 1 | モデルが単一 `translated_text` を返す。追加の意味はフォームで手入力する |
| 入力上限 | term 100文字 | OQ-018と同じ。denial-of-wallet抑制 |
| 言語 | `en` → `ja` のみ | TRANS-001。他方向は422 |
| timeout | 8秒（wall clock、AbortSignal） | フォーム操作の待ち上限。自動retryしない |
| rate limit | 認証ユーザーあたり 10回 / 60秒 | isolate内スライディングウィンドウ。連打とneuron消費を抑える |

Workers AIへの実呼び出しは `source_lang: "english"` / `target_lang: "japanese"`（公式TypeScript例に合わせる）。HTTP APIは `sourceLanguage: "en"` / `targetLanguage: "ja"`。

CloudflareのRate Limiting製品は使わない（OQ-015がFreeのため）。limitはWorker isolate内だけ有効で、複数isolate間では共有されない。個人MVPでは許容する。

POC-06のlive品質比較（代表単語セットでの人手確認）はこの環境では未実施。通常CIはcontract mockのみ。previewでの人手確認を残す。品質が足りなければportを保ったままadapterを差し替える。

### OQ-015（2026-08-22）

Cloudflareの料金プランは **Workers Free** とする。利用者決定。

- Paid専用のRate Limiting bindingやUnbound CPU前提の処理をMVPへ入れない。
- Workers AIはFreeのneuron枠内で使う前提とし、入力長・timeout・ユーザー単位rate limitで消費を抑える。
- D1 Freeの容量上限は従来どおり。規模目標はOQ-012が未決のまま。

## 4. 更新手順

1. 決定者が選択肢と理由を本書へ記録する。
2. 状態を `決定済み` にし、決定日を追記する。
3. 影響する要件、設計、DB、タスク、テストを同じ変更で更新する。
4. 実装後に決定を変える場合は、データ移行・互換性・ロールバックも記録する。

## 5. 更新履歴

- 2026-08-20 初版作成
- 2026-08-20 OQ-013/014/016/017を決定済みへ更新
- 2026-08-20 T03着手。OQ-009は未決のまま初期FKをRESTRICTとし、公開削除はT07まで作らない。OQ-015はT03完了時まで未決
- 2026-08-20 T04着手。OQ-008は重複を禁止しない。OQ-018は未決のまま初期guardrail候補を防御値として適用
- 2026-08-21 T05着手。OQ-008/018は未決のまま。重複単語は別カードとして並べる。OQ-012も未決のまま、DESIGNのcursor既定20/上限100を防御値としてだけ使う
- 2026-08-21 T06着手。OQ-008/018は未決のまま。OQ-009は未決のため公開DELETEは作らない
- 2026-08-22 OQ-008を「ユーザー単位で禁止・正規形で判定」、OQ-009を「カスケード削除」、OQ-018を「候補値のまま確定」として決定済みへ更新
- 2026-08-22 OQ-001をWorkers AI `@cf/meta/m2m100-1.2b`・候補1件・入力100文字・rate limit、OQ-015をWorkers Freeとして決定済みへ更新
