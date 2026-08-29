# Architecture

## Goals

This package is a small WeChat Official Account transport layer for n8n. Business policy such as scheduling, approval, content generation, account selection, and AI-agent permissions belongs in workflows, not in this node.

## Layers

- `credentials/`: App ID/App Secret credential and n8n-managed expirable Stable Access Token.
- `nodes/WechatOfficialAccount/WechatOfficialAccountPlatform.node.ts`: registered n8n node identity and UI metadata.
- `nodes/WechatOfficialAccount/WechatOfficialAccount.node.ts`: shared operation implementation used by the registered platform node.
- `nodes/WechatOfficialAccount/payloads.ts`: article payload mapping.
- `nodes/WechatOfficialAccount/transport/TokenManager.ts`: recovery token cache for explicit WeChat token rejection.
- `nodes/WechatOfficialAccount/transport/WechatClient.ts`: fixed-host HTTP transport, bounded token recovery, read retries, and multipart uploads.
- `nodes/WechatOfficialAccount/transport/WechatError.ts`: error classification and sanitized diagnostics.

## Authentication

There is one normal token lifecycle:

1. The credential uses n8n's expirable hidden credential field and `preAuthentication` to obtain a Stable Access Token from `/cgi-bin/stable_token`.
2. Normal node calls use that n8n-managed token directly. The node does not make a second token request on startup or on every execution.
3. WeChat can report an invalid/expired token as HTTP 200 JSON. If a known token error is returned, the node performs one stable-token recovery and retries the explicitly rejected API call once.
4. A recovered token is kept only in process memory for its reported lifetime minus a five-minute margin. Forced rotations are kept at least 30 seconds apart in-process.
5. Tokens, App Secrets, article bodies, and binary media are never written to workflow JSON or logs.

The credential uses n8n's `restrictToSupportedNodes` mechanism and is restricted to the package node short name `wechatOfficialAccountPlatform`. The short name is intentionally unique across community packages because n8n stores `installed_nodes.name` as a global primary key. It is not exposed as a generic HTTP Request credential.

## API surface

V1 exposes only first-class operations for Media, Draft, and Publish. There is no generic Raw API fallback. A new WeChat endpoint is added only when there is a real recurring use case and it can be modeled, validated, documented, and tested explicitly.

## Retry policy

Unknown network outcomes and explicit API rejections are treated differently.

- Explicit token rejection: one token recovery and one retry because WeChat rejected the original request.
- Read/idempotent transport failure: retry only transient network failures, HTTP 429, and HTTP 5xx, with bounded short backoff.
- Configuration/client HTTP errors: no automatic retry.
- Write transport failure: no automatic replay because the server may already have committed the write.

## Item model

The node processes every input item independently and returns one linked output item per input item. Existing input JSON is retained and the WeChat response is nested under `wechat`. `pairedItem` preserves n8n item lineage.

## Compatibility

The repository follows the current official n8n community-node starter conventions and `@n8n/node-cli`. Production deployments pin exact package versions and re-run the repository gates before materially upgrading n8n.
