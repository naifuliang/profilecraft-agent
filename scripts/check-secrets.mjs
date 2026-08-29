#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";
import process from "node:process";

const root = process.cwd();
const ignoredDirectories = new Set([".git", "dist", "node_modules", "coverage"]);
const binaryExtensions = new Set([".gif", ".ico", ".jpeg", ".jpg", ".lock", ".pdf", ".png", ".webp"]);
const checks = [
  { name: "private key", pattern: /-----BEGIN (?:EC |OPENSSH |RSA )?PRIVATE KEY-----/u },
  { name: "GitHub token", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/u },
  { name: "GitHub fine-grained token", pattern: /\bgithub_pat_[A-Za-z0-9_]{30,}\b/u },
  {
    name: "populated LinkedIn access token",
    pattern: /^PROFILECRAFT_LINKEDIN_ACCESS_TOKEN=(?!replace-|$).+/mu,
  },
  {
    name: "populated client secret",
    pattern: /(?:client[_-]?secret|LINKEDIN_CLIENT_SECRET)\s*[=:]\s*["']?(?!replace-|example|\$\{|process\.env)[A-Za-z0-9._-]{16,}/iu,
  },
];

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(path)));
    if (entry.isFile() && !binaryExtensions.has(extname(entry.name).toLowerCase())) files.push(path);
  }

  return files;
}

const findings = [];
for (const file of await collectFiles(root)) {
  const content = await readFile(file, "utf8");
  for (const check of checks) {
    if (check.pattern.test(content)) findings.push(`${relative(root, file)}: ${check.name}`);
  }
}

if (findings.length > 0) {
  console.error("Potential secrets detected:\n" + findings.map((finding) => `- ${finding}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Secret-pattern scan passed.");
}
