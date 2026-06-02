# Command Protocol

Knowledge Nexus のコマンド仕様。`SYSTEM_MANIFEST.md` は起動時の最小規約に留め、詳細な運用はこのファイルを参照する。

## run / load

### 起動シーケンス

以下の順序で実行する。

1. `99_System/Memory/INDEX.md` を読み込む（詳細 Memory は必要時のみ）。`INDEX.md` が存在しない場合のみ `99_System/Memory/` 内の最新セッションサマリーをフォールバックとして読み込む。人格設定は `99_System/Prompts/Personas/` 内の設定ファイルから復元する（`SYSTEM_MANIFEST.md` §4 を参照）。
2. `99_System/Handoff/CURRENT_CONTEXT.md` が存在する場合は自動読み込みせず、短期作業文脈の扱いをユーザーに確認する（→ 短期文脈確認）。
3. `index/99_System/Reports/` 内の最新 `*-weekly-maintenance.md` を確認する。7日以上前または存在しない場合は週次メンテナンスの実行を提案する。未読（`status: pending-review`）レポートが存在する場合はその旨を通知する。
4. `index/Clippings/` の未処理ファイル件数を確認し、1件以上あれば件数を通知して即処理（`process-clippings`）を促す（weekly-maintenance を待たない）。
5. Vault MCP サーバーの起動確認：`http://127.0.0.1:3100/mcp` に接続できるか確認し、応答がなければ `node nexus-vault.js` をバックグラウンドで起動する。起動後は `vault_search`, `vault_read`, `vault_write` ツールが利用可能になる。**Windows 注意:** `curl` は `Invoke-WebRequest` のエイリアスのため `-s` フラグが使えずハングする。`curl.exe -s --max-time 3 http://127.0.0.1:3100/mcp`（実バイナリ）または `Invoke-WebRequest -Uri "http://127.0.0.1:3100/mcp" -TimeoutSec 3` を使用すること。

### 自己コンテキスト参照

`index/02_Areas/自己紹介.md` が存在する場合、起動時にフル読みはしない。
面談準備・自己紹介・キャリア関連タスクが生じたときのみ参照する。

### 短期文脈確認

選択肢:

- `読み込む`: `CURRENT_CONTEXT.md` を現在セッションの前提に含める。
- `読み込まずに残す`: `CURRENT_CONTEXT.md` を変更せず、現在セッションの前提には含めない。
- `内容を確認してから決める`: `CURRENT_CONTEXT.md` の内容を表示し、その後あらためて `読み込む`, `読み込まずに残す`, `削除する` の判断を求める。
- `削除する`: `clear-handoff / 引き継ぎ破棄` と同じく `CURRENT_CONTEXT.md` のみを削除する。`99_System/Memory/` や Permanent note は変更しない。

## crystallize / 結晶化

現在の会話・作業内容から、次回以降に再利用すべき知識、決定事項、ユーザー嗜好、未完了タスク、システム変更、作成・更新したノートを抽出し、`99_System/Memory/` または適切な Permanent note に保存する。

Claude の `/compact` とは異なり、AI内部の会話圧縮ではなく、Vault への外部記憶化を目的とする。

ユーザー自身のコンテキスト（スキル・志向・目標）に変化が検出された場合は `index/02_Areas/自己紹介.md` への同期も提案する。Memory は運用嗜好・設計変更の履歴、自己紹介は人格・スキル・経験の Stock Portrait として役割を分離する。

詳細手順は `99_System/Prompts/Workflows/Crystallize.md` を参照する。

## condense / 圧縮

現在の長い会話を、このまま次の応答や別LLMへ引き継げる短い「会話コンテキスト要約」に圧縮する。

原則としてファイル保存は行わず、長期保存が必要な内容は `crystallize` に回す。

詳細手順は `99_System/Prompts/Workflows/Condense.md` を参照する。

### 固定出力形式

`# Condensed Context` を見出しとし、以下の順序で出力する。

1. `目的`
2. `現在状態`
3. `決定事項`
4. `有効な制約`
5. `未解決事項`
6. `次アクション`
7. `参照`
8. `audit_trail`（セッション中に呼び出したエージェント・主要ツールの実行履歴。形式: `- Phase N: @agent → 結果概要`）
9. `decision_rationale`（今回の主要な判断の根拠・1-3点）
10. `open_questions`（次回に検証・調査すべき未解決の問い）
11. `持ち越さない情報`

後続のエージェントが即座に作業を再開できる粒度に絞り、検討過程、冗談、却下済み候補、検索結果全文などは `持ち越さない情報` に要約して明示的に除外する。

## handoff / 引き継ぎ

`condense` と同じ固定出力形式で短期作業文脈を生成し、`99_System/Handoff/CURRENT_CONTEXT.md` に保存する。

このファイルは次回 `run / load` 時に扱いを確認される一時バッファであり、長期保存用の Memory ではない。

既存の `CURRENT_CONTEXT.md` は上書きしてよい。

