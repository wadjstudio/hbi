# HBI 0.2.0 validation — 2026-10-04

## Pages continuation — 2026-10-06

Final domain activation: Cloudflare shows `hbi.wadj.online` Active with SSL enabled. HTTPS SSR and all eight current client assets passed with HTTP 200/correct MIME types. The user entered the password directly; Chrome loaded `/overview` with the existing HBI organization and no observed console errors/warnings. The earlier TLS-handshake failure was temporary and is superseded. Screenshots `HBI_CUSTOM_DOMAIN_ACTIVE.jpg` and `HBI_FINAL_DOMAIN_AUTHENTICATED.jpg`.

Custom DNS: the user reopened Spaceship DNS; a new independent `hbi` CNAME was saved to `hbi-handball-intelligence.pages.dev` with TTL 30 minutes. The original three records and launch1/launch2 Spaceship nameservers remained unchanged. Cloudflare's Check DNS records initially showed Inactive (Requires DNS setup); subsequent activation and final-origin authentication passed as recorded above. Screenshot `HBI_SPACESHIP_CNAME_SAVED.jpg`.

Live sign-in passed: the user entered the coach password directly in Chrome; `/overview` loaded the existing HBI organization and restored it after reload. Screenshot `HBI_PAGES_LIVE_AUTHENTICATED.jpg`. Public DNS now resolves the saved HBI CNAME to the correct Pages target and still returns Spaceship nameservers. The custom-domain HTTPS check fails its TLS handshake while certificate activation is pending; certificate validation was not bypassed.

Live publishing: explicit Pages scope approval, seven OAuth permissions reviewed, encrypted Windows Credential Manager storage verified, separate HBI Pages project created, deployment `237b15bf-2391-4110-8a95-dbaa90eabc72` completed with exit 0. `https://hbi-handball-intelligence.pages.dev` passed SSR and all eight actual CSS/JavaScript references over HTTPS. The login-page screenshot is `HBI_PAGES_LIVE_LOGIN.jpg`; the subsequent authenticated result is recorded above. GitHub CI passed on source `d03aaa6`, run `37387146425`. No DNS change yet; live match/R2/CPU and multi-user tests remain unverified.

Focused ESLint on `scripts/build-pages.mjs` and `vite.config.ts` passed with exit 0. The first attempt timed out after 180 seconds; the longer standalone retry completed. Strict TypeScript passed earlier on the final Vite configuration; this continuation adds only a JavaScript packaging script and documentation. No database or coaching UI logic changed in this deployment continuation.

The single-module Pages candidate passed local checks on port 8791: `/overview`, CSS and JavaScript returned HTTP 200 with correct MIME types. Chrome hydrated the interface and loaded the existing HBI organization from the real Supabase account without observed console errors/warnings. Launching with the correct explicit output directory resolved earlier asset 404s. This does not verify deployed TLS, CPU quotas, hosted multi-user isolation or a full real-match synchronization journey.

Final source commands verified: `pnpm build:pages` passed with exit 0; `pnpm preview:pages --port 8792` started successfully after isolating its generated Wrangler redirect from the parent Worker redirect. HTTP checks passed for SSR and all eight actual asset references from its HTML, including correct CSS/JavaScript MIME types. Chrome loaded HBI and navigated to Settings with the hosted tactical vocabulary. An earlier hard-coded asset check requested an obsolete JavaScript hash and received 404; the actual current references all passed. Screenshot: `HBI_PAGES_LOCAL_VERIFIED.jpg`. These local checks preceded the successful publishing recorded above.

This supersedes the original starter's dependency/DNS limitation report. Dependencies were installed and executable validation was performed on Windows with Node 26.8.1, pnpm 10.30.3 and an installed Microsoft Edge. Node 24 is the documented project/CI runtime; the exact dependency resolution is in pnpm-lock.yaml.

## Executed checks

