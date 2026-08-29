# AGENTS.md

This file governs coding agents working anywhere in this repository. It is intentionally named `AGENTS.md`, the standard project-instruction filename recognized by Codex and other agent tooling.

## Mission

Build a trustworthy, API-first toolkit that helps people improve their own professional presence and perform narrowly supported LinkedIn actions through official APIs.

The product must remain useful without becoming a scraper, browser bot, outreach bot, or engagement-manipulation tool.

## Non-negotiable product boundaries

- Do not implement LinkedIn page scraping, DOM extraction, search-result harvesting, or crawling.
- Do not implement browser control, form automation, extension overlays, anti-detection behavior, CAPTCHA handling, or rate-limit evasion for LinkedIn.
- Do not implement automated connection requests, contact downloads, messages, InMail, follows, reactions, comments, or engagement loops.
- Do not accept or persist LinkedIn passwords, cookies, session tokens, or client secrets through prompts, CLI arguments, logs, fixtures, or source files.
- Do not call undocumented or reverse-engineered LinkedIn endpoints.
- Do not imply affiliation with or endorsement by LinkedIn.
- Do not add a live mutation without an official API route, an exact preview, explicit confirmation, a process-level write gate, and tests proving fail-closed behavior.
- Do not weaken these boundaries to make a demonstration pass. Offer a compliant alternative instead.

These are repository requirements, not optional style preferences.

## Repository map

- `src/profile.ts`: strict profile input schemas and audit result types.
- `src/audit.ts`: deterministic profile scoring. It must not call external services.
- `src/policy.ts`: centralized operation classification and product boundaries.
- `src/posts.ts`: post normalization, validation, previewing, and confirmation fingerprints.
- `src/linkedin.ts`: the only production module that sends LinkedIn HTTP requests.
- `src/cli.ts`: thin human-facing adapter over the core.
- `src/mcp-server.ts`: thin agent-facing adapter over the same core.
- `src/mcp.ts`: stdio entrypoint; never write diagnostics to stdout.
- `skills/profilecraft`: canonical portable skill.
- `plugins/profilecraft-agent`: Codex plugin with a synchronized copy of the skill.
- `scripts`: artifact and secret checks; keep them deterministic and offline.
- `tests`: unit and in-memory MCP integration tests. No test may contact LinkedIn.
- `docs`: architecture, threat model, and roadmap.

## Engineering workflow

1. Read the nearest `AGENTS.md` before changing files.
2. Inspect existing behavior and tests before proposing architecture changes.
3. Keep the shared core agent-neutral. Put host-specific details in adapters, skills, or plugin metadata.
4. Make the smallest coherent change that satisfies the issue.
5. Add or update behavior-focused tests.
6. Run `npm run check`.
7. Run `npm run audit:prod` when dependencies or package metadata change.
8. Review the complete diff for credentials, accidental personal data, generated noise, and boundary regressions.

Do not commit `dist/`, `node_modules/`, local tokens, `.env` files, real profile exports, or live API responses.

## Code standards

