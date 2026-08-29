# Repository Maintenance Rules

This is a public repository.

## Security

- Never commit real App IDs, App Secrets, access tokens, credential IDs, workflow IDs, private hostnames, internal URLs, customer data, article drafts, or operational logs.
- Never log credentials, access tokens, article bodies, or binary payloads.
- Keep WeChat API traffic on the fixed official API host unless a future change is explicitly reviewed.
- Do not add telemetry without an explicit public design decision.

## Architecture

- Keep n8n UI/operation definitions separate from transport/authentication code.
- Prefer current `@n8n/node-cli` and official community-node patterns.
- Avoid dynamic module loaders and unnecessary runtime dependencies.
- Keep V1 focused on first-class media, draft, and publish operations. Do not add a generic Raw API fallback.
- Business scheduling, approval, and AI-agent permissions belong in workflows.

## Reliability

- Preserve `pairedItem` for every input.
- Do not replay non-idempotent writes after an unknown transport result.
- A known token rejection may force-refresh Stable Access Token and retry exactly once.
- Add tests for bug fixes and API behavior changes.

## Release

Before release run:

```bash
npm ci
npm test
npm run lint
npm run build
npm pack --dry-run
```

Use exact production versions and maintain rollback notes. Breaking parameter/behavior changes require n8n node versioning rather than silently changing existing workflows.
