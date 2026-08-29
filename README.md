# n8n-nodes-wechat-official-account

A production-oriented n8n community node for WeChat Official Accounts (微信公众号).

The project focuses on reliable content automation: image/media upload, draft management, and publishing. It is a clean implementation built for current n8n community-node tooling rather than a fork of older community packages.

## Status

`0.1.x` is the initial validation series. Test in a non-production workflow before replacing an existing WeChat integration.

## V1 features

### Media
- Upload Article Image (`/cgi-bin/media/uploadimg`)
- Upload Permanent Image (`/cgi-bin/material/add_material`)

Media input is n8n binary data. Downloading remote URLs is intentionally left to n8n's HTTP Request node.

### Draft
- Create
- Get
- Get Many
- Update
- Delete

Draft creation supports multiple ordinary rich-text articles and the common fields `title`, `author`, `digest`, `content`, `content_source_url`, `thumb_media_id`, `show_cover_pic`, `need_open_comment`, and `only_fans_can_comment`. The node explicitly sends `article_type: "news"`. The structurally different `newspic` mode is intentionally deferred until it earns a first-class implementation.

### Publish
- Submit
- Get Status
- Get
- Get Many
- Delete

Publish API availability depends on the target account's current WeChat interface permissions. Personal-subject, unverified, or otherwise non-verifiable accounts may still use draft/material APIs while `freepublish/*` returns `48001`. Check the account's interface permissions before designing unattended publishing.

Scheduling and approval are intentionally implemented at the workflow layer rather than hidden inside this node.

## Not included in V1

Trigger/Response nodes, webhook message handling, AES message encryption/decryption, menus, followers, tags, template messages, customer service, comments, analytics, and QR-code management are deliberately out of scope until real workflow demand justifies them.

## Credentials

Create a **WeChat Official Account API** credential with:

- App ID
- App Secret

WeChat server-side APIs also require the production egress IP to be allowed in the account's API IP whitelist. Error `40164` is surfaced with a targeted whitelist hint.

The App Secret is stored as a password credential. The node obtains access tokens through WeChat's stable-token endpoint and keeps a short-lived in-memory cache with a five-minute refresh margin. If WeChat explicitly returns a token error such as `40001`, `40014`, `42001`, or `42007`, the node recovers the stable token and retries the rejected API call once. Forced rotations are throttled to at least 30 seconds in-process; recovery requests inside that cooldown ask for the current stable token without forcing another rotation.

This node does **not** expose its credential as a generic HTTP Request credential. n8n owns the normal credential token lifecycle, while the node handles WeChat-specific token rejection in HTTP 200 JSON responses and performs one bounded stable-token recovery when needed.

## Retry safety

- Read/idempotent operations may retry transient transport failures with bounded backoff.
- Explicit WeChat token errors trigger one stable-token refresh and one retry because the API rejected the original operation.
- Non-idempotent writes are **not** replayed after an unknown network result. This prevents duplicate drafts, materials, or publish submissions.

## Output and item linking

Each successful output preserves the input JSON and places the WeChat response under `wechat`. `pairedItem` is set for every input item so downstream n8n expressions keep their lineage. With Continue On Fail enabled, failures return a sanitized `wechatError.message`.

## Installation

After the package is published to npm, install `n8n-nodes-wechat-official-account` through n8n Community Nodes or your managed community-package deployment process. Pin an exact package version in production.

## Compatibility

The initial `0.1.0` release is developed and validated with Node.js 24.18.0, `@n8n/node-cli` 0.45.5, and `n8n-workflow` 2.36.4. The package declares Node.js 22 or later and follows the current strict n8n community-node format. When upgrading n8n materially, re-run the package test/lint/build gates before production rollout.

## Development

Requires Node.js 22 or later.

```bash
npm ci
npm test
npm run lint
npm run build
```

The project uses the current `@n8n/node-cli` build and verification conventions.

## Migration from older WeChat nodes

Run old and new packages side by side during migration. Duplicate the workflow, replace only the WeChat adapter nodes, create a new credential, and compare results before activation. Keep the previous workflow/package version available for immediate rollback until the new workflow completes a representative production observation period.

## Security

- Credentials, access tokens, article bodies, and binary payloads must never be logged.
- API requests use the fixed `https://api.weixin.qq.com` host.
- No external telemetry is implemented.
- The node is intentionally not exposed directly as an AI tool. If an AI agent needs publishing capability, put a controlled n8n workflow in front of the node.

See [SECURITY.md](SECURITY.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and the [WeChat API baseline](docs/WECHAT_API_BASELINE.md).

## License

MIT
