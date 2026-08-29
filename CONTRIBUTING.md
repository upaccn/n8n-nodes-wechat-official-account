# Contributing

Contributions are welcome when they keep the package small, secure, and compatible with current n8n community-node conventions.

## Development

```bash
npm ci
npm test
npm run lint
npm run build
```

Add or update tests for behavior changes. Do not commit credentials, access tokens, workflow exports containing private data, production logs, or customer content.

## Scope

Add a new API endpoint only after it has a recurring real-world workflow use case. Model it as a first-class operation with validation, documentation, and tests; this package intentionally has no generic Raw API fallback.

Trigger/webhook features require a separate design review because callback signatures, replay protection, AES encryption, and response timing have a different security model from outbound API operations.

## Pull requests

Keep changes focused. Explain API behavior, retry/idempotency implications, and any compatibility impact. Breaking changes must use node versioning rather than silently changing existing workflows.