| Check | Result and scope |
|---|---|
| Frozen dependency installation | Passed. `pnpm install --frozen-lockfile --offline` with this workspace's existing pnpm store/cache and hardlinks; resolution skipped and lockfile unchanged. These local store flags are unnecessary for a normal fresh installation. |
| `pnpm db:verify` | Passed: clean installation, upgrade from original 0001–0010 with legacy data, organization isolation, viewer write denial, analyst match-delete denial, head-coach/TD permissions, immutable scope/context, canonical shots, overlap rejection, atomic substitution/retry/rollback, CAS conflict and idempotent receipts, roster-validated participants, score constraints, primary-only aggregates and defensive taxonomy attribution. |
| Catalog-generated types | Passed. `pnpm db:verify -- --types` generated table columns, enums, relationships and precise RPC input/output contracts from the migrated PostgreSQL catalog. Official Supabase generation remains `pnpm db:types` when Docker/Supabase is available. |
| `pnpm db:test` | Attempted on 2026-10-04; assertions did not run because local PostgreSQL refused the connection at 127.0.0.1:54322. No database/container startup or account provisioning was performed. |
| `pnpm typecheck` | Passed on the final continuation source after stopping the browser dev server. Regenerates Next route types before strict TypeScript checking. A concurrent attempt during dev startup failed because generated files were recreated; the standalone rerun passed. |
| `pnpm lint` | Passed without warnings on the final continuation source. |
| `pnpm test` | Passed: 19 tests across seven files covering canonical metrics, GK denominators, match positions, periods/stopped clocks/gaps, atomic local storage and account isolation, drawing/backup contracts, local file identity/source revocation, backup operation authorization and Arabic CSV/context/formula handling. |
| Browser journeys | Passed on 2026-10-04: all five Playwright journeys together (3.6 minutes), none skipped. Login; local MP4 → clock calibration → three possessions/shots, offline undo/redo and synchronization → opponent insight/evidence → mixed insight/clip meeting with scoped local media; player creation → offline tactical frame → synchronization/resize/animation; concurrent revision conflict → explicit choice → backup roundtrip/account rejection → logout; report notes/filtering/CSV/PDF and report revision conflict. |
| Board resize/animation | Passed in an expanded browser check: normalized position survives viewport resize, copied frame retains object identity, dragged player moves to the second frame, animation ends at its saved position without duplicating objects. |
| Revision conflict, backup and logout | Passed: another analyst changes the server revision; both versions remain visible, explicit “Keep my change” resolves the conflict; exported backup restores successfully, mismatched account is rejected, and logout removes access to the workspace. The browser check also confirms ordinary editing/resolution triggers no whole-collection GET downloads. |
| Reports continuation | Passed on 2026-10-04 in Edge with Next Webpack development mode: direct entry/reload retains saved Arabic notes and English preference, match/player/primary-session filters exclude other samples, CSV downloads three correctly contextualized rows (including pending review), a refreshed concurrent report edit conflicts until explicit choice, and the selected notes survive another reload. Print CSS hides controls, retains RTL notes/evidence; the print screenshot was visually inspected. Chromium generated a PDF with the expected file signature and size. CSV, print screenshot and PDF are attached to the Playwright report. Additional PDF text/link extraction was not executed because the bundled python.exe command was blocked by the shell allowlist. |
| `pnpm build` | Passed on 2026-10-04 on the final source, Next 16.3.8 default Turbopack production compilation, strict types and route generation, including report/locale fixes, backup hardening and bounded synchronization downloads. |
| `pnpm build:cf` | Passed on 2026-10-04 on the final source, vinext 1.0.0 / Vite 8.3.1 / Cloudflare adapter. Non-fatal bundler notices concern ineffective dynamic imports and plugin timings. |
| Wrangler dry-run | Passed with exit code 0 on the final continuation build, using the documented per-command `WRANGLER_SEND_METRICS=false` setting. No publishing: redirected generated Worker configuration, ASSETS binding, 36 asset files; Worker upload 2178.71 KiB, gzip 627.58 KiB. The first attempt with the default telemetry setting remained open after “exiting now” and timed out at 180 seconds; the retry completed cleanly. This is bundle validation, not a live request CPU/startup or quota test. |
| Delivery verification | Passed: SHA256, archive CRC, safe extraction, external/internal Blueprint parity, clean source-only inventory and byte-for-byte preservation of original migrations 0001–0010. The source verifier is included and the final archive was checked again after updating this record. |

Browser commands use `HBI_BROWSER_CHANNEL=msedge` on this Windows machine. CI installs Playwright Chromium. The 2026-10-04 continuation uses `HBI_E2E_BUNDLER=webpack`: the default Turbopack dev startup stalled before tests and was stopped. A Webpack cold-page navigation initially exceeded the test wait; explicit navigation waiting and a 30-second assertion window handle development compilation. Run standalone typecheck and the two production builds after browser tests, since dev regenerates route metadata while starting. Browser tests use the localhost Auth/Data fixture on port 54329, never an external account. The tiny MP4 is created through MediaRecorder/canvas; no remote video is downloaded. Browser test success does not establish real Supabase Auth/provider behavior.

## What the database harness verifies

The harness runs actual PostgreSQL through PGlite, with btree_gist, SQL migrations, authenticated/anonymous roles and a small Auth/JWT shim. Only the pgcrypto extension declaration is omitted in the harness because its runtime already provides gen_random_uuid. It executes ordinary RLS-protected operations and analytical views/RPCs; it is not a text-only SQL inspection. Original migration files remain unmodified in the package.

The fixture verifies a conservative legacy upgrade and a fresh schema separately. Unsupported or inconsistent pre-existing data is not silently deleted: repair it before applying constraints. A real deployment's data volume, Auth claims and existing custom policies still require a disposable staging upgrade.

