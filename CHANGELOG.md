# Changelog

All notable changes to this project will be documented here.

## [0.1.1] - 2026-08-29

### Fixed
- Changed the internal n8n node short name to `wechatOfficialAccountPlatform` so this package can be installed side by side with older community WeChat packages. n8n stores community-node names as a global primary key, so reusing `wechatOfficialAccount` caused an installation constraint error.

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
