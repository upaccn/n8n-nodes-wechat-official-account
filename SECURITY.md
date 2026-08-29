# Security Policy

## Reporting

Please report security issues privately to the repository maintainer rather than opening a public issue containing exploit details or credentials.

## Sensitive data

Never include real App Secrets, access tokens, workflow credentials, private workflow exports, customer data, article drafts, or production logs in an issue, pull request, test fixture, or commit.

## Design guarantees

- App Secret is a password credential.
- Access tokens are not returned in node output or intentionally logged.
- n8n manages the normal expirable access token; any recovery token is process-memory only and expires before the WeChat TTL.
- The node exposes only modeled Media, Draft, and Publish operations; there is no generic arbitrary-endpoint fallback.
- Non-idempotent writes are not automatically replayed after unknown transport failures.
- No external telemetry is included.

## Supported versions

Security fixes are applied to the latest supported release line. Production users should pin an exact package version and upgrade after validation.
