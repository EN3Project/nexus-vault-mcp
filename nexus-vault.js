#!/usr/bin/env node
/**
 * Nexus Vault MCP Server (HTTP mode)
 * Copyright (c) 2026 EN3Project — MIT License with Commons Clause + Attribution Condition
 * https://github.com/EN3Project/knowledge-nexus
 *
 * Vault (Obsidian/Markdown) へのアクセスを MCP HTTP プロトコルで提供する。
 * Claude / Gemini / Codex など MCP 対応の任意の LLM から利用可能。
 *
 * 起動: node nexus-vault.js
 * エンドポイント: http://127.0.0.1:3100/mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import http from "http";

const PORT = parseInt(process.env.NEXUS_PORT || "3100", 10);
const VAULT_PATH = process.env.NEXUS_VAULT_PATH || path.resolve("index");
const INDEX_PATH = process.env.NEXUS_INDEX_PATH || path.resolve("99_System", "VaultIndex.md");

// --- ツール定義 ---

const TOOLS = [
  {
    name: "vault_search",
    description:
      "Vault Index を検索して関連ノートの一覧を返す。まずこのツールで候補を絞ってから vault_read で全文を読むこと。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "検索クエリ（日本語・英語どちらでも可）" },
      },
      required: ["query"],
    },
  },
  {
    name: "vault_read",
    description: "指定したパスのファイルを全文読み込む。パスはプロジェクトルートからの相対パス。Vault ノートは index/... で始まる。",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "ファイルの相対パス（例: index/03_Resources/Permanent/note.md）",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "vault_write",
    description: "指定したパスにノートを書き込む（新規作成 or 上書き）。パスはプロジェクトルートからの相対パス。",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "書き込み先の相対パス" },
        content: { type: "string", description: "書き込む Markdown コンテンツ" },
      },
      required: ["path", "content"],
    },
  },
];

// --- ヘルパー ---

function resolveVaultPath(relativePath) {
  const base = path.resolve(VAULT_PATH, "..");
  const resolved = path.resolve(base, relativePath);
  const rel = path.relative(base, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Access denied: ${relativePath}`);
  }
  return resolved;
}

function searchIndex(query) {
  if (!fs.existsSync(INDEX_PATH)) {
    return "VaultIndex.md が見つかりません。rebuild-index を実行してください。";
  }
  const index = fs.readFileSync(INDEX_PATH, "utf-8");
  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = [];
  let current = null;

  for (const line of index.split("\n")) {
    if (line.startsWith("### ")) {
      if (current) results.push(current);
      current = { path: line.replace("### ", "").trim(), tags: "", summary: "" };
    } else if (current && line.startsWith("- **Tags:**")) {
      current.tags = line.replace("- **Tags:**", "").trim();
    } else if (current && line.startsWith("- **Summary:**")) {
      current.summary = line.replace("- **Summary:**", "").trim();
    }
  }
  if (current) results.push(current);

  const matched = results.filter((r) => {
    const text = `${r.path} ${r.tags} ${r.summary}`.toLowerCase();
    return keywords.some((kw) => text.includes(kw));
  });

  if (matched.length === 0) return `「${query}」に関連するノートは見つかりませんでした。`;

  return matched
    .map((r) => `**${r.path}**\nTags: ${r.tags || "—"}\n${r.summary}`)
    .join("\n\n");
}

function readNote(relativePath) {
  const fullPath = resolveVaultPath(relativePath);
  if (!fs.existsSync(fullPath)) return `ファイルが見つかりません: ${relativePath}`;
  return fs.readFileSync(fullPath, "utf-8");
}

function writeNote(relativePath, content) {
  const fullPath = resolveVaultPath(relativePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(fullPath, content, "utf-8");
  return `書き込み完了: ${relativePath}`;
}

// --- MCP サーバーファクトリ ---

function createMcpServer() {
  const server = new Server(
    { name: "nexus-vault", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      let result;
      if (name === "vault_search") result = searchIndex(args.query);
      else if (name === "vault_read") result = readNote(args.path);
      else if (name === "vault_write") result = writeNote(args.path, args.content);
      else throw new Error(`Unknown tool: ${name}`);
      return { content: [{ type: "text", text: result }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  });

  return server;
}

// --- HTTP サーバー ---

const httpServer = http.createServer(async (req, res) => {
  if (req.url !== "/mcp") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const origin = req.headers.origin;
  const isLocalOrigin = !origin || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin);
  if (!isLocalOrigin) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  if (origin) res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createMcpServer();
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.error(`Nexus Vault MCP Server running at http://127.0.0.1:${PORT}/mcp`);
});
