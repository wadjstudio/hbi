# HBI Codex Rules

Build on the foundation; never substitute demo numbers for real observations.

- Keep the modular monolith and documented stack. No microservices, Prisma/Drizzle, Redis/Kafka or mandatory AI.
- Ordinary CRUD uses Supabase Data API and RLS. Secret operations use server routes; no service-role bypass for user data.
- Preserve migrations 0001–0010. Extend with forward migrations; test clean setup and upgrade fixtures. Never rewrite deployed history or silently discard legacy data.
- Every persistent relation must enforce organization and applicable match/session/document consistency. Keep organization and parent identities immutable.
- Separate select/insert/update/delete policies and explicit grants. Viewer is read-only; analyst cannot delete matches. Test allow AND deny paths.
- Use generated PostgreSQL types and Zod boundary contracts. Keep business identities out of unchecked JSON.
- One canonical shot, one outcome. Review unresolved legacy shots; use the primary session for aggregate metrics. GK denominators exclude empty goals/misses/blocks. Display unknown for missing samples.
- Separate video time, match clock and animation time. Normalized coordinates only. On-court intervals are half-open; substitutions are atomic.
- Local video never uploads implicitly. Clips remain timestamp references. Do not proxy video through Workers or transcode in the cloud.
- Save drafts/outbox atomically, scope by user+organization, preserve conflicts, honor expected revisions and idempotency. Never silently overwrite a concurrent edit.
- Arabic default, English toggle, RTL/LTR. Follow the dark coaching workspace reference; metrics and charts must open real evidence.
- Report drafts retain the revision at the start of editing. Load saved notes asynchronously, preserve other content, and export primary-session observations with separate video/period clocks and spreadsheet-safe CSV cells.
- Run types, lint, meaningful unit/local-storage tests, database tests, browser checks and both builds. Record actual limitations in VALIDATION.md; do not label skipped checks as passed.
- Keep archive clean: no secrets, node_modules, caches or build output. Blueprint copies and checksum must match.
- Keep authoritative DNS at Spaceship for this deployment. Use `build:pages`/`preview:pages`; do not publish the optional Worker Custom Domain route or reset hosted Supabase. Pages access and live DNS changes are separate consequential steps.

Implementation and verification must be assessed separately. Read VALIDATION.md and ZERO_COST_LIMITS.md; preserve migrations 0001–0010 and the generated database contracts. Use features/workspace for queries/sync and components/workspace for UI composition.
