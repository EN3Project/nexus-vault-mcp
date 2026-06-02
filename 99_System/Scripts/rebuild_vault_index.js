#!/usr/bin/env node
/**
 * rebuild_vault_index.js
 * index/ 配下の Markdown ファイルをスキャンして 99_System/VaultIndex.md を再生成する。
 *
 * 使用方法:
 *   node 99_System/Scripts/rebuild_vault_index.js
 *
 * 環境変数:
 *   NEXUS_VAULT_PATH  — Vault ディレクトリのパス（デフォルト: ./index）
 *   NEXUS_INDEX_PATH  — 出力先 VaultIndex.md のパス（デフォルト: ./99_System/VaultIndex.md）
 */

import fs from "fs";
import path from "path";

const VAULT_PATH = process.env.NEXUS_VAULT_PATH || path.resolve("index");
const INDEX_PATH = process.env.NEXUS_INDEX_PATH || path.resolve("99_System", "VaultIndex.md");

// index/ からの相対パスで除外するディレクトリプレフィックス
const EXCLUDE_PREFIXES = [
  "Daily_Notes",
  "00_Inbox/Archive",
  "99_System/Reports",
  "99_System/Handoff",
  "99_System/Memory",
  "99_System/Scripts",
  "99_System/Templates",
  "99_System/Tests",
];

function isExcluded(relFromVault) {
  return EXCLUDE_PREFIXES.some(
    (prefix) => relFromVault === prefix || relFromVault.startsWith(prefix + "/")
  );
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    if (key) fm[key] = val;
  }
  return fm;
}

function extractSummary(content, fm) {
  // 優先1: frontmatter description
  if (fm.description) return fm.description;
  // 優先2: frontmatter summary（後方互換）
  if (fm.summary) return fm.summary;

  const body = content.replace(/^---[\s\S]*?---\n?/, "");
  const lines = body.split("\n");

  // 優先3: エグゼクティブサマリー / Summary / 概要 見出し直後の最初の散文段落
  const execHeading = /^##\s+(エグゼクティブサマリー|Executive Summary|Summary|概要)\s*$/i;
  for (let i = 0; i < lines.length; i++) {
    if (execHeading.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        const l = lines[j].trim();
        if (!l) continue;
        if (l.startsWith("#")) break;
        return l.slice(0, 120);
      }
    }
  }

  // 優先4: H1 直後の最初の散文行
  let afterH1 = false;
  for (const line of lines) {
    if (/^# [^#]/.test(line)) { afterH1 = true; continue; }
    if (afterH1) {
      const l = line.trim();
      if (!l) continue;
      if (l.startsWith("#")) break;
      return l.slice(0, 120);
    }
  }

  // 優先5: 本文最初の散文行
  const firstPara = lines.find((l) => l.trim() && !l.startsWith("#"));
  return (firstPara || "").trim().slice(0, 120) || "（サマリーなし）";
}

function extractTags(fm) {
  if (!fm.tags) return "";
  return fm.tags.replace(/[\[\]]/g, "").trim();
}

function walkDir(dir, vaultBase, entries = []) {
  if (!fs.existsSync(dir)) return entries;
  for (const item of fs.readdirSync(dir)) {
    if (item.startsWith(".")) continue;
    const fullPath = path.join(dir, item);
    const relFromVault = path.relative(vaultBase, fullPath).replace(/\\/g, "/");
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (isExcluded(relFromVault)) continue;
      walkDir(fullPath, vaultBase, entries);
    } else if (item.endsWith(".md")) {
      entries.push(relFromVault);
    }
  }
  return entries;
}

// ローカル日付（UTC ではなくシステムタイムゾーン）
function localDateString() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const files = walkDir(VAULT_PATH, VAULT_PATH);
const base = path.resolve(VAULT_PATH, "..");

let output = `# Vault Index\n\n`;
output += `*最終更新: ${localDateString()} — ${files.length} ノート*\n\n`;
output += `*自動生成ファイル。手動編集しないでください。*\n\n`;

for (const relPath of files.sort()) {
  const fullPath = path.join(VAULT_PATH, relPath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const fm = extractFrontmatter(content);
  const tags = extractTags(fm);
  const summary = extractSummary(content, fm);
  const indexRelPath = path.join("index", relPath).replace(/\\/g, "/");

  output += `### ${indexRelPath}\n`;
  output += `- **Tags:** ${tags || "—"}\n`;
  output += `- **Summary:** ${summary}\n\n`;
}

const indexDir = path.dirname(INDEX_PATH);
if (!fs.existsSync(indexDir)) fs.mkdirSync(indexDir, { recursive: true });
fs.writeFileSync(INDEX_PATH, output, "utf-8");

console.log(`VaultIndex 再生成完了: ${files.length} ノート → ${INDEX_PATH}`);
