# Security policy

## Supported versions

Until the first stable release, security fixes target the latest `main` branch and most recent tagged version.

## Report a vulnerability

Please use GitHub's private vulnerability reporting or Security Advisories feature for this repository. Do not include access tokens, cookies, passwords, real profile exports, or other secrets in a public issue.

Useful reports include:

- affected version or commit;
- impact and preconditions;
- a minimal reproduction using synthetic data;
- whether an external write occurred;
- suggested mitigation, if known.

## Credential exposure

If a real credential is committed or printed:

1. Revoke or rotate it at the issuer immediately.
2. Disable live writes in affected environments.
3. Preserve only non-secret evidence needed for investigation.
4. Remove the value from pending changes and logs without reposting it.
5. Coordinate any public-history rewrite with the repository maintainer.

Deleting a token from the latest commit does not revoke it or remove it from Git history.

## Security design

ProfileCraft uses environment-only credentials, fixed official API hosts, strict schemas, timeouts, content-bound confirmation IDs, a process-level write gate, sanitized errors, no automatic mutation retries, repository secret checks, dependency auditing, and CodeQL. The full model is documented in [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).
