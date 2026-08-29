#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { auditProfile } from "./audit.js";
import { getCapabilities, VERSION } from "./capabilities.js";
import { ProfileCraftError, toSafeError } from "./errors.js";
import {
  assertLiveWritesEnabled,
  environmentFromProcess,
  getLinkedInUserInfo,
  publishLinkedInPost,
} from "./linkedin.js";
import { evaluatePolicy, PolicyActionSchema } from "./policy.js";
import { assertPostConfirmation, preparePost, type PostDraft, type PostPreview } from "./posts.js";

const usage = `ProfileCraft ${VERSION}

Usage:
  profilecraft capabilities [--json]
  profilecraft policy check <action> [--official-api] [--approved] [--confirmed] [--json]
  profilecraft profile audit --input <file|-> [--target-role <role>] [--keyword <term>]... [--json]
  profilecraft post prepare --text <text> | --text-file <file> --author <member-id> [--visibility PUBLIC] [--json]
  profilecraft post publish --text <text> | --text-file <file> --author <member-id> --confirmation <id> [--visibility PUBLIC] [--json]
  profilecraft linkedin me [--json]
  profilecraft --version

Live publishing also requires PROFILECRAFT_ENABLE_WRITES=1 and official LinkedIn API credentials.
Scraping and LinkedIn browser automation are intentionally unsupported.`;

interface OutputOptions {
  json?: boolean | undefined;
}

function print(value: unknown, options: OutputOptions = {}): void {
  if (options.json || typeof value !== "string") {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  } else {
    process.stdout.write(`${value}\n`);
  }
}

function stringValue(value: unknown, name: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`Missing required option --${name}.`);
  return value;
}

async function readStandardInput(): Promise<string> {
  process.stdin.setEncoding("utf8");
  let content = "";
  for await (const chunk of process.stdin) content += chunk;
  return content;
}

async function confirmInTerminal(preview: PostPreview): Promise<void> {
  if (!process.stdin.isTTY || !process.stderr.isTTY) {
    throw new ProfileCraftError(
      "INTERACTIVE_CONFIRMATION_REQUIRED",
      "Live CLI publishing requires an attached interactive terminal. Non-interactive publishing is disabled.",
    );
  }

  process.stderr.write(
    [
      "\nFinal LinkedIn post confirmation",
      `Author: ${preview.author}`,
      `Visibility: ${preview.visibility}`,
      "",
      preview.text,
      "",
    ].join("\n"),
  );
  const terminal = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const expected = `PUBLISH ${preview.confirmationId}`;
    const answer = await terminal.question(`Type ${JSON.stringify(expected)} to publish: `);
    if (answer.trim() !== expected) {
      throw new ProfileCraftError("PUBLISHING_DECLINED", "Publishing was not confirmed in the terminal.");
    }
  } finally {
    terminal.close();
  }
}

async function readText(values: { text?: string | undefined; "text-file"?: string | undefined }): Promise<string> {
  if (values.text && values["text-file"]) throw new Error("Use either --text or --text-file, not both.");
  if (values.text) return values.text;
  if (values["text-file"]) return readFile(values["text-file"], "utf8");
  throw new Error("A post requires --text or --text-file.");
}

async function runCapabilities(args: string[]): Promise<void> {
  const { values } = parseArgs({ args, options: { json: { type: "boolean" } }, strict: true });
  print(getCapabilities(environmentFromProcess()), { json: values.json });
}

async function runPolicy(args: string[]): Promise<void> {
  if (args[0] !== "check") throw new Error("Expected: profilecraft policy check <action>.");
  const action = PolicyActionSchema.parse(args[1]);
  const { values } = parseArgs({
    args: args.slice(2),
    options: {
      "official-api": { type: "boolean" },
      approved: { type: "boolean" },
      confirmed: { type: "boolean" },
      json: { type: "boolean" },
    },
    strict: true,
  });
  print(
    evaluatePolicy(action, {
      officialApi: values["official-api"],
      approvedProgram: values.approved,
      userConfirmed: values.confirmed,
    }),
    { json: values.json },
  );
}

