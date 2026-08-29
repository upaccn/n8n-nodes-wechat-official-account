# Changelog

All notable changes to this project will be documented here.

## [1.0.0] - 2026-08-29

### Changed
- Froze the V1 feature surface around Media, Draft, and Publish.
- Simplified Stable Access Token handling: each node execution obtains the current stable token once with `force_refresh: false` and reuses it only inside that node execution.
- Removed process-global token cache, TTL bookkeeping, forced-refresh recovery, cooldown state, and automatic request retries.
- Collapsed the temporary node wrapper into one registered node implementation while preserving the persisted node short name `wechatOfficialAccountPlatform`.
- Restored the user-facing display name to `WeChat Official Account` after the legacy community node was removed; the internal short name remains unchanged to avoid a pointless workflow migration.
- Removed incremental TypeScript build metadata from the published package.

### Maintenance
- Entered low-maintenance mode. Future changes require a reproducible production bug, an upstream breaking change, or a recurring real workflow need.

## [0.1.2] - 2026-08-29

### Fixed
- Changed the registered node display name to `WeChat Official Account Platform`. n8n persists community-node `description.displayName` as the global primary key in `installed_nodes.name`, so sharing the legacy package display name `WeChat Official Account` prevented side-by-side installation even after the internal short name was made unique.
- Added a regression test that locks both the unique short name and unique display name used by n8n community-package persistence.

## [0.1.1] - 2026-08-29

### Fixed
- Changed the internal n8n node short name to `wechatOfficialAccountPlatform`. This removed the legacy short-name overlap, but side-by-side installation still required the display-name fix delivered in `0.1.2` because n8n persists `description.displayName` as the `installed_nodes.name` primary key.

## [0.1.0] - 2026-08-29

### Added
- WeChat Official Account credential using the Stable Access Token endpoint.
- n8n-managed Stable Access Token lifecycle with bounded WeChat token-error recovery and a 30-second forced-refresh cooldown.
- Binary-first article image and permanent image uploads with current format/size validation.
- Draft create/get/get-many/update/delete operations with explicit `article_type: news`, multi-article support, and comment switches.
- Publish submit/status/get/get-many/delete operations.
- Multi-item execution with n8n item linking.
- Bounded retry policy for safe reads and no replay for unknown write outcomes.
- Unit tests, CI, documentation, security and maintenance guidance.
- Versioned WeChat API baseline document for future rule reviews.
