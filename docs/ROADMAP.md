# Roadmap

## Release criteria

Each increment must preserve the external-write protocol in `AGENTS.md`, include offline tests, update the threat model, and use only documented official APIs or user-owned inputs.

## 0.1 — Qualified local MVP

- [x] Deterministic structured-profile audit
- [x] Policy decision engine
- [x] Content-bound post previews
- [x] Approval-gated member text-post publishing
- [x] OIDC userinfo read
- [x] CLI and stdio MCP server
- [x] Portable skill and Codex plugin
- [x] Tests, CI, CodeQL, secret checks, and documentation

## 0.2 — Authentication and import ergonomics

- [ ] Local OAuth authorization-code callback with state validation
- [ ] Secure token storage adapters for major operating systems
- [ ] Token expiry and scope inspection without exposing values
- [ ] Importer for a user-provided LinkedIn data export
- [ ] Résumé/profile normalization with explicit field mapping

## 0.3 — Rich publishing

- [ ] Image upload and post preview
- [ ] Document post workflow
- [ ] Accessibility metadata and media validation
- [ ] Post lifecycle receipt and safe status checks

## 0.4 — Approved organization workflows

- [ ] Organization role and scope discovery
- [ ] Page-content reads and analytics
- [ ] Exact-diff organization mutations
- [ ] Organization post workflow with restricted access checks

## Future restricted work

Personal Profile Edit endpoints may be added only when maintainers can test with a LinkedIn-approved application and document the governing program, scopes, supported fields, and storage restrictions. Manual copy-ready edit plans remain the fallback.

## Explicitly out of scope

- LinkedIn page scraping or crawling
- Browser or extension automation
- Cookie/session reuse or CAPTCHA handling
- Automated connections or contact downloads
- Automated messages or InMail
- Automated comments, reactions, follows, or engagement farming
- Undocumented APIs or access-control circumvention
