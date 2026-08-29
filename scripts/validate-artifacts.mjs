#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const pluginRoot = join(root, "plugins", "profilecraft-agent");
const skillRoot = join(root, "skills", "profilecraft");

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(path)));
    if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

const packageManifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const plugin = JSON.parse(await readFile(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));
const mcp = JSON.parse(await readFile(join(pluginRoot, ".mcp.json"), "utf8"));
const marketplace = JSON.parse(await readFile(join(root, ".agents", "plugins", "marketplace.json"), "utf8"));
const skill = await readFile(join(skillRoot, "SKILL.md"), "utf8");
const openaiMetadata = await readFile(join(skillRoot, "agents", "openai.yaml"), "utf8");
const canonicalFiles = await collect(skillRoot);

const errors = [];
if (plugin.name !== "profilecraft-agent") errors.push("plugin name must match its folder");
if (!/^\d+\.\d+\.\d+$/u.test(plugin.version ?? "")) errors.push("plugin version must be strict semver");
if (plugin.version !== packageManifest.version) errors.push("package and plugin versions must match");
if (plugin.mcpServers !== "./.mcp.json") errors.push("plugin must reference ./.mcp.json");
if (!mcp.mcpServers?.profilecraft) errors.push("profilecraft MCP server is missing");
if (mcp.mcpServers?.profilecraft?.args?.[0] !== "../../dist/src/mcp.js") {
  errors.push("plugin MCP path must target the built stdio entrypoint");
}
if (!skill.startsWith("---\nname: profilecraft\n")) errors.push("skill frontmatter is invalid");
if (!openaiMetadata.includes("$profilecraft")) errors.push("skill metadata must include the invocation example");
if (!marketplace.plugins?.some((entry) => entry.name === "profilecraft-agent")) {
  errors.push("repo-local marketplace entry is missing");
}

for (const canonicalFile of canonicalFiles) {
  const relativePath = relative(skillRoot, canonicalFile);
  const canonicalContent = await readFile(canonicalFile, "utf8");
  let pluginContent;
  try {
    pluginContent = await readFile(join(pluginRoot, "skills", "profilecraft", relativePath), "utf8");
  } catch {
    errors.push(`plugin skill is missing ${relativePath}`);
    continue;
  }
  if (canonicalContent.includes("[TODO:")) errors.push(`skill contains a scaffold placeholder in ${relativePath}`);
  if (canonicalContent !== pluginContent) errors.push(`plugin skill is out of sync at ${relativePath}`);
}

if (errors.length > 0) {
  console.error("Artifact validation failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Skill and plugin artifact validation passed.");
}
