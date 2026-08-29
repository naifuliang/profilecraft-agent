#!/usr/bin/env node

import { cp, mkdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const root = process.cwd();
const source = join(root, "skills", "profilecraft");
const destination = join(root, "plugins", "profilecraft-agent", "skills", "profilecraft");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log("Synced the portable ProfileCraft skill into the Codex plugin.");
