# SESEN — Handball Intelligence (HBI V1 foundation)

SESEN is the final product identity. The supplied October 7 UI kit is integrated as design tokens, schematic court/neutral avatar assets and interaction specifications. Generated logo masters, responsive lockups, browser favicons, Android regular/maskable icons, iPhone home-screen icon and social card are included. Read `brand/BRAND.md` for assets, generation provenance and installation limitations. The existing hbi.wadj.online address, repository, schema, IndexedDB keys and backup format remain compatible.

The match context now occupies the shell header above the video/evidence split; gold active navigation, cyan controls, graphite panels and larger readable labels follow the final reference. At medium widths navigation collapses to labelled icons; mobile uses a native modal drawer with Escape and focus restoration. Arabic mirrors shell placement while video, court geometry and the chronological timeline retain their orientation. The app manifest supplies standalone/home-screen branding; it does not add offline navigation or bypass sign-in.

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

The coaching console uses a resizable video/evidence split and keyboard-accessible tabs. Focus video enlarges the working surface without unmounting the player; Reset layout restores the split. On small screens the same panels stack. Five summary cards show reviewed attempts, shooters, resolved closed possessions, turnover phases and recorded match results. Selecting a statistical sample opens its supporting events. Empty samples and unresolved results remain explicit. Source selection is in an expandable section after attaching a video.

The new interface primitives are MIT-licensed `react-resizable-panels` and Radix Tabs; their notices are in `public/third-party-ui-notices.txt`. They control layout and focus only, not permissions, persistence or analytical formulas.

Overview opens the match hub with the verified ON Sport Al Ahly–Zamalek final (23 May 2025, 31–28). Import creates public source metadata and missing teams through scoped saves; it invents no roster or events. After applying 0017–0019, choose **Analyze official recording · YouTube**, review privacy/terms, load the official player and select the recording team. Tag possessions/shots at the controller’s actual source time; custom HTTPS YouTube URLs are supported.

Online analysis needs internet and seeks to YouTube keyframes. There is no download, proxy, frame extraction or overlay on that player. Local files support precise playback, telestration and prepared-workspace offline work. A local file attached during YouTube analysis creates a separate video/session; timestamps and clock anchors never transfer between edits. A changed source duration blocks new tagging for review. Online clips play intervals in playlists/meetings. Privacy choice is transient, scoped to account/organization and cleared on sign-out.

The rail includes defense, reviewed shot-origin profile, shot map, shooters, patterns and goalkeeper denominators. Missing/legacy origins and pending results remain visible. Team/actor/phase controls are beside quick tagging; new zones start unknown and phases unclassified. Clock calibration offers current-position markers without inventing period anchors.

The match workspace places transport and a zoomable three-lane timeline beside session-scoped intelligence. Result chips use canonical attempts; tactical samples deduplicate possessions. Open evidence to review a moment, edit its record, make a clip or append it to a meeting. Expand tagging details to choose participants/context; unresolved shot results start as `unknown`. See `docs/ui-redesign/RESEARCH.md` for the component/data research and remaining design roadmap.

1. Create an organization. In Settings add own/opponent teams, seasons and competitions; add players, then a match.
2. Open that match; select a local video. Its bytes remain on the computer. Add match-roster players for both teams.
3. Calibrate each period and any clock stoppage with non-overlapping video-to-clock segments.
4. Start possessions; select tactical descriptors. Tag one shot attempt and its result, shooter, opposing goalkeeper, zone and placement. Close the possession.
5. Record on-court intervals and substitutions. Review ambiguous legacy events before relying on their metrics.
6. Use player/opponent filters and evidence links, create timestamp clips, save tactics as frames with animations, and prepare playlists/meetings.
7. Reports export CSV or open the browser print dialog for PDF, preserving Arabic rendering. CSV includes stable match/session/event IDs, video milliseconds, period and independent match-clock milliseconds; missing clock data stays blank. Saved coach notes survive reopening the report.

After opening/preparing a match while connected, video playback and drafts continue during a connection loss. Initial login/setup and opening a new uncached route require a connection. This is not a full offline application. Sync & backup displays queued changes and conflicts; export drafts before clearing browser storage. Backups are tied to the same user and organization.

Ordinary edits merge the server's returned row without re-downloading the organization after every tag. Use Refresh to pull other analysts' latest data; revision conflicts still protect concurrent edits. Cascading deletions and substitutions trigger reconciliation once their queue drains.

## Experimental local analysis engine

The production app currently records analyst-entered events; selecting a video does not automatically analyze it. A separate [local analysis pilot](tools/local-analysis/README.md) now exercises pinned ONNX models on a real full-match file: periodic scoreboard OCR with review-only score-change intervals, plus a short generic person-track overlay export. It never uploads the recording or writes predictions into match statistics. Temporary track IDs are not player identities. The pilot includes a standalone evidence-review page and Python behavior tests; automatic shot/tactical recognition and production integration remain future acceptance gates. See `VALIDATION.md` for the actual coverage and limitations.

## Validation

Read [DATA_SOURCES.md](DATA_SOURCES.md) for the audited handball-data and open-source integration decisions. **Data sources** in the sidebar offers an optional Wikidata player-name/revision preview and a 16-source guide. Names are exported for review, not silently imported as current rosters or performance statistics. Public metadata, code, model weights and dataset licenses are reviewed separately. The local pilot can export MOT/CVAT suggestions for independent annotation; it still uses the IoU baseline, not ByteTrack.

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

The production hostname `https://hbi.wadj.online` is active with SSL on Pages advanced mode; HTTPS SSR, current client assets and real coach sign-in to the HBI organization are verified. DNS remains at Spaceship with an independent HBI CNAME. Run `pnpm build:pages`, then `pnpm preview:pages` locally. See [DEPLOYMENT.md](DEPLOYMENT.md) and [VALIDATION.md](VALIDATION.md) for deployment details and remaining integration checks.

`pnpm build:cf` uses vinext's built-in fetch handler. Pages packaging bundles that server into `dist/pages/_worker.js`, preserves client assets and excludes their routes from SSR. Public environment variables must be set before building; server-only secrets belong in deployment bindings. The optional `deploy:cf` Worker path requires an active Cloudflare DNS zone and is not selected for this domain. The starter does not publish itself.

Browser checks can use an installed Edge on Windows with `HBI_BROWSER_CHANNEL=msedge`, or install the project's Chromium browser with `pnpm exec playwright install chromium`. The browser tests use a localhost Auth/Data fixture; PostgreSQL policy tests are independent. Read ZERO_COST_LIMITS.md before enabling sharing. A full match video often exceeds a free cloud storage allowance; keeping its bytes local is the V1 default.

If Turbopack development compilation stalls on your filesystem, set `HBI_E2E_BUNDLER=webpack` for browser checks; this selects Next's supported Webpack development mode. Production builds retain their configured default bundler. The reports journey attaches its CSV, Arabic print screenshot and browser-generated PDF to the Playwright report.

For local Worker bundle inspection after `build:cf`, run `pnpm exec wrangler deploy --dry-run`; this does not publish. On this restricted-network machine the clean verification used `WRANGLER_SEND_METRICS=false` for that command, after an initial attempt stayed open at exit. This is Wrangler's optional telemetry setting; no global configuration change is required.