詳細手順は `99_System/Prompts/Workflows/Handoff.md` を参照する。

## clear-handoff / 引き継ぎ破棄

`99_System/Handoff/CURRENT_CONTEXT.md` を削除し、次回 `run / load` で短期作業文脈が読み込まれない状態に戻す。

長期記憶である `99_System/Memory/` や Permanent note は変更してはならない。

## prune-memory / 記憶整理

`99_System/Memory/` と `99_System/Memory/INDEX.md` を点検し、現在有効な記憶と古い記憶を整理する。

重複、矛盾、完了済みタスク、古いユーザー嗜好、`INDEX.md` 未掲載の Memory、参照切れを検出し、修正案を提示する。

詳細手順は `99_System/Prompts/Workflows/PruneMemory.md` を参照する。

### 分類

- `obsolete`
- `duplicate`
- `completed`
- `conflict`
- `missing-from-index`
- `broken-reference`
- `needs-clarification`

### 安全ルール

- 原則として `99_System/Memory/INDEX.md` を最新状態に再構成する。
- 詳細 Memory 本体は履歴として保持する。
- Memory の削除、`99_System/Memory/Archive/` への移動、Permanent note の変更は、必ずユーザー確認後に実行する。
- 実行時は `検出結果`, `推奨アクション`, `実行した変更`, `保留事項` を Obsidian 互換 Markdown で報告する。

## review-system / システム点検

Knowledge Nexus の中核ファイル群の整合性を点検する。

対象は `SYSTEM_MANIFEST.md`, `99_System/README.md`, `99_System/Prompts/Protocols/CommandProtocol.md`, `99_System/Prompts/Workflows/`, `99_System/Memory/INDEX.md`, `99_System/Handoff/README.md`, `99_System/Tests/`, `index/02_Areas/自己紹介.md`（存在する場合のみ）, `index/02_Areas/meta_me.md`（存在する場合のみ）。

Manifest の肥大化、コマンド一覧の不一致、Workflow 不足、参照切れ、古いドキュメント、テスト不足を検出する。

詳細手順は `99_System/Prompts/Workflows/ReviewSystem.md` を参照する。

削除、Archive 移動、Permanent note 変更は必ずユーザー確認後に実行する。

## promote-memory / 記憶昇格

`99_System/Memory/` に蓄積されたセッション記憶から、Permanent note に昇格すべき長期知識を抽出・提案する。

単なる履歴、ユーザー嗜好、システムルール、一般化可能な知見を分離し、昇格・統合・保留を分類する。

詳細手順は `99_System/Prompts/Workflows/PromoteMemory.md` を参照する。

Permanent note の作成・更新は必ずユーザー確認後に実行する。

## task-audit / 宿題棚卸し

`99_System/Memory/INDEX.md` の Open Tasks と各 Memory の未完了タスクを棚卸しし、実行可能な宿題リストを保つ。

完了済み、重複、外部条件待ち、古いタスク、具体性不足のタスクを分類し、`INDEX.md` の更新案を提示する。

詳細手順は `99_System/Prompts/Workflows/TaskAudit.md` を参照する。

判断が必要な破棄や優先度変更は必ずユーザー確認後に実行する。

## mark-reviewed / 既読

`index/99_System/Reports/` 内で `status: pending-review` のレポートを既読にする。

1. `index/99_System/Reports/` の `*-weekly-maintenance.md` を検索する。
2. `status: pending-review` のファイルを列挙し、対象をユーザーに提示する。
3. 確認後、該当ファイルの frontmatter を `status: reviewed` に書き換える。
4. 完了を報告する。

対象が複数ある場合は一覧を出してからまとめて、または個別に処理する。

## synthesize / 合成

Vault に蓄積されたノート群を横断的に合成し、パターン・矛盾・知識ギャップを抽出して圧縮ダイジェストを生成する。

### 引数（省略可）

- 期間: `synthesize 7d`（直近7日）、`synthesize 30d`（直近30日）、引数なしでデフォルト7日
- 対象: `synthesize resources`（03_Resources のみ）、`synthesize all`（全フォルダ）
- モード: `synthesize devil`（悪魔の代弁者モード ON。Permanent Notes の主要主張に意図的に反論し前提崩しを行う。デフォルト OFF）

### 出力

- 保存先: `index/99_System/Reports/YYYY-MM-DD-synthesis-digest.md`
- 形式: `99_System/Templates/SynthesisDigest_Template.md` に従う

### 発動タイミング

- 手動: ユーザーが `synthesize / 合成` を実行したとき
- 自動: `weekly-maintenance` 実行時に自動で含まれる

詳細手順は `99_System/Prompts/Workflows/SynthesisDigest.md` を参照する。

## process-clippings / クリッピング処理

`index/Clippings/` 内の未処理ファイルを一件ずつ読み、知識を抽出して適切なノートに保存したあと、原本を `index/00_Inbox/Archive/` に移動する。

