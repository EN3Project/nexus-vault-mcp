# Knowledge Nexus

**あなたのセカンドブレインを、AI ネイティブに。**

膨大な情報を AI エージェント組織に処理させ、あなたには圧縮されたエッセンスだけを届ける——  
Obsidian Vault ベースの AI ナレッジ管理システムです。

Claude、Gemini、Codex など、[MCP](https://modelcontextprotocol.io/) 対応の任意の LLM クライアントで動作します。

あなたのノート。あなたの AI。ベンダーロックインなし。

**[ランディングページ →](https://en3project.github.io/knowledge-nexus/)**

---

## どちらを使う？

| | リポジトリ | こんな方に |
|---|---|---|
| 🚀 **まず試したい** | [knowledge-nexus-template](https://github.com/EN3Project/knowledge-nexus-template) | 汎用テンプレートとして clone して使いたい・個人情報なしのクリーンな出発点が欲しい |
| 🔧 **フルシステムを直接使いたい** | このリポジトリ | 開発ログ・運用事例を参照しながら使いたい・中身を理解したうえでカスタマイズしたい |

---

## コンセプト

Knowledge Nexus は**知識図書館**であり**情報圧縮装置**です。

```
[生情報 / Clippings]
        ↓
[AI エージェント組織が処理・収蔵]
        ↓
[圧縮されたエッセンスをあなたに届ける]
```

情報の海を泳ぐのは AI の仕事。あなたは岸でエッセンスだけ受け取る。

---

## 特徴

- **LLM 非依存** — Claude Code / Gemini CLI / Codex など主要クライアントに対応
- **ローカルファースト** — Vault はすべて手元のマシンに保存。外部 API にデータを送信しない
- **6体のエージェントチーム** — 司書・調査員・分析官・査読官・書記官・学芸員が協調して動く
- **MCP サーバー内蔵** — `vault_search`・`vault_read`・`vault_write` で Vault に直接アクセス
- **フルシステムテンプレート** — エージェント定義・ワークフロー・メモリプロトコル付属

---

## 同梱内容

```
knowledge-nexus/
├── nexus-vault.js          # Vault MCP サーバー（LLM と Vault を繋ぐエンジン）
├── SYSTEM_MANIFEST.md      # Nexus オーケストレーターのコアルール
├── CLAUDE.md               # Claude Code 用エントリーポイント
├── AGENTS.md               # Codex 用エントリーポイント
├── GEMINI.md               # Gemini CLI 用エントリーポイント
├── 99_System/
│   ├── Memory/             # セッション記憶・長期記憶インデックス
│   ├── Handoff/            # 短期作業文脈の引き継ぎバッファ
│   ├── Tests/              # 受け入れ試験・品質評価（QualityGoldenSet テンプレート含む）
│   └── Prompts/
│       ├── Personas/       # 人格テンプレート（カスタマイズ推奨）
│       ├── Protocols/      # コマンド仕様
│       ├── Roles/Library/  # 6体のエージェントロール定義
│       ├── Skills/         # 共有スキルプロンプト
│       └── Workflows/      # StandardResearch・SynthesisDigest など
├── index/
│   ├── Clippings/          # 記事・メモの投入口
│   ├── 00_Inbox/Archive/   # 処理済み Clippings の保管庫
│   ├── 01_Projects/        # プロジェクトノート
│   ├── 02_Areas/           # 管理領域
│   └── 03_Resources/       # 知識ノート（Permanent 含む）
└── docs/                   # ランディングページ（GitHub Pages）
```

---

## セットアップ

### 1. 依存パッケージをインストール

```bash
npm install
```

### 2. Vault のパスを設定

**macOS / Linux:**
```bash
export NEXUS_VAULT_PATH=/path/to/your/vault/index
export NEXUS_INDEX_PATH=/path/to/your/vault/99_System/VaultIndex.md
```

**Windows (PowerShell):**
```powershell
$env:NEXUS_VAULT_PATH = "C:\path\to\your\vault\index"
$env:NEXUS_INDEX_PATH = "C:\path\to\your\vault\99_System\VaultIndex.md"
```

> このリポジトリ自体を Vault として使う場合は `index/` フォルダを指定してください。

### 3. MCP サーバーを起動（LLM より先に起動してください）

```bash
npm start
# エンドポイント: http://127.0.0.1:3100/mcp
```

### 4. VaultIndex を初期化

```bash
node 99_System/Scripts/rebuild_vault_index.js
```

---

## LLM との接続方法

### Claude Code

`~/.claude/mcp.json` に追加：

```json
{
  "mcpServers": {
    "nexus-vault": {
      "type": "http",
      "url": "http://127.0.0.1:3100/mcp"
    }
  }
}
```

プロジェクトを Claude Code で開くと `CLAUDE.md` が自動的に読み込まれます。

### Gemini CLI

```json
{
  "mcpServers": {
    "nexus-vault": {
      "httpUrl": "http://127.0.0.1:3100/mcp"
    }
  }
}
```

### Codex

```json
{
  "mcpServers": {
    "nexus-vault": {
      "url": "http://127.0.0.1:3100/mcp"
    }
  }
}
```

---

## コマンドリスト

詳細仕様は [`99_System/Prompts/Protocols/CommandProtocol.md`](./99_System/Prompts/Protocols/CommandProtocol.md) を参照。

### 起動

| コマンド | 説明 |
|----------|------|
| `run` / `load` | Nexus を起動。記憶・人格を復元し、未処理 Clippings や週次メンテナンスの要否を確認する |

### 調査・処理

| コマンド | 説明 |
|----------|------|
| `standardresearch` | 5フェーズ調査ワークフローを実行（Retrieval → Investigation → Analysis → Review → Output） |
| `synthesize` | Vault を横断合成。洞察ベスト3・横断パターン・知識ギャップを抽出してダイジェストを生成 |
| `process-clippings` | `index/Clippings/` の未処理ファイルを知識ノートに変換し、Archive に移動する |

### 記憶管理

| コマンド | 説明 |
|----------|------|
| `crystallize` / `結晶化` | 重要な決定・知識・ユーザー嗜好を長期記憶として保存する |
| `condense` / `圧縮` | 会話の現在状態を構造化して確認する。別 LLM への引き継ぎにも使える（ファイル保存なし） |
| `handoff` / `引き継ぎ` | 短期作業文脈を `99_System/Handoff/CURRENT_CONTEXT.md` に保存する |
| `clear-handoff` / `引き継ぎ破棄` | `CURRENT_CONTEXT.md` を削除する |
| `prune-memory` / `記憶整理` | Memory の重複・陳腐化・矛盾を検出・整理する |
| `promote-memory` / `記憶昇格` | セッション記憶から Permanent Notes に昇格すべき知識を提案する |

### メンテナンス

| コマンド | 説明 |
|----------|------|
| `weekly-maintenance` / `週次メンテナンス` | task-audit → review-system → prune-memory → synthesize → rebuild-index を一括実行 |
| `review-system` / `システム点検` | コアファイルの整合性を点検する |
| `task-audit` / `宿題棚卸し` | Open Tasks を棚卸しし、完了・重複・陳腐化を整理する |
| `mark-reviewed` / `既読` | `pending-review` 状態のレポートを既読にする |
| `rebuild-index` / `インデックス再生成` | `VaultIndex.md` を再生成する |

---

## Vault MCP サーバー（nexus-vault.js）

Knowledge Nexus の核となるエンジン。LLM と Vault を MCP プロトコルで繋ぎます。

| ツール | 説明 |
|--------|------|
| `vault_search(query)` | VaultIndex.md を検索して関連ノートの一覧を返す |
| `vault_read(path)` | 指定パスのノートを全文取得 |
| `vault_write(path, content)` | ノートを新規作成または上書き保存 |

## 環境変数

| 変数 | デフォルト | 説明 |
|------|-----------|------|
| `NEXUS_VAULT_PATH` | `./index` | Vault ディレクトリのパス |
| `NEXUS_INDEX_PATH` | `./99_System/VaultIndex.md` | VaultIndex.md のパス |
| `NEXUS_PORT` | `3100` | MCP サーバーのポート番号 |

---

## 動作要件

- Node.js v18 以上
- Obsidian（または Markdown ファイルを扱えるエディタ）
- MCP 対応の LLM クライアント（Claude Code / Gemini CLI / Codex など）

## ライセンス

**Source-available License: MIT-based with Commons Clause + Attribution Condition**

- 個人利用・改変・非商用配布は自由
- **商用利用（販売・有償ホスティング・有償サポート等）は禁止**
- 派生物・フォークには `"Based on Knowledge Nexus by EN3Project"` の表示が必要

詳細は [LICENSE](./LICENSE) を参照してください。
