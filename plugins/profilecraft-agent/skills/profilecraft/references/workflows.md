# ProfileCraft workflows

## Audit and improve a profile

1. Ask for structured profile data, a résumé, a profile PDF, or a user-owned export. Do not retrieve the profile by scraping.
2. Normalize the source into the `profilecraft_audit_profile` schema.
3. Include `targetRole` and truthful search terms when the user provides them.
4. Run the audit and prioritize failed findings by section and available points.
5. Draft improvements from supplied facts. Label every unverified metric, date, credential, or outcome.
6. Return an edit plan. Do not claim the LinkedIn profile was updated unless an approved official edit tool returns success.

## Prepare and publish a post

1. Draft the post from user-provided facts and voice constraints.
2. Call `profilecraft_prepare_post` with the final text, authenticated member ID, and visibility.
3. Show the returned author, visibility, exact text, warnings, and confirmation ID.
4. Ask for explicit permission to publish this exact preview. Generic standing approval is insufficient when the text changed.
5. After confirmation, call `profilecraft_publish_post` with unchanged content and the returned confirmation ID. The MCP client must present a separate interactive confirmation form; the tool fails closed when elicitation is unsupported, declined, or cancelled.
6. If the tool reports `WRITES_DISABLED`, explain that the user must set `PROFILECRAFT_ENABLE_WRITES=1` in the MCP process environment. Never ask them to paste a token into chat.
7. If the API fails, report the sanitized status and request ID. Do not retry automatically.

## Prepare manual profile edits

When approved Profile Edit API access is unavailable:

1. Produce a section-by-section current/proposed diff.
2. Keep each replacement within the product's documented field limits when known.
3. Separate copy changes from visual-asset recommendations.
4. Provide a short verification checklist for names, dates, employers, credentials, and metrics.
5. Tell the user to apply the edits through LinkedIn's own interface; do not automate the interface.

## Organization-page changes

Before proposing a live call, verify all of the following:

- The application has Community Management API access.
- The OAuth token has the required organization scope.
- The authenticated member has the required role on the target organization.
- The requested field or action is supported by the official endpoint and current API version.
- The user confirmed the exact target and diff.
