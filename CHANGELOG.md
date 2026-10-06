# CHANGELOG

## Match workbench and verified broadcast — 2026-10-06

- Replaced the Overview entry with a match hub and introduced a compact icon navigation shell, match context, custom video transport, three-lane zoomable timeline, quick tagging dock and session intelligence beside video.
- Added a verified Al Ahly–Zamalek final reference (23 May 2025, 31–28), official ON Sport viewing embed and permission-checked retry-safe metadata importer. No invented roster, timestamp, shot locations or insights.
- Added shared canonical outcome filters and possession-deduplicated tactical evidence. A native evidence dialog reviews/edits moments, creates timestamp clips and appends them to meetings without repeated clip items.
- Shot outcomes now start unresolved; quick tagging is disabled while an existing event is edited. Fixed stale local-source display on workspace changes and preserved explicit playback error handling.
- Split workbench views into reusable components over the existing Supabase/Dexie/RLS provider. No new migration, ORM, service or mandatory paid dependency; previous schema and local drafts remain compatible.
- Added domain tests for filtering, tactical samples, timeline bounds and reference import authorization/idempotency; configurable isolated browser fixture ports and generated-output lint exclusions.
- Official embed requires internet and is for viewing. Native local video is still required for precise/offline tagging. The match has not been fully tagged; platform feature parity, automatic video analysis, real multi-user sessions and optional R2 remain separate acceptance work.

## Pages with external DNS — 2026-10-06

- Final-domain coach sign-in passed on `hbi.wadj.online`, loading the existing HBI organization without observed console errors. No live match data, optional video uploads or new paid resources were introduced for this verification.

- Custom domain activation completed: `hbi.wadj.online` is Active with SSL enabled. Final-hostname SSR/current client assets passed over HTTPS; earlier propagation/TLS pending notes are superseded.

- Saved only the independent `hbi` CNAME at Spaceship to the verified Pages hostname; retained existing Wadj records and nameservers. Public DNS resolves the correct target.

- Verified real coach sign-in on both the Pages origin and final custom domain, with password entry performed directly by the user and organization restoration after reload.

- Following explicit Pages permission approval, created a separate HBI Pages project and deployed the verified bundle. HTTPS SSR/current assets passed at `hbi-handball-intelligence.pages.dev`. CI passed on `d03aaa6`. Existing Wadj deployment was not modified.

- Added reproducible `build:pages` and `preview:pages` commands using installed Wrangler/esbuild dependencies: one server module, client assets, static-route exclusions and whitelisted public runtime configuration.
- Verified local Pages candidate: SSR/CSS/JavaScript HTTP 200; Chrome loaded the existing real HBI organization without console errors. Earlier Pages failures are superseded.
- Rewrote deployment instructions to retain Spaceship DNS. No nameserver change, duplicate organization, hosted fresh install or automatic deployment is required.
- Pages publishing used the explicitly approved additional `pages:write` permission and encrypted Windows credential storage.

The entries below record earlier preparation states; this section describes the current verified deployment.

## First hosted account and Worker configuration — 2026-10-06

- Confirmed hosted migration-history versions `0001`–`0016` and rejected anonymous reads on four core tables. Do not reapply the fresh-install SQL bundle on this project.
- Verified real first-account sign-in and organization creation through the application, with the owner grant explicitly approved and the workspace restored after reload.
- Populate generated Worker runtime variables from the same two public Supabase environment values used at build time. The configuration uses an explicit whitelist; optional secrets are not copied into `vars`.
- Authorized Wrangler with only account/user/zone read, Workers scripts/routes write and background access. Credentials are encrypted with a key in Windows Credential Manager; no credentials enter the repository or release.
- Rechecked DNS: the Cloudflare zone remains pending and its records differ from authoritative Spaceship records. No nameserver, DNS, mail or hosting deployment change was performed.

## Supabase repository connection verified — 2026-10-06

- Confirmed the hosted connection between `hbi Project` and `wadjstudio/hbi`, with working directory `.`.
- Found production deployment enabled on the existing connection; disabled it, saved, and verified it remained off after reload. Automatic branching remains off on Free.
- Current hosted schema/migration state remains unverified because session renewal/browser control interrupted the read-only Table Editor check. Inspect actual migration history before running any fresh-install or forward SQL; connection alone does not establish schema readiness.

## GitHub publication preparation — 2026-10-05

- Published the source tree to the user-selected repository `https://github.com/wadjstudio/hbi`, branch `main`, after explicit account authorization. The first GitHub CI run passed all supplied validation/build steps on Node 24. Supabase repository integration remains in progress; no automatic hosted deployment is enabled in CI.
- Expanded Git exclusions for environment files, local registry configuration, caches and build output. The example environment file remains available without credentials.
- Limited the CI workflow token to read-only repository contents. The workflow validates the application and migrations locally without applying them to the hosted Supabase project.
- Installed and authorized the Supabase GitHub App with the user's explicit approval and only HBI selected. Browser control became unavailable during callback completion; the project/repository connection remains unverified. No automatic deployment, hosted migration or paid branch was enabled.

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
