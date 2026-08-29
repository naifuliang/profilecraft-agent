# ProfileCraft Agent

[![CI](https://github.com/naifuliang/profilecraft-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/naifuliang/profilecraft-agent/actions/workflows/ci.yml)
[![CodeQL](https://github.com/naifuliang/profilecraft-agent/actions/workflows/codeql.yml/badge.svg)](https://github.com/naifuliang/profilecraft-agent/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

ProfileCraft Agent is an API-first toolkit for AI agents that improve professional profiles and publish explicitly confirmed posts through LinkedIn's official API. It ships as a TypeScript library, a human-readable CLI, a local MCP server, a portable `SKILL.md`, and a Codex plugin.

The project is intentionally **not** a LinkedIn scraper or browser bot. It does not automate LinkedIn's website, collect cookies, send connection requests, automate messages, or manufacture engagement.

> ProfileCraft Agent is an independent open-source project. It is not affiliated with, endorsed by, or sponsored by LinkedIn.

## Project status

Version `0.1.0` is a qualified MVP. The implemented surface is deliberately small:

- deterministic audits of user-provided profile data;
- policy classification before a LinkedIn-related action;
- post validation, exact-content preview IDs, and client-mediated confirmation before MCP writes;
- authenticated OIDC `userinfo` reads;
- approval-gated text-post publishing through LinkedIn's official Posts API;
- CLI, MCP, portable skill, and Codex plugin adapters;
- strict TypeScript, unit/integration tests, secret scanning, artifact validation, CI, and CodeQL.

It does not yet implement an OAuth callback server, media upload, organization-page mutations, or restricted Profile Edit endpoints. See [Roadmap](#roadmap).

## Why this architecture

Agent-specific integrations change faster than the business rules they call. ProfileCraft keeps policy, validation, and external-write controls in one shared core, then exposes that core through thin adapters:

```text
Codex plugin       Claude MCP       OpenClaw skill       Human operator
      \                |                 /                    /
                       MCP / CLI boundary
                              |
                ProfileCraft TypeScript core
                  |        |          |
             policy    profile audit  post preview
                                         |
                              explicit confirmation
                                         |
                              LinkedIn official API
```

This matters because an agent cannot bypass the confirmation hash or write-enable switch by choosing a different wrapper. See [Architecture](docs/ARCHITECTURE.md) and [Threat model](docs/THREAT_MODEL.md).

## Capability and policy matrix

| Capability | Status | Notes |
| --- | --- | --- |
| Analyze a user-provided profile, résumé, PDF-derived JSON, or data export | Supported | No LinkedIn page retrieval is performed. |
| Draft headlines, About sections, experience copy, and post content | Supported by the agent skill | Claims must come from user-provided facts. |
| Read authenticated member OIDC userinfo | Supported | Requires a valid official API access token. |
| Preview a member post | Supported | No external write; returns a content-bound confirmation ID. |
| Publish a confirmed member text post | Supported | Requires `w_member_social`, exact confirmation, and process-level live-write opt-in. |
| Edit a personal profile | Restricted | Only through approved Profile Edit API access; otherwise the skill produces copy-ready manual edits. |
| Manage organization pages | Planned/restricted | Requires Community Management approval, scopes, and an eligible page role. |
| Scrape profiles, feeds, jobs, search, or connections | Prohibited | No DOM, browser, proxy, or cookie workaround will be added. |
| Automate messages, connections, comments, reactions, or follows | Prohibited | Drafting is separate from automated execution. |
| Capture passwords, cookies, session tokens, or secrets in chat | Prohibited | Credentials remain in the operator's process environment or secret manager. |

LinkedIn's User Agreement and prohibited-software guidance restrict scraping, unauthorized automation, and interface modification. Review the current terms before deploying an integration:

- [LinkedIn User Agreement](https://www.linkedin.com/legal/user-agreement)
- [LinkedIn prohibited software and extensions](https://www.linkedin.com/help/linkedin/answer/a1341387)
- [LinkedIn API access overview](https://learn.microsoft.com/linkedin/shared/authentication/getting-access)
- [LinkedIn Posts API](https://learn.microsoft.com/linkedin/marketing/community-management/shares/posts-api)

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- Git
- For live LinkedIn calls: a LinkedIn developer application, member authorization, and the required API product/scopes
- For agent use: an MCP-capable host such as Codex, Claude Code, or OpenClaw

## Quick start

```bash
git clone https://github.com/naifuliang/profilecraft-agent.git
cd profilecraft-agent
npm ci
npm run check
node dist/src/cli.js capabilities --json
```

`npm run check` compiles the project, executes the test suite, verifies that the skill and plugin are synchronized, and scans repository text for common credential patterns.

## Audit a profile

Start with the fictional example:

```bash
node dist/src/cli.js profile audit \
  --input examples/profile.example.json \
  --target-role "Product Engineering Leader" \
  --keyword "AI platforms" \
  --keyword "Engineering leadership" \
  --json
```

You can also pipe JSON through standard input:

```bash
node dist/src/cli.js profile audit --input - --json < examples/profile.example.json
```

### Profile input schema

The input is a JSON object. Unknown keys are rejected so an accidental export cannot silently send unrelated data through the workflow.

```json
{
  "fullName": "Jordan Lee",
  "headline": "Product Engineering Leader | Building reliable AI platforms",
  "about": "I lead...",
  "location": "Singapore",
  "industry": "Software",
  "experience": [
    {
      "title": "Director of Product Engineering",
      "company": "Example Labs",
      "startDate": "2022-01",
      "endDate": "Present",
      "description": "Led..."
    }
  ],
  "education": [
    {
      "school": "Example University",
      "degree": "BSc",
      "field": "Computer Science"
    }
  ],
  "skills": ["Engineering leadership", "AI platforms"],
  "featured": [
    {
      "title": "Case study",
      "url": "https://example.com/case-study"
    }
  ]
}
```

The audit is deterministic. It evaluates completeness, positioning, evidence, skill alignment, and profile proof points. It does not call a language model or LinkedIn.

## Check policy before an operation

```bash
node dist/src/cli.js policy check profile.scrape --json
node dist/src/cli.js policy check post.publish --official-api --confirmed --json
node dist/src/cli.js policy check profile.edit --official-api --approved --confirmed --json
```

Supported action names are defined in [`src/policy.ts`](src/policy.ts).

## Prepare a post

Preparation never performs a write:

```bash
node dist/src/cli.js post prepare \
  --author YOUR_LINKEDIN_MEMBER_ID \
  --visibility PUBLIC \
  --text-file examples/post.example.txt
```

The response includes the exact author, visibility, normalized text, warnings, and a confirmation ID such as `pcp_1234...`. That ID is a SHA-256-derived fingerprint of the author, visibility, and final text. Any change invalidates it. The ID proves equality, not user consent.

## Configure official LinkedIn API access

ProfileCraft never accepts credentials as command-line flags and does not load `.env` files automatically. Configure secrets in the process environment or your secret manager:

```bash
export PROFILECRAFT_LINKEDIN_ACCESS_TOKEN="..."
export PROFILECRAFT_LINKEDIN_PERSON_ID="your-member-id"
export PROFILECRAFT_LINKEDIN_VERSION="YYYYMM"
```

Required values:

| Variable | Purpose |
| --- | --- |
| `PROFILECRAFT_LINKEDIN_ACCESS_TOKEN` | Short-lived OAuth access token. A publish token needs `w_member_social`. |
| `PROFILECRAFT_LINKEDIN_PERSON_ID` | Required for publishing. Pins every write to this authenticated member ID. |
| `PROFILECRAFT_LINKEDIN_VERSION` | A currently supported LinkedIn API version in `YYYYMM` form. It is intentionally not hard-coded. |
| `PROFILECRAFT_ENABLE_WRITES` | Must equal `1` for a live mutation. Leave unset or `0` for read/preview mode. |

Do not commit these values. `.env` files and common key formats are ignored, and the repository check rejects common token patterns. The tool also avoids returning API error bodies that could echo sensitive data.

Read the authenticated identity without enabling writes:

```bash
node dist/src/cli.js linkedin me --json
```

## Publish a confirmed post

Publishing requires all of the following:

1. Official API credentials and `w_member_social`.
2. A preview generated from the final author, visibility, and text.
3. The matching confirmation ID.
4. For MCP publishing, a client-mediated interactive confirmation immediately before the request.
5. `PROFILECRAFT_ENABLE_WRITES=1` in the publishing process.

```bash
export PROFILECRAFT_ENABLE_WRITES=1

node dist/src/cli.js post publish \
  --author "$PROFILECRAFT_LINKEDIN_PERSON_ID" \
  --visibility PUBLIC \
  --text-file examples/post.example.txt \
  --confirmation pcp_REPLACE_WITH_PREVIEW_ID \
  --json
```

ProfileCraft performs one API request and does not automatically retry a failed mutation. It returns the post ID and a safe request identifier when available.

The CLI requires an attached interactive terminal and asks the operator to type `PUBLISH <confirmation-id>` after showing the final post again. Non-interactive CLI publishing fails before any network request. For agent-driven publishing, use the MCP tool so the trusted client can present its user-confirmation form.

## Use the MCP server directly

Build the repository, then run the stdio server:

```bash
npm run build
node /absolute/path/to/profilecraft-agent/dist/src/mcp.js
```

The server communicates over standard input/output, so a blank terminal is expected when launched manually. It exposes:

| Tool | External effect |
| --- | --- |
| `profilecraft_capabilities` | None |
| `profilecraft_check_policy` | None |
| `profilecraft_audit_profile` | None |
| `profilecraft_prepare_post` | None |
| `profilecraft_linkedin_me` | Official read request |
| `profilecraft_publish_post` | Official write request with exact-content validation, interactive client confirmation, and environment gate |

## Codex installation

### Recommended: install the repo-local plugin

After cloning and building:

```bash
codex plugin marketplace add /absolute/path/to/profilecraft-agent
codex plugin add profilecraft-agent@personal
```

Restart Codex or open a new task after installation. The plugin bundles the portable skill and forwards only the four named `PROFILECRAFT_*` environment variables to its local MCP server.

The repository follows OpenAI's documented plugin shape: `.codex-plugin/plugin.json`, bundled `skills/`, and `.mcp.json`. See [OpenAI's plugin documentation](https://developers.openai.com/codex/build-plugins).

### MCP-only Codex setup

For read-only profile auditing without the plugin:

```bash
codex mcp add profilecraft -- node /absolute/path/to/profilecraft-agent/dist/src/mcp.js
codex mcp list
```

For credential forwarding, prefer the plugin or add the variable names to the server's `env_vars` in Codex configuration. Do not store a bearer token as a literal `--env` value. See [OpenAI's MCP configuration documentation](https://developers.openai.com/codex/extend/mcp).

## Claude Code installation

Register the same stdio MCP server at project scope:

```bash
claude mcp add --scope project profilecraft -- \
  node /absolute/path/to/profilecraft-agent/dist/src/mcp.js
```

Launch Claude Code from an environment that already contains the required `PROFILECRAFT_*` variables when live API access is needed. To use the instructions as an Agent Skill, copy or link `skills/profilecraft` into the skill location supported by your Claude Code installation.

## OpenClaw installation

When this repository is the OpenClaw workspace, `skills/profilecraft/SKILL.md` is already in the workspace skill tree. In another workspace, copy or link that directory into `<workspace>/skills/profilecraft`.

Register the local MCP server with the installed OpenClaw CLI:

```bash
openclaw mcp set profilecraft '{
  "command": "node",
  "args": ["/absolute/path/to/profilecraft-agent/dist/src/mcp.js"],
  "env_vars": [
    "PROFILECRAFT_LINKEDIN_ACCESS_TOKEN",
    "PROFILECRAFT_LINKEDIN_PERSON_ID",
    "PROFILECRAFT_LINKEDIN_VERSION",
    "PROFILECRAFT_ENABLE_WRITES"
  ]
}'
```

Then inspect the effective registration with `openclaw mcp show profilecraft`. OpenClaw command names can vary by release; use `openclaw mcp --help` if your installed version differs.

## Portable skill

The canonical skill is [`skills/profilecraft/SKILL.md`](skills/profilecraft/SKILL.md). Its detailed references are loaded only for relevant requests:

- [`policy.md`](skills/profilecraft/references/policy.md) for extraction, automation, mutation, and permission decisions;
- [`workflows.md`](skills/profilecraft/references/workflows.md) for auditing, post publishing, manual profile edits, and organization work.

The Codex plugin contains a synchronized copy. Run `npm run sync:plugin` after changing the canonical skill; validation fails if the copies differ.

## Development

```bash
npm ci
npm run typecheck
npm test
npm run validate:artifacts
npm run check:secrets
npm run audit:prod
npm run check
```

The project uses Node's built-in test runner. Tests include:

- strong and incomplete profile audits;
- prohibited-operation policy decisions;
- content-bound post confirmations;
- write-disabled behavior;
- official Posts API request shape with a mock transport;
- secret-safe error behavior;
- an in-memory MCP handshake and tool inventory.

Read [`AGENTS.md`](AGENTS.md) before making changes. It contains the repository's coding-agent contract and definition of done. Human contributors should also read [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Security model

The main controls are enforced in code:

- official API hosts are fixed in source;
- scraping/browser/engagement actions are explicitly prohibited by the policy engine;
- unknown profile fields are rejected;
- post text is limited and normalized;
- a confirmation ID binds author, visibility, and content;
- MCP publishing additionally requires client-mediated user elicitation and fails closed when it is unavailable;
- CLI publishing requires an attached terminal and an exact typed confirmation; non-interactive invocation fails closed;
- live writes are disabled unless the process opts in;
- a required configured member ID prevents author switching;
- API calls have timeouts;
- mutation failures are not automatically retried;
- errors do not include bearer tokens or response bodies;
- CI checks artifacts, secrets, dependencies, and source with CodeQL.

For assumptions, abuse cases, and residual risk, read [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md). To report a vulnerability, read [`SECURITY.md`](SECURITY.md).

## Roadmap

Planned work is tracked in [`docs/ROADMAP.md`](docs/ROADMAP.md). Likely next increments are:

1. OAuth authorization-code callback support with secure local token storage.
2. User-owned LinkedIn data-export importers.
3. Media upload and image/document post previews.
4. Approved organization-page reads and writes.
5. Restricted personal-profile edit tools only for applications that can prove LinkedIn approval.
6. Cross-host behavioral evaluations and packaged releases.

Scraping, website automation, cookie/session reuse, automated connections, automated messaging, and engagement farming are not roadmap items.

## License

[MIT](LICENSE)
