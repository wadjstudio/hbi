# CHANGELOG

## GitHub publication preparation — 2026-10-05

- Prepared the source tree for the user-selected repository `https://github.com/wadjstudio/hbi`. Publication and Supabase repository integration are pending account authorization; no automatic hosted deployment is enabled in CI.
- Expanded Git exclusions for environment files, local registry configuration, caches and build output. The example environment file remains available without credentials.
- Limited the CI workflow token to read-only repository contents. The workflow validates the application and migrations locally without applying them to the hosted Supabase project.

## Hosted setup preparation — 2026-10-05

- Identified the user's new free Supabase project in the second Chrome profile and configured its public URL/publishable key in excluded local environment configuration. Never accessed its secret key.
- Prepared and locally verified an atomic fresh-install SQL bundle with all 16 original migration texts and their official migration history entries: 42 public tables, exact history parity, and safe refusal on a non-empty database. Hosted execution remains pending explicit approval after automatic review rejected Run; no migrations were applied to the hosted project.
- Rebuilt Cloudflare output successfully with real public Supabase build values. Runtime deployment variables, Auth setup and hosted integration still require completion.
- Tested an external-DNS Pages alternative without publishing: module-directory compilation failed on an SSR reference; a single-module bundle compiled but the local login request timed out. Pages is not yet a validated deployment target. Existing Wadj site, DNS and mail remain unchanged.

## Domain preparation — 2026-10-04

- Prepared the exact Worker Custom Domain route `hbi.wadj.online` and production application URL; AI remains disabled.
- Added DEPLOYMENT.md with DNS activation, preservation of existing website/mail records, hosted Supabase forward migrations, Auth URLs, build/runtime variables and live verification steps.
- Recorded public DNS currently returning Spaceship nameservers despite the intended Cloudflare setup. Supabase is not yet created; no DNS/account mutation or publishing took place.
- Confirmed the existing Wadj site through Chrome: Cloudflare Pages (`wadj-studio.pages.dev`), active HTTPS domain `www.wadj.online`, and external CNAME managed at Spaceship. Corrected the deployment guide to distinguish this working Pages setup from HBI's current Worker adapter; no nameserver migration is assumed or performed.

## 0.2.0 continuation — 2026-10-04

- Fixed report notes disappearing when records arrive after the page mounts; preserve extra report content when saving.
- Keep the report draft's original revision across refreshes, requiring explicit conflict resolution after another analyst edits it. Clear the draft after a local save so subsequent edits use the new revision.
- Fixed saved English being overwritten by the default Arabic during repeated initialization; persist language only after reading the saved choice.
- Hide report output when the selected report is unavailable in the current organization, and apply staff/viewer permissions to notes and saving.
- Expanded CSV with match/session/team IDs, video milliseconds, period-clock context and match position; preserve missing values and escape spreadsheet formulas.
- Added CSV roundtrip tests and a browser journey for primary-session/player filters, saved Arabic notes, CSV downloads and print-to-PDF output. See VALIDATION.md for executed results and the local Docker command restriction.
- Added an opt-in Webpack browser-test mode for filesystems where Turbopack development startup stalls; production bundler defaults remain unchanged.
- Verified all five browser journeys together, both production builds, strict types/lint, and Worker dry-run with per-command optional telemetry disabled. Local Supabase pgTAP was attempted but its database was unavailable; no hosted account was provisioned or deployed.

## 0.2.0 — 2026-10-03

### Foundation
- Preserved original migrations 0001–0010; added forward schema, integrity/permission, synchronization/analytics, ordered-operation and optional-sharing migrations.
- Hardened legacy child relations with explicit organization scope, composite FKs and immutable context. Split RLS operations and restricted match deletion.
- Added catalog-generated database types, browser/backup/drawing validation, meaningful metric/time/local-storage tests and PostgreSQL clean/upgrade verification.

### Handball domain
- Added expandable bilingual tactical taxonomy and ordered possession descriptors.
- Added canonical shot attempts and GK attribution/placement/rebound/fast-break details; ambiguous legacy events require review.
- Separated video time from period clock, added primary-analysis selection, roster/on-court positions and atomic substitutions.
- Added metric definitions, normalized tactical documents/frames/objects/animations, timed telestration, typed evidence links and ordered presentations.

### Application
- Replaced placeholder sports statistics with actual observations, samples and evidence links.
- Added bilingual management, video tagging/calibration/lineups, analytics/shot maps, tactical board, playlists/meetings, reports and settings workflows.
- Added durable account-scoped drafts/outbox, backups, revision conflicts and relinking. Added optional authorized direct R2 sharing and signed reads.
- Added browser PDF printing/CSV export and reference-inspired dark RTL/LTR workspace.

### Compatibility
- Legacy events and attack/defense enum columns remain. Unique primary-session repair is deterministic; all sessions remain stored.
- Canonical metrics exclude legacy ambiguity until analyst review. Existing incorrect cross-context rows must be repaired before constraints can apply; do not delete them silently.
- Cloud sharing requires explicit bucket/account setup. Full offline navigation and automatic video understanding are outside V1.
- See VALIDATION.md for tested results and unverified external-account behavior.

### Final workflow refinements
- Typed Supabase clients and generated RPC arguments/results/FK relationships; precise operation schemas.
- Match-position metric cards, GK denominators, defensive taxonomy attribution and invoker-only tactical analytics.
- Tactical-board autosave, editing snapshots and conflict-aware undo/redo; explicit annotation visibility intervals.
- Session-only local-source reuse across clips/meetings; clear source access when the user/organization changes.
- Record score context and non-shot outcomes; add roster-validated event participants with durable IDs and revision synchronization.
- Validate actor/shooter and possession-team consistency, and reject evidence joining incompatible analysis sessions.
- Validate every restored outbox row against the account/organization and domain contracts; prevent imported operation IDs from replacing another account's queue.
- Avoid full organization downloads after normal tagging/edits; merge server-returned rows and reconcile deletion/substitution side effects after the queue drains.
- Locked dependency installation, both deployment builds and fixture-based browser workflows in CI.
