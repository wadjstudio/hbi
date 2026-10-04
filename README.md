# HBI — Handball Intelligence 0.2.0

مساحة تحليل كرة يد عربية/إنجليزية، مبنية كتطبيق واحد بوحدات واضحة. البداية بالبيانات والصلاحيات، ثم الفيديو والتكتيكات والأدلة والاجتماعات.

## Run

Use Node 24 and pnpm 10.30.3. Copy `.env.example` to `.env.local`, supply your Supabase URL and publishable key, then:

```powershell
pnpm install --frozen-lockfile
pnpm db:start
pnpm db:reset
pnpm db:types
pnpm dev
```

Local Supabase requires Docker. Alternatively configure a free hosted Supabase project and apply all migrations with the Supabase CLI after linking that project. Never reset an existing hosted database to upgrade it: apply pending migrations. Create an Auth user through Supabase first; organization onboarding runs the authenticated `create_organization` RPC.

## First coaching workflow

1. Create an organization. In Settings add own/opponent teams, seasons and competitions; add players, then a match.
2. Open that match; select a local video. Its bytes remain on the computer. Add match-roster players for both teams.
3. Calibrate each period and any clock stoppage with non-overlapping video-to-clock segments.
4. Start possessions; select tactical descriptors. Tag one shot attempt and its result, shooter, opposing goalkeeper, zone and placement. Close the possession.
5. Record on-court intervals and substitutions. Review ambiguous legacy events before relying on their metrics.
6. Use player/opponent filters and evidence links, create timestamp clips, save tactics as frames with animations, and prepare playlists/meetings.
7. Reports export CSV or open the browser print dialog for PDF, preserving Arabic rendering. CSV includes stable match/session/event IDs, video milliseconds, period and independent match-clock milliseconds; missing clock data stays blank. Saved coach notes survive reopening the report.

After opening/preparing a match while connected, video playback and drafts continue during a connection loss. Initial login/setup and opening a new uncached route require a connection. This is not a full offline application. Sync & backup displays queued changes and conflicts; export drafts before clearing browser storage. Backups are tied to the same user and organization.

Ordinary edits merge the server's returned row without re-downloading the organization after every tag. Use Refresh to pull other analysts' latest data; revision conflicts still protect concurrent edits. Cascading deletions and substitutions trigger reconciliation once their queue drains.

## Validation

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm db:verify
pnpm db:test
pnpm build
pnpm build:cf
pnpm test:e2e
```

`db:verify` exercises clean/upgrade schemas and permission/domain behavior in an ephemeral PostgreSQL/WASM database with an Auth test shim. `db:test` runs basic schema/RLS/grant smoke checks inside local Supabase/Docker. These serve different purposes; see `VALIDATION.md` for exact outcomes.

To verify a delivered archive independently (Python 3), run `pnpm package:verify -- <path-to-ZIP> --blueprint <path-to-external-Blueprint>`. The adjacent SHA256 file is read automatically. Supply `--original <original-ZIP>` to compare migrations 0001–0010 byte for byte.

R2 is optional and requires your own bucket, CORS and secret environment bindings. Upload is explicit, direct from the browser, and quota-limited; read URLs expire. No video passes through the Worker. Free-tier quotas are finite and shared across your deployment; do not enable paid automatic capacity. No mandatory AI, paid video service, ORM, queue or additional backend.

Read `ARCHITECTURE.md`, `CODEX.md`, `BLUEPRINT.md`, `PHASES.md` and `FIRST_CODEX_PROMPT.md` before extending the application.

## Cloudflare and limits

The requested production hostname is `https://hbi.wadj.online`; its Worker Custom Domain route is prepared in `wrangler.jsonc`. Follow [DEPLOYMENT.md](DEPLOYMENT.md) to activate the DNS zone, create/configure Supabase, supply matching build/runtime public values and verify the live application. This preparation has not published a site or changed DNS.

`pnpm build:cf` uses the checked-in legacy Wrangler configuration with vinext's built-in fetch handler; `pnpm deploy:cf` is the separate publishing action. Public environment variables must be set at build time and server-only secrets configured on the deployment. The starter does not publish itself. `pnpm vinext:init` preserves this adapter choice rather than introducing optional cache services.

Browser checks can use an installed Edge on Windows with `HBI_BROWSER_CHANNEL=msedge`, or install the project's Chromium browser with `pnpm exec playwright install chromium`. The browser tests use a localhost Auth/Data fixture; PostgreSQL policy tests are independent. Read ZERO_COST_LIMITS.md before enabling sharing. A full match video often exceeds a free cloud storage allowance; keeping its bytes local is the V1 default.

If Turbopack development compilation stalls on your filesystem, set `HBI_E2E_BUNDLER=webpack` for browser checks; this selects Next's supported Webpack development mode. Production builds retain their configured default bundler. The reports journey attaches its CSV, Arabic print screenshot and browser-generated PDF to the Playwright report.

For local Worker bundle inspection after `build:cf`, run `pnpm exec wrangler deploy --dry-run`; this does not publish. On this restricted-network machine the clean verification used `WRANGLER_SEND_METRICS=false` for that command, after an initial attempt stayed open at exit. This is Wrangler's optional telemetry setting; no global configuration change is required.