抽出先の振り分けは以下の基準に従う：

- 再利用できる知識・技術解説 → `index/03_Resources/`
- プロジェクト案・構想 → `index/01_Projects/`
- 普遍的な知見・原則 → `index/03_Resources/Permanent/`
- 内容が薄い・重複 → 抽出ノートなしでアーカイブのみ（ユーザー確認後）

詳細手順は `99_System/Prompts/Workflows/ProcessClippings.md` を参照する。

## StandardResearch / リサーチワークフロー / 調査ワークフロー

ユーザーがこれらのいずれかを指定した場合、サブエージェントを使った分担調査を明示的に要求したものとみなす。

直ちに以下の順序でサブエージェントを dispatch する。

| フェーズ | Agent | 役割 |
|---|---|---|
| Phase 1 | `@librarian` | Vault 内検索 |
| Phase 2 | `@investigator` | 外部調査 |
| Phase 3 | `@analyst` | 統合・構造化 |
| Phase 4 | `@critic` | リスク査読 |
| Phase 5 | `@scribe` | 保存・索引更新 |

詳細手順は `99_System/Prompts/Workflows/StandardResearch.md` を参照する。

## weekly-maintenance / 週次メンテナンス

以下のコマンドを順次実行し、Vault の健全性を維持する定期メンテナンス。

実行順序: `task-audit` → `review-system` → `prune-memory` → `synthesize` → `rebuild-index`

### 発動条件

`run / load` 時に自動判定する（OS スケジューラー不要）。

- 最新の `*-weekly-maintenance.md` が**7日以上前**、または `index/99_System/Reports/` に**存在しない**場合に実行を提案する
- 各コマンドの変更はすべてユーザー確認後に実行する（提案のみ自動、実行は確認制）

### レポート出力

- 保存先: `index/99_System/Reports/YYYY-MM-DD-weekly-maintenance.md`
- frontmatter: `status: pending-review`
- `mark-reviewed` コマンドで既読にすると次回 `run / load` での通知対象から除外される

## rebuild-index / インデックス再生成

`99_System/VaultIndex.md` を決定論的に再生成する。

1. `node 99_System/Scripts/rebuild_vault_index.js` を実行する。
2. `index/` 以下の全 `.md` ファイルを列挙する（漏れなし）。
3. 各ファイルから frontmatter の tags と本文サマリーを抽出して VaultIndex エントリを生成する。
4. `99_System/VaultIndex.md` を上書き保存する。

### 除外対象

`Daily_Notes` / `00_Inbox/Archive` / `99_System/Reports` / `99_System/Handoff` / `99_System/Memory` / `99_System/Scripts` / `99_System/Templates` / `99_System/Tests`

### 実行タイミング

- 手動: ユーザーが `rebuild-index` を実行したとき
- 自動: `weekly-maintenance` 実行時に自動で含まれる

### サマリー抽出の優先順位

1. frontmatter の `description` フィールド
2. 本文の `## エグゼクティブサマリー`（または Summary / 概要）直後の最初の段落
3. H1 直後の最初の段落
4. 本文最初の散文行

## Encoding

Windows PowerShell で Markdown ファイルを読む場合は、必ず `Get-Content -Raw -Encoding UTF8` を使用する。

既定エンコーディングで読むと日本語が文字化けする可能性がある。

## Memory Hygiene

重要な決定、ユーザー嗜好、未完了タスク、システム構成変更、受け入れ試験結果が発生した場合は、応答終了前に Memory 更新の要否を判定する。

更新が必要な場合は `99_System/Templates/Session_Memory_Template.md` に沿って `99_System/Memory/` への追記案または新規 Memory 案を提示・作成する。

Memory を追加・更新した場合は、原則として `99_System/Memory/INDEX.md` も更新し、`run / load` 時に大量の Memory を読まずに済む状態を保つ。

ユーザーが明示的に `crystallize` を実行した場合は、保存対象を精査したうえで Memory または Permanent note を更新する。

## 終了時の推奨メンテナンス

作業終了時、必要に応じて次のコマンド候補を理由付きで短く提案する。

これは独立コマンドではなく、終了時確認の標準動作として扱う。

- 重要な決定、ユーザー嗜好、システム変更が出た場合: `crystallize`
- 次回も同じ作業を続ける場合: `handoff`
- 会話が長くなり、別LLMや次応答へ渡す必要がある場合: `condense`
- 短期文脈が古い、または別作業に移る場合: `clear-handoff`
- Memory や `INDEX.md` に矛盾、重複、古い情報が増えた場合: `prune-memory`
- Manifest、README、Protocol、Workflow、INDEX を更新した場合: `review-system`
- Memory に一般化できそうな知見が溜まった場合: `promote-memory`
- Open Tasks が増えた、または完了済みが混ざった場合: `task-audit`
- `Clippings/` に未処理ファイルが溜まっている場合: `process-clippings`

毎回すべてを提案してはならない。必要なものだけを、理由とともに最小限で提示する。
