# Repository Maintenance Rules

This is a public, low-maintenance infrastructure repository.

## Security

- Never commit real App IDs, App Secrets, access tokens, credential IDs, workflow IDs, private hostnames, internal URLs, customer data, article drafts, or operational logs.
- Never log credentials, access tokens, article bodies, or binary payloads.
- Keep WeChat API traffic on the fixed official API host.
- Do not add telemetry without an explicit public design decision.

## Scope

- Keep V1 focused on Media, Draft, and Publish.
- Business scheduling, approval, retries, alerting, and AI-agent permissions belong in workflows.
- Do not add generic Raw API access, speculative endpoints, compatibility layers, or hidden fallback behavior.
- Add a new operation only for a recurring real workflow need.

## Architecture

- Keep one registered node class.
- Keep credentials limited to App ID and App Secret.
- Obtain Stable Access Token in normal mode (`force_refresh: false`) once per node execution and reuse it only within that node execution.
- Do not add process-global token caches, forced-refresh recovery, cooldown state, or automatic request retries without a demonstrated production requirement.
- Preserve `pairedItem` for every input.
- Never automatically replay an unknown write result.

## Change Triggers

After `1.0.0`, change this repository only for:

1. a reproducible production bug;
2. a breaking n8n or WeChat API change;
3. a recurring real workflow need.

## Release Gate

Before release run:

```bash
npm ci
npm test
npm run lint
npm run build
npm pack --dry-run
```

All gates must pass with no lint errors or warnings. Production installs use exact package versions. Breaking parameter or behavior changes require n8n node versioning rather than silently changing existing workflows.
