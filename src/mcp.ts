#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import process from "node:process";
import { createProfileCraftServer } from "./mcp-server.js";

const server = createProfileCraftServer();
const transport = new StdioServerTransport(process.stdin, process.stdout, { maxBufferSize: 2 * 1024 * 1024 });

server.connect(transport).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown MCP server error.";
  process.stderr.write(`ProfileCraft MCP server failed: ${message}\n`);
  process.exitCode = 1;
});