## Checks requiring external infrastructure

- Local Supabase/pgTAP remains unverified: `pnpm db:test` could not connect to local PostgreSQL (ECONNREFUSED 127.0.0.1:54322). The separate Docker inventory command was blocked by lean-ctx's shell allowlist; no policy was changed. PGlite checks passed; they do not replace a real Supabase integration run.
- Live Supabase login, token expiry/refresh, deployed Auth configuration and hosted upgrade were not exercised. Re-run the supplied tests against a disposable configured project.
- Real R2 direct uploads, bucket CORS, signed URL expiry, HEAD finalization and account-wide billing allocations were not exercised; no credentials or bucket were configured.
- CSV roundtrips and browser PDF rendering passed in the continuation; printed reports have not been assessed in a real coaching meeting or on a physical printer. No full-match workload/performance or device-storage quota guarantee is claimed.
- Full offline navigation is outside V1: an already opened/prepared workspace continues local video/tagging/drawing; initial login/setup and an uncached route need connectivity.
- No hosted deployment, account provisioning, paid service activation or automatic video upload was performed.

## Domain preparation — 2026-10-04

Prepared `hbi.wadj.online` as an exact Worker Custom Domain route and set the production app URL in Worker vars. `pnpm build:cf` passed after the configuration change; the generated dist/server/wrangler.json retains the exact custom_domain route and expected vars. The first launch used an accidentally short one-second timeout; the normal 180-second background retry completed with exit code 0. No application/database code or dependency versions changed, so the earlier unit/browser/Next results still describe those unchanged files.

Public DNS from this device returned Spaceship nameservers and the same A record for the apex and subdomain. The user reports Cloudflare as the intended DNS manager and confirms no Supabase project exists yet. Domain activation, real Supabase values and live Auth/data verification remain prerequisites; no DNS mutation, account provisioning or publishing was performed. See DEPLOYMENT.md.

The rebuilt Worker also passed `pnpm exec wrangler deploy --dry-run` with `WRANGLER_SEND_METRICS=false`, exit code 0. Bindings included ASSETS, the HTTPS production app URL, app name and AI disabled; Supabase bindings remain intentionally unconfigured. This validates the bundle/configuration only, not live DNS, TLS, Auth or data access.

Subsequent read-only inspection in the user's Chrome profile established the actual Wadj site is Pages, not a Worker: `www.wadj.online` is Active with SSL enabled, and Spaceship hosts its `www` CNAME to `wadj-studio.pages.dev` while retaining its nameservers. DEPLOYMENT.md now records this topology and separates the future HBI hosting decision from existing DNS. Supabase's intended signed-in Chrome tab was not exposed; a new dashboard tab in the other available profile reached sign-in. No external configuration was changed. These documentation updates do not alter the tested application/Worker bundle.

## Hosted preparation continuation — 2026-10-05

- Chrome exposed the user's new `hbi Project` (`tsgecvtldcypsrinthwx`, Free) after the earlier sign-in limitation. Its public schema was empty when inspected. Public Supabase configuration was written to excluded `.env.local`; no secret key was retrieved.
- Re-ran `pnpm db:verify`: passed the full existing PostgreSQL behavior harness.
- Generated `HBI_FRESH_INSTALL.sql`: 16 unchanged migration sources normalized to LF for the combined script and matching history statements, inside one guarded transaction. PGlite execution passed with 42 public tables and exact history/source parity. A second execution was refused and the original 16 history records remained intact after rollback. The harness uses the same documented pgcrypto/Auth accommodations above.
- Verified the entire pasted SQL editor text through a normalized clipboard roundtrip. Hosted Run was rejected by automatic approval review; explicit user approval is pending. No hosted migration, RLS validation, Auth login or data write has been completed.
- `pnpm build:cf` passed with the real public Supabase build values. Original Worker runtime vars have not yet been populated with those public values; this is preparation, not a deployable live configuration claim.
- Pages compatibility experiment was local only. Passing a custom config path was rejected by Wrangler Pages. The module-directory attempt compiled its modules but failed resolving SSR `../index.js`. A single-module esbuild candidate compiled and reached a local Pages server; `/login` did not respond within the 15-second HTTP check. Chrome page navigation also timed out. Pages deployment, request handling and live authentication remain unverified; experimental files are outside the delivered source.
- No Cloudflare deployment, custom-domain registration, DNS/nameserver change, mail change or optional storage activation was performed.

## GitHub publication — 2026-10-05

