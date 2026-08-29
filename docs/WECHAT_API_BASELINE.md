# WeChat Official Account API baseline

Last reviewed: 2026-08-29

This document records the public WeChat Official Account API assumptions used by this package. The WeChat developer site remains the source of truth; when an endpoint or limit changes, update this document, implementation, and tests together.

## Authentication

Stable access token:

- `POST https://api.weixin.qq.com/cgi-bin/stable_token`
- request fields: `grant_type=client_credential`, `appid`, `secret`, optional `force_refresh`
- normal token lifetime is reported by `expires_in` (commonly 7200 seconds)
- the node requests the current stable token with `force_refresh: false` on the first WeChat call of each node execution and reuses it only within that execution
- the package does not persist token state, force-refresh tokens, or implement token-error recovery

Official documentation:

- https://developers.weixin.qq.com/doc/subscription/api/base/api_getstableaccesstoken.html

## Drafts

First-class endpoints:

- `POST /cgi-bin/draft/add`
- `POST /cgi-bin/draft/get`
- `POST /cgi-bin/draft/batchget`
- `POST /cgi-bin/draft/update`
- `POST /cgi-bin/draft/delete`

For ordinary rich-text articles the package explicitly sends `article_type: "news"`. The normal article model supports title, author, digest, HTML content, source URL, permanent cover media ID, cover display, and comment switches. Multiple articles are supported in one draft.

The current API also supports `article_type: "newspic"`. V1 deliberately does not expose it because its `image_info` structure is materially different. It will be added only as a first-class operation/form when a real workflow needs it.

Official documentation:

- https://developers.weixin.qq.com/doc/subscription/api/draftbox/draftmanage/api_draft_add.html

## Publishing

Account eligibility is not the same as draft eligibility. Since the 2025 permission tightening, personal-subject accounts and unverified/non-verifiable enterprise accounts should not assume `freepublish/*` access even when `draft/*` works. Treat `48001` as a capability/permission signal and verify the target account's interface permissions in the WeChat backend. Draft-only workflows are intentionally supported without requiring Publish capability.

First-class endpoints:

- `POST /cgi-bin/freepublish/submit`
- `POST /cgi-bin/freepublish/get`
- `POST /cgi-bin/freepublish/getarticle`
- `POST /cgi-bin/freepublish/batchget`
- `POST /cgi-bin/freepublish/delete`

Official documentation:

- https://developers.weixin.qq.com/doc/subscription/api/public/api_freepublish_submit.html
- https://developers.weixin.qq.com/doc/subscription/api/public/api_freepublish_get.html

## Images and permanent material

Article-body image:

- `POST /cgi-bin/media/uploadimg`
- multipart field: `media`
- package-side validation: JPG/PNG, less than 1 MiB
- returned URL should be used inside article HTML instead of arbitrary external image URLs

Permanent image material:

- `POST /cgi-bin/material/add_material?type=image`
- multipart field: `media`
- package-side validation: BMP/GIF/JPG/PNG, up to 10 MiB
- returned `media_id` can be used as a normal news article cover

Official documentation:

- https://developers.weixin.qq.com/doc/subscription/api/material/permanent/api_uploadimage
- https://developers.weixin.qq.com/doc/service/api/material/permanent/api_addmaterial

## Error and retry rules

WeChat often returns business/authentication failures as HTTP 200 JSON responses. The transport therefore inspects `errcode` instead of relying only on HTTP status codes.

Common operational diagnostics are surfaced with targeted hints:

- `40164`: production egress IP is not in the API whitelist.
- `45009`: API quota exceeded.
- `45011`: calls are too frequent; reduce concurrency/back off.
- `48001`: the target account is not authorized for that API; check account type, verification status, and interface permissions.

Token-related errors such as `40001`, `40014`, `42001`, and `42007` are surfaced directly. The node does not force-refresh or replay the original operation. Network failures are also surfaced directly, including for read operations; retry policy belongs in the n8n workflow where it remains explicit. Unknown network failures on non-idempotent writes are never blindly replayed.

## Review policy

Before each minor release:

1. Recheck the official stable-token, draft, publishing, and material pages.
2. Review WeChat API error-code and account-permission changes relevant to access tokens, draft, material, and `freepublish/*`.
3. Re-run unit tests, lint, build, and `npm pack --dry-run`.
4. Update this document's review date only when the API assumptions were actually checked.
