# Architecture

## Goals

ProfileCraft provides one policy and execution core that can be used by humans, Codex, Claude, OpenClaw, and other MCP clients. It prioritizes predictable behavior, inspectable previews, and fail-closed external writes over broad automation.

## Components

### Domain core

- `profile.ts` defines strict user-owned profile schemas.
- `audit.ts` performs deterministic scoring with no network access.
- `policy.ts` classifies supported, approval-required, restricted, and prohibited actions.
- `posts.ts` normalizes posts and creates a confirmation fingerprint over material fields.

### LinkedIn boundary

`linkedin.ts` is the only production HTTP boundary. It uses fixed official LinkedIn hosts, requires environment-provided credentials, applies request timeouts, validates API versions, requires author binding for every write, returns only allowlisted and size-limited identity fields, and returns sanitized failures.

The current write path is:

```text
draft → schema validation → preview → confirmation ID → user approval
      → process write gate → MCP client elicitation → confirmation revalidation
      → one API request → safe receipt
```

### Adapters

- `cli.ts` parses commands and renders human or JSON output.
- `mcp-server.ts` registers the same core functions as MCP tools.
- `mcp.ts` connects the server to stdio.
- `skills/profilecraft` supplies agent decision guidance.
- `plugins/profilecraft-agent` packages the skill and MCP launch configuration for Codex.

Adapters do not own policy. A new adapter must call the shared core rather than reimplementing confirmation or API behavior.

## Data flow

Profile audit data stays in process and is not persisted by the library. LinkedIn access tokens are read from the process environment when an API call occurs. The server does not expose credential values in capability reports, logs, or errors.

For a publish operation, the MCP/CLI input carries post content and the confirmation ID. The token is obtained separately from the server process environment. MCP publishing also asks the client to elicit a fresh boolean decision from the user; an agent cannot replace that interaction with an input field. This separation prevents an agent transcript from becoming the credential or approval channel.

## Extension rules

New official API capabilities belong in the LinkedIn boundary with:

1. a documented endpoint and access model;
2. a narrow input schema;
3. a preview representation;
4. exact confirmation binding;
5. process-level write gating;
6. injected network transport for tests;
7. safe receipts and sanitized failures;
8. policy, skill, README, and threat-model updates.

Website automation is not an extension mechanism.
