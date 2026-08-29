import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";
import { preparePost } from "../src/posts.js";

const execFileAsync = promisify(execFile);

test("CLI reports capabilities without exposing credential values", async () => {
  const { stdout } = await execFileAsync(process.execPath, ["dist/src/cli.js", "capabilities", "--json"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PROFILECRAFT_LINKEDIN_ACCESS_TOKEN: "sensitive-cli-test-token",
    },
  });
  const report = JSON.parse(stdout) as { credentials: { accessTokenAvailable: boolean } };

  assert.equal(report.credentials.accessTokenAvailable, true);
  assert.equal(stdout.includes("sensitive-cli-test-token"), false);
});

test("CLI rejects prohibited policy actions with a machine-readable decision", async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ["dist/src/cli.js", "policy", "check", "profile.scrape", "--json"],
    { cwd: process.cwd() },
  );
  const decision = JSON.parse(stdout) as { allowed: boolean; status: string };

  assert.equal(decision.allowed, false);
  assert.equal(decision.status, "prohibited");
});

test("CLI rejects an unknown post visibility instead of changing it", async () => {
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        "dist/src/cli.js",
        "post",
        "prepare",
        "--author",
        "member_123",
        "--visibility",
        "PRIVATE",
        "--text",
        "A test post.",
      ],
      { cwd: process.cwd() },
    ),
    (error: unknown) => {
      const stderr =
        typeof error === "object" && error !== null && "stderr" in error ? String(error.stderr) : "";
      return stderr.includes("--visibility must be PUBLIC or CONNECTIONS");
    },
  );
});

test("CLI live publishing fails closed without an interactive terminal", async () => {
  const draft = { text: "A test post.", authorPersonId: "member_123", visibility: "PUBLIC" as const };
  const confirmationId = preparePost(draft).confirmationId;
  await assert.rejects(
    execFileAsync(
      process.execPath,
      [
        "dist/src/cli.js",
        "post",
        "publish",
        "--author",
        draft.authorPersonId,
        "--visibility",
        draft.visibility,
        "--text",
        draft.text,
        "--confirmation",
        confirmationId,
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PROFILECRAFT_LINKEDIN_ACCESS_TOKEN: "test-only",
          PROFILECRAFT_LINKEDIN_PERSON_ID: draft.authorPersonId,
          PROFILECRAFT_LINKEDIN_VERSION: "202608",
          PROFILECRAFT_ENABLE_WRITES: "1",
        },
      },
    ),
    (error: unknown) => {
      const stderr =
        typeof error === "object" && error !== null && "stderr" in error ? String(error.stderr) : "";
      return stderr.includes("INTERACTIVE_CONFIRMATION_REQUIRED");
    },
  );
});
