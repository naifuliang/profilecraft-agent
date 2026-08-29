# Contributing

Thank you for helping improve ProfileCraft Agent. Contributions are welcome when they preserve the API-first, user-consent-driven product boundary.

## Before opening a change

Read [`AGENTS.md`](AGENTS.md), especially the non-negotiable boundaries and external-write protocol. Issues or pull requests for LinkedIn scraping, website automation, cookie reuse, automated outreach, or engagement bots will not be accepted.

For a substantial feature, open an issue describing:

- the user problem;
- the official API or user-owned input involved;
- required OAuth scopes and partner-program access;
- data handled and retained;
- external effects and confirmation design;
- tests that prove fail-closed behavior.

## Local setup

```bash
git clone https://github.com/naifuliang/profilecraft-agent.git
cd profilecraft-agent
npm ci
npm run check
```

Tests must run without LinkedIn credentials or network access.

## Pull request checklist

- [ ] The change uses user-provided data or documented official APIs only.
- [ ] Mutations have exact previews, explicit confirmation, and a process-level write gate.
- [ ] New external input has a strict schema.
- [ ] External requests have timeouts and safe errors.
- [ ] Tests cover failure and fail-closed behavior.
- [ ] `npm run check` passes.
- [ ] `npm run audit:prod` passes if dependencies changed.
- [ ] Documentation and the portable skill are synchronized where needed.
- [ ] The diff contains no credentials, real profile exports, or personal data.

## Commit and review style

Keep commits focused and describe the behavior change, not just file edits. Reviewers will treat product-boundary regressions, secret handling, arbitrary outbound requests, and confirmation bypasses as blocking.

## Reporting security issues

Do not open a public issue for a vulnerability or exposed credential. Follow [`SECURITY.md`](SECURITY.md).
