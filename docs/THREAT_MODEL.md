# Threat model

## Scope

This model covers the local CLI, stdio MCP server, portable skill, Codex plugin configuration, and official LinkedIn API requests. It does not claim to secure the user's agent host, operating system, LinkedIn account, or third-party secret manager.

## Assets

- LinkedIn OAuth access tokens and application secrets
- authenticated member identity
- user-provided profile and résumé content
- unpublished post content
- authority to create an external post
- organization or page authority in future restricted integrations
- audit and request identifiers

## Trust boundaries

1. User or agent input enters the CLI/MCP schema boundary.
2. Agent instructions are untrusted relative to server-side enforcement.
3. Credentials cross from the operator's environment into the LinkedIn HTTP boundary.
4. Post content crosses from local process to LinkedIn only after confirmation checks.
5. LinkedIn responses are external and potentially sensitive.
6. Plugin and MCP configuration controls which environment variables reach the child process.

## Threats and mitigations

### Prompt-driven scraping or prohibited automation

An agent may be asked to scrape, click, send messages, or manufacture engagement.

Mitigations: the portable skill refuses these categories; the policy engine classifies them as prohibited; no browser or arbitrary-request tool exists; official API hosts are fixed.

Residual risk: a separately installed browser or shell tool could act outside ProfileCraft. Host-level tool allowlists remain the operator's responsibility.

### Accidental publishing

An agent may call a write tool before the user reviews the final post.

Mitigations: preparation is read-only; confirmation IDs bind author, visibility, and text; any change invalidates approval; live writes require a separate environment switch; MCP requires client-mediated user elicitation immediately before each request and fails closed when unsupported; CLI publishing requires an attached terminal and exact typed confirmation; MCP marks the publish tool as destructive; publishing does not retry automatically.

Residual risk: ProfileCraft trusts the MCP client to present elicitation to a human accurately. A malicious client could falsely report acceptance, and a sufficiently privileged local agent could emulate a terminal. Operators must use a trusted MCP host, tool approvals, and OS isolation.

### Author substitution

An agent may try to publish as a different member.

Mitigations: the preview binds the author ID; confirmation changes on author change; `PROFILECRAFT_LINKEDIN_PERSON_ID` is mandatory for publishing and rejects missing or mismatched identities.

### Credential disclosure

Secrets may enter prompts, arguments, source files, logs, or error bodies.

Mitigations: no token CLI flag; configuration forwards environment names; capability reports expose booleans only; API failures omit response bodies and authorization headers; `.gitignore` and repository scans cover common patterns; examples use placeholders.

Residual risk: environment variables remain visible to sufficiently privileged local processes. Production operators should use OS isolation and a dedicated secret manager.

### Arbitrary outbound requests and SSRF

Tool input may attempt to choose an attacker-controlled URL.

Mitigations: production endpoints are literal official LinkedIn URLs. No tool accepts a host, URL, redirect, or proxy setting.

### Data overcollection

A profile export may contain unrelated personal data.

Mitigations: profile input uses a strict allowlisted schema and rejects unknown keys; the core does not persist profile documents; documentation recommends minimal user-owned inputs.

Residual risk: agents or hosts may retain transcripts independently of ProfileCraft.

### API-version or scope confusion

A successful sign-in may be mistaken for permission to edit profiles or organizations.

Mitigations: capabilities distinguish implemented operations; policy marks personal edits and organization management as restricted; the operator supplies a current API version; skill instructions require separate approval/scope/role checks.

### Dependency or plugin supply-chain compromise

Dependencies or plugin metadata could introduce code execution.

Mitigations: versions are pinned; lockfile is committed; production dependency audit and CodeQL run in CI; the MCP server uses a local built artifact; plugin environment forwarding is allowlisted.

Residual risk: npm and GitHub distribution remain external trust dependencies. Releases should use protected branches, reviewed dependency updates, and provenance where available.

## Security invariants

- No LinkedIn HTTP request originates outside `src/linkedin.ts`.
- No mutation occurs when `PROFILECRAFT_ENABLE_WRITES` is not exactly `1`.
- A changed author, visibility, or post body invalidates confirmation.
- Every MCP mutation requires a fresh accepted client elicitation; replay triggers another prompt.
- External response bodies do not become user-facing error text.
- Tests never contact LinkedIn or contain live credentials.
- Scraping and browser automation remain unsupported at every adapter.

Changes that invalidate an invariant require an explicit threat-model revision and maintainer security review.
