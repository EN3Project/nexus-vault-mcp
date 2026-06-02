# Quality Golden Set

このファイルは Knowledge Nexus の受け入れ試験ケースを定義する。
`run / load` 後に手動または自動で実行し、期待動作と一致するかを確認する。

---

## Case 001: run / load

**Input:** `run`

**Expected:**
- `99_System/Memory/INDEX.md` を読む
- `CURRENT_CONTEXT.md` が存在する場合は自動読込せず、選択肢を提示する
- `index/Clippings/` の未処理件数を確認する（存在すれば通知）
- Weekly Maintenance トリガーを判定する（最終レポートが7日以上前なら提案）

---

## Case 002: rebuild-index

**Input:** `rebuild-index`

**Expected:**
- `index/` 配下の対象 Markdown ファイルを列挙する
- `Daily_Notes`, `00_Inbox/Archive`, `99_System/Reports`, `99_System/Handoff`, `99_System/Memory`, `99_System/Scripts`, `99_System/Templates`, `99_System/Tests` を除外する
- `99_System/VaultIndex.md` を再生成して完了件数を報告する

---

## Case 003: vault_search（MCP）

**Input:** `vault_search("knowledge nexus")`

**Expected:**
- `VaultIndex.md` をキーワード検索する
- 関連ノート一覧（パス・タグ・サマリー）を返す
- VaultIndex 未生成の場合は `rebuild-index` を促すメッセージを返す

---

## Case 004: vault_write（.md 限定）

**Input:** `vault_write("index/test.txt", "content")`

**Expected:**
- `.md` 以外の拡張子は `Only Markdown files (.md) can be written` エラーを返す

**Input:** `vault_write("../../../etc/passwd", "content")`

**Expected:**
- パストラバーサルを検出して `Access denied` エラーを返す

---

## Case 005: condense / handoff

**Input:** `condense`

**Expected:**
- 固定見出し `# Condensed Context` で始まる
- セクション順: 目的 / 現在状態 / 決定事項 / 有効な制約 / 未解決事項 / 次アクション / 参照 / audit_trail / decision_rationale / open_questions / 持ち越さない情報

**Input:** `handoff`

**Expected:**
- 同一フォーマットで `99_System/Handoff/CURRENT_CONTEXT.md` に書き込む

---

## Case 006: unknown command

**Input:** `unknown-command`

**Expected:**
- 既知コマンド一覧を提示する
- 近いコマンドとして勝手に実行しない

---

## Case 007: vault_write — 許可外パス

**Input:** `vault_write("99_System/Scripts/evil.md", "...")`

**Expected:**
- `Write not allowed` エラーを返す（Scripts は許可パス外）

**Input:** `vault_write("index/03_Resources/note.md", "...")`

**Expected:**
- 正常に書き込み完了メッセージを返す

---

## Case 008: vault_write — 非 Markdown ファイル

**Input:** `vault_write("index/test.txt", "content")`

**Expected:**
- `Only Markdown files (.md) can be written` エラーを返す
