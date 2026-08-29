# LinkedIn operation policy

Read this reference before any operation that reads from or writes to LinkedIn itself.

## Decision matrix

| Request | Decision | Conditions |
| --- | --- | --- |
| Analyze user-provided profile JSON, résumé, PDF, or export | Allowed | Keep source attribution and avoid inventing facts. |
| Draft profile sections, posts, or visual briefs | Allowed | Draft only; the user must verify claims. |
| Read the authenticated member's OIDC userinfo | Allowed | Official API, member consent, least scopes. |
| Publish a member post | Approval required | Official Posts API, `w_member_social`, exact preview confirmation, live-write environment opt-in. |
| Edit a personal profile | Restricted API | Official Profile Edit API and explicit LinkedIn program approval; otherwise provide manual instructions. |
| Manage an organization page | Restricted API | Official Community Management access, required OAuth scopes, appropriate organization role, exact confirmation. |
| Scrape profiles, search results, feeds, jobs, or connections | Prohibited | Do not offer a browser, extension, DOM, cookie, or proxy workaround. |
| Automate LinkedIn website navigation or form submission | Prohibited | Do not simulate human interaction or attempt anti-detection behavior. |
| Automate connections, messages, comments, reactions, or follows | Prohibited | Drafting may be allowed; automated execution is not. |
| Collect passwords, cookies, session tokens, or secrets in chat | Prohibited | Credentials belong in the user's secure environment or secret manager. |

## Data rules

- Minimize collection. Accept only fields needed for the current user request.
- Treat profile documents and analytics as personal data.
- Do not persist another member's profile data.
- Do not place profile data, API payloads, access tokens, or request headers in source control.
- Do not log authorization headers or include response bodies in authentication errors.
- Prefer a user-provided LinkedIn data export or résumé over copying content from a page.

## Refusal shape

When a request is prohibited, state the specific boundary briefly and offer the nearest compliant alternative. For example: request a user-provided export, draft the desired message without sending it, or prepare copy-ready profile edits for manual application.

## Restricted APIs

A visible UI control or administrator role does not prove API access. Verify the application's approved LinkedIn product, OAuth scopes, authenticated actor, and target-resource role separately. If any requirement is unknown, remain in draft or preview mode.