- Use TypeScript in strict mode. Preserve `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- Prefer small pure functions in the core and dependency injection at network boundaries.
- Parse all external input with Zod or an equally explicit schema.
- Reject unknown keys for personal-data inputs and mutation payloads.
- Return stable machine-readable error codes. Error messages must be useful without exposing credentials or external response bodies.
- Keep official API hosts and endpoint paths explicit. Do not accept arbitrary request URLs from users or agents.
- Apply timeouts to every external request.
- Do not automatically retry non-idempotent writes.
- Keep CLI and MCP handlers thin; they should call exported core functions rather than duplicate policy.
- MCP tool annotations must accurately distinguish read-only tools from mutation tools, but server-side enforcement must not rely on annotations.
- Write no non-protocol output to stdout from the stdio MCP server. Use stderr for startup failures.
- Avoid dependencies when the Node standard library is sufficient. Explain every new production dependency in the pull request.
- Pin dependency versions and update `package-lock.json` with package changes.

## External-write protocol

Every LinkedIn mutation must implement this sequence:

1. Validate the actor, target, content, and official API capability.
2. Produce a no-write preview containing the exact material fields.
3. Bind confirmation to those fields with a deterministic fingerprint or server-held transaction ID.
4. Require explicit user confirmation for that preview through a trusted user interaction. MCP writes must use client elicitation; an agent-supplied boolean or fingerprint is not proof of consent.
5. Require a separate process-level live-write opt-in.
6. Revalidate the confirmation immediately before the request.
7. Send at most one mutation request.
8. Return a safe receipt or a sanitized failure.

Any post-confirmation change invalidates approval. A generic instruction such as “always publish my drafts” does not replace exact-content confirmation.

## Authentication and secrets

- Credentials belong in environment variables, OS credential stores, or a dedicated secret manager.
- Never add credential values to `.mcp.json`, Codex configuration examples, fixtures, snapshots, or GitHub Actions logs.
- Prefer forwarding environment variable names over embedding values.
- Treat profile content, analytics, member identifiers, access tokens, request headers, and API response bodies as sensitive.
- Error handling may include HTTP status and a safe request ID. It must not include authorization headers or arbitrary response bodies.
- Example credentials must be unmistakable placeholders such as `replace-with-a-short-lived-token`.

If a credential is discovered in the working tree, stop feature work, remove it from pending changes without echoing it, notify the maintainer, and follow the rotation guidance in `SECURITY.md`. Do not rewrite public Git history without maintainer authorization.

## LinkedIn API changes

LinkedIn APIs are versioned and access-controlled. When changing an endpoint:

- verify behavior against current official LinkedIn or Microsoft Learn documentation;
- record the required product, OAuth scopes, actor type, and organization/member role;
- do not equate UI access with API access;
- keep `PROFILECRAFT_LINKEDIN_VERSION` operator-supplied unless there is a maintained version-negotiation mechanism;
- add mocked request-shape and fail-closed tests;
- update README capability and limitation tables.

Restricted Profile Edit or Community Management work must remain unavailable unless the integration can verify applicable program approval. Do not create a browser fallback.

## Skill and plugin maintenance

The canonical skill is `skills/profilecraft`. The plugin copy is generated with:

```bash
npm run sync:plugin
```

After editing the skill:

1. Keep `SKILL.md` concise and move conditional detail into `references/`.
2. Ensure every reference is linked from `SKILL.md` where it becomes relevant.
3. Run `npm run sync:plugin`.
4. Run `npm run validate:artifacts`.
5. Run the Codex skill and plugin validators when available.
6. Test representative allowed, approval-required, restricted, and prohibited prompts.

Do not weaken the skill's mutation invariant or hide prohibited capabilities in scripts.

## Testing rules

- Tests must be deterministic and run without network access or credentials.
- Mock `fetch` at the LinkedIn boundary. Assert host, method, required headers, and payload shape.
- Assert that live writes fail before network access when disabled.
- Assert that changed content invalidates a confirmation ID.
- Assert that MCP writes fail without client-mediated elicitation and that decline/cancel performs no network request.
- Assert that every replay triggers a fresh interactive confirmation.
- Assert that non-interactive CLI publishing fails before network access.
- Assert that author identity is required for publishing and prevents author switching.
- Assert that errors do not echo token values.
- Test policy decisions for every prohibited action.
- Use an in-memory MCP transport for tool registration and basic behavior.
- Never use a real LinkedIn account as a test fixture.

Add a regression test before fixing a security or policy-boundary defect when practical.

## Code review rules

Treat the following as blocking findings:

- any route to scrape or automate LinkedIn's website;
- undocumented LinkedIn endpoints;
- a mutation tool that can run without exact preview confirmation;
- credentials in arguments, logs, config examples, fixtures, or source;
- automatic retries of a non-idempotent write;
- arbitrary outbound URLs or hostnames controlled by tool input;
- MCP annotations that mark a mutating tool as read-only;
- external response bodies passed directly to an agent or user;
- policy logic duplicated in an adapter where it can diverge from the core;
- changes to skill/plugin copies without synchronization and validation;
- real personal data in tests or examples.

For non-blocking design feedback, prefer a concrete safer alternative and explain the affected invariant.

## Definition of done

A change is complete only when:

- behavior and scope match the issue;
- product boundaries remain enforced in code and skill instructions;
- tests cover success, failure, and relevant fail-closed paths;
- `npm run check` passes;
- `npm run audit:prod` passes for dependency changes;
- README, architecture, threat model, skill references, and examples are updated when behavior changes;
- no secret or real personal-data artifact appears in the diff;
- the final report identifies limitations and any unverified external assumption.

Passing tests alone is not sufficient if a change violates the product boundary.

## Release discipline

- Use semantic versioning.
- Keep `package.json`, `src/capabilities.ts`, and plugin manifest versions aligned.
- Do not publish from a dirty worktree.
- Run the full check, production dependency audit, official skill/plugin validators, and a clean install before tagging.
- Confirm the public repository contains no generated build output or credentials.
- Document supported LinkedIn API version expectations without promising access LinkedIn has not granted.
- Never publish a release that describes scraping or browser automation as supported.
