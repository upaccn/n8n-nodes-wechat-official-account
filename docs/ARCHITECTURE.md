# Architecture

## Goal

This package is a small WeChat Official Account adapter for n8n. Scheduling, approval, content generation, account selection, and AI-agent permissions belong in workflows, not in this node.

## Layers

- `credentials/`: App ID and App Secret only.
- `nodes/WechatOfficialAccount/WechatOfficialAccountPlatform.node.ts`: the single registered n8n node and all V1 operations.
- `nodes/WechatOfficialAccount/payloads.ts`: article payload normalization.
- `nodes/WechatOfficialAccount/transport/WechatClient.ts`: fixed-host WeChat HTTP transport and multipart upload.
- `nodes/WechatOfficialAccount/transport/WechatError.ts`: sanitized API diagnostics.

## Authentication

Authentication deliberately has no persistent token state in the node package.

1. The credential stores only App ID and App Secret.
2. On the first WeChat call of a node execution, `WechatClient` requests `/cgi-bin/stable_token` with `force_refresh: false`.
3. The returned token is reused only by that `WechatClient` instance for the rest of the node execution.
4. A later node execution asks WeChat for the current stable token again. Normal stable-token mode returns the existing valid token rather than rotating it.
5. There is no process-global token cache, TTL bookkeeping, forced refresh, cooldown, or token-error recovery path.
6. App Secrets, tokens, article bodies, and binary media are never written to workflow output or logs.

The credential is restricted to the package node short name `wechatOfficialAccountPlatform` and is not exposed as a generic HTTP Request credential.

## API surface

V1 exposes only first-class operations for Media, Draft, and Publish. There is no generic Raw API fallback. A new WeChat endpoint is added only after a recurring real workflow need appears.

## Request policy

The node sends each request once.

- No automatic transport retry.
- No automatic token-error replay.
- No replay of writes after an unknown network outcome.
- WeChat API errors are returned with their `errcode`/`errmsg` and a small set of useful hints.

Retry, wait, alerting, and business recovery policies belong in the n8n workflow where they remain visible and auditable.

## Item model

The node processes every input item independently and returns one linked output item per input item. Existing input JSON is retained, the WeChat response is nested under `wechat`, and `pairedItem` preserves n8n item lineage.

## Compatibility

The persisted node short name remains `wechatOfficialAccountPlatform`, so the simplification does not change existing workflow identity. The repository follows the current official n8n community-node toolchain. Production deployments pin an exact package version.

## Maintenance mode

After `1.0.0`, this repository is intentionally low-maintenance. Changes are justified only by one of three triggers:

1. a reproducible production bug;
2. a breaking change in n8n or the WeChat API;
3. a recurring real workflow need that cannot be cleanly handled outside the node.

No speculative features, compatibility layers, caches, telemetry, schedulers, or automatic recovery systems are added without a concrete production requirement.