async function runProfile(args: string[]): Promise<void> {
  if (args[0] !== "audit") throw new Error("Expected: profilecraft profile audit --input <file|->.");
  const { values } = parseArgs({
    args: args.slice(1),
    options: {
      input: { type: "string" },
      "target-role": { type: "string" },
      keyword: { type: "string", multiple: true, default: [] },
      json: { type: "boolean" },
    },
    strict: true,
  });
  const input = stringValue(values.input, "input");
  const source = input === "-" ? await readStandardInput() : await readFile(input, "utf8");
  const profile: unknown = JSON.parse(source);
  const audit = auditProfile(profile, { targetRole: values["target-role"], keywords: values.keyword });

  if (values.json) {
    print(audit, { json: true });
    return;
  }

  const improvements = audit.findings.filter((item) => item.status === "improve");
  print(
    [
      audit.summary,
      "",
      ...improvements.map((item) => `- [${item.section}] ${item.recommendation}`),
    ].join("\n"),
  );
}

async function postInput(
  args: string[],
  includeConfirmation: boolean,
): Promise<{ draft: PostDraft; confirmation?: string | undefined; json?: boolean | undefined }> {
  const { values } = parseArgs({
    args,
    options: {
      text: { type: "string" },
      "text-file": { type: "string" },
      author: { type: "string" },
      visibility: { type: "string", default: "PUBLIC" },
      confirmation: { type: "string" },
      json: { type: "boolean" },
    },
    strict: true,
  });
  if (!includeConfirmation && values.confirmation) throw new Error("--confirmation is only valid for post publish.");
  const text = await readText(values);
  if (values.visibility !== "PUBLIC" && values.visibility !== "CONNECTIONS") {
    throw new Error("--visibility must be PUBLIC or CONNECTIONS.");
  }
  return {
    draft: {
      text,
      authorPersonId: stringValue(values.author, "author"),
      visibility: values.visibility,
    },
    confirmation: values.confirmation,
    json: values.json,
  };
}

async function runPost(args: string[]): Promise<void> {
  const operation = args[0];
  if (operation === "prepare") {
    const input = await postInput(args.slice(1), false);
    const preview = preparePost(input.draft);
    if (input.json) print(preview, { json: true });
    else {
      print(
        [
          "Post preview (no write performed)",
          `Author: ${preview.author}`,
          `Visibility: ${preview.visibility}`,
          `Characters: ${preview.characterCount}`,
          "",
          preview.text,
          "",
          `Confirmation ID: ${preview.confirmationId}`,
        ].join("\n"),
      );
    }
    return;
  }

  if (operation === "publish") {
    const input = await postInput(args.slice(1), true);
    const confirmationId = stringValue(input.confirmation, "confirmation");
    const environment = environmentFromProcess();
    assertLiveWritesEnabled(environment);
    const preview = assertPostConfirmation(input.draft, confirmationId);
    await confirmInTerminal(preview);
    const result = await publishLinkedInPost(
      { ...input.draft, confirmationId },
      environment,
    );
    print(result, { json: input.json });
    return;
  }

  throw new Error("Expected: profilecraft post prepare|publish.");
}

async function runLinkedIn(args: string[]): Promise<void> {
  if (args[0] !== "me") throw new Error("Expected: profilecraft linkedin me.");
  const { values } = parseArgs({ args: args.slice(1), options: { json: { type: "boolean" } }, strict: true });
  print(await getLinkedInUserInfo(environmentFromProcess()), { json: values.json });
}

async function main(args: string[]): Promise<void> {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    print(usage);
    return;
  }
  if (args[0] === "--version" || args[0] === "-v") {
    print(VERSION);
    return;
  }

  switch (args[0]) {
    case "capabilities":
      await runCapabilities(args.slice(1));
      return;
    case "policy":
      await runPolicy(args.slice(1));
      return;
    case "profile":
      await runProfile(args.slice(1));
      return;
    case "post":
      await runPost(args.slice(1));
      return;
    case "linkedin":
      await runLinkedIn(args.slice(1));
      return;
    default:
      throw new Error(`Unknown command: ${args[0] ?? ""}. Use --help for usage.`);
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  const safe = toSafeError(error);
  process.stderr.write(`${JSON.stringify({ error: safe })}\n`);
  process.exitCode = 1;
});