- Published 156 source files to `https://github.com/wadjstudio/hbi`, branch `main`, initial commit `3499421441c3bf3890d02cb2ff54bceae3cafd5a`.
- Staging audit passed: all 16 migrations included; original migrations 0001–0010 byte-preserved; environment files except the empty example, local registry configuration and build/dependency output excluded; no known credential signatures present.
- GitHub CI run `37237639855` passed on Node 24: frozen installation, `db:verify`, typecheck, lint, unit tests, all five Chromium browser journeys, Next build and Cloudflare build. See https://github.com/wadjstudio/hbi/actions/runs/37237639855.
- CI uses read-only repository contents permission and placeholder public fixture values. It does not access or migrate the hosted database or publish a Cloudflare application.
- With explicit approval, GitHub's Supabase App installation selected only `wadjstudio/hbi`, with read code/metadata and read/write actions/checks/pull requests/workflows. Installation redirected to the Supabase authorization callback. Completion of the repository/project connection remains unverified: browser control stopped responding after the authorization page. No production-deploy or automatic-branching switch was enabled, and the hosted SQL Run remains unexecuted.

## Reproduce commands

### Repository connection verified — 2026-10-06

The hosted Integrations page showed `wadjstudio/hbi` connected to `hbi Project`, working directory `.`. Deploy to production was enabled when the page became accessible; it was turned off and saved, and the off state persisted after reloading. Automatic branching was also off and unavailable on Free. This supersedes the earlier unverified connection status. The current hosted schema/migration state was not established: Table Editor required session renewal and browser control failed during that read-only check. Do not assume the database is empty or fully migrated; inspect migration history before applying SQL. No SQL Run, paid branching or Cloudflare/DNS change was performed by this continuation.

Follow README.md with Node 24 and pnpm 10.30.3. Configure Supabase public values, apply forward migrations to an existing project (never reset it to upgrade), regenerate official types, then run types/lint/unit/database/browser checks and the two builds sequentially. Read ZERO_COST_LIMITS.md before deploying or enabling optional sharing.

Verify a release with `python scripts/verify-package.py <archive.zip> --blueprint <external-blueprint.md> --original <original-starter.zip>`. The adjacent `.sha256` is checked automatically. Archive verification inspects and extracts the package into a temporary directory; it does not deploy anything.

### Hosted history and first account — 2026-10-06

- Read-only Table Editor inspection subsequently confirmed 16 hosted migration-history records, versions `0001`–`0016`, and the HBI public tables. This supersedes the earlier unknown/empty-schema observations. Full hosted SQL statement parity and authenticated role isolation have not yet been verified. Do not run the fresh-install bundle on this existing project.
- Public-key anonymous reads of `organizations`, `events`, `shot_attempts` and `evidence_links` all returned HTTP 401 / PostgreSQL `42501`, with no rows exposed. This is an anonymous-access check, not an authenticated multi-organization integration test.
- The user completed first application Auth-account creation directly in Supabase; its Email-provider row was observed in Authentication → Users. No password was retrieved or stored by the agent.
- Started the local Next Webpack server with the excluded real public Supabase configuration. The user signed in directly in Chrome, and the application reached `/overview` with organization onboarding. After explicit approval for the owner grant, the application created the first organization through `create_organization` and loaded its real empty workspace. Its selection and workspace were restored after a page reload. Successful onboarding does not establish multi-user role isolation, populated-match synchronization or token-expiry behavior.
- GitHub CI run `37376125552` passed on the latest published source: https://github.com/wadjstudio/hbi/actions/runs/37376125552. Wrangler reports no authenticated account, and no Cloudflare publishing or DNS/mail change was performed.

### Worker configuration and external DNS decision — 2026-10-06

- After explicit approval, Wrangler authenticated with account/user/zone read, Workers scripts/routes write and background access only. `whoami` verified the intended account and encrypted credential storage with its key in Windows Credential Manager. No credentials were read or included in source/delivery. Its warning lists unused missing default scopes; they were not granted.
- `vite.config.ts` now whitelists the two public Supabase environment values into generated Worker runtime vars. Cloudflare build and Wrangler dry-run passed, with both public bindings visible in the generated deployment. Strict typecheck passed after correcting the config's inferred optional-value type. Focused ESLint passed on retry after the initial invocation timed out during the concurrent build.
- Local Cloudflare preview served `/login` and `/overview` in Chrome and loaded the real HBI organization using the existing authorized account session. This is a local runtime check, not hosted performance or token-expiry verification.
- Read-only DNS comparison confirmed Cloudflare remains pending, lacks Spaceship's `www` CNAME, and has different apex A records. The user chose to keep authoritative DNS at Spaceship and confirmed SpaceMail is purchased but not configured. Do not change nameservers; the Worker Custom Domain route is not the chosen external-DNS delivery path.
- Rebuilt the separate local Pages compatibility candidate. Its local test is pending: the direct installed `wrangler.cmd` invocation was blocked by lean-ctx's command allowlist, and approval to allow that specific command was requested. No shell protection was disabled, hosting published or DNS/mail changed.
