# SESEN — Handball Intelligence (HBI V1 foundation)

### Practical coach workflow

In Video Lab, select the match/session and attach its video. Open **المقاطع والاجتماع / Clips & meeting**, mark the source start/end, name the clip and save. Under **جهّز الاجتماع / Prepare meeting**, select or create a meeting, enter a presenter note and add the saved clips. Open the meeting to review/present its ordered content. Missing local media must be relinked on that device; saving a clip never uploads the video.

This workflow reuses local drafts and the existing retry/conflict-aware sync queue. Unsaved form values survive tab changes while the same workspace stays open; saved clips/meeting items persist. Export a workspace backup before clearing browser data. Repeating the same clip/meeting operation avoids duplicate entries and preserves edited notes. Manually prepared clips are coaching evidence, not automatically confirmed events or statistics. Details: `features/analysis/coach-clips.ts`.

The existing GitHub CI can build short-lived Pages artifacts to reduce local build pressure. Only public client settings are repository variables; no deployment credential, service-role key or match media is uploaded. `pages-production-COMMIT` and loopback-only `pages-e2e-COMMIT` are different artifacts. The latter is strictly for isolated local acceptance and must never be deployed. Artifact availability depends on existing GitHub Actions quotas; this adds no mandatory hosted analysis service or billing-limit change.

Preparation update (2026-10-25): optional local kit-colour grouping and seed-based camera propagation can now be imported into Automatic analysis. The current-frame court preview, source/model/frame validation and tracking backups retain these **unreviewed estimates**; editing boxes clears them. An estimated near-goal grouping is a review cue, never a 6:0/5:1 classification. Two real 60-second samples returned zero eligible tactical proposals. Useful unattended tactical recognition remains unfinished. Commands and reproducible limits: `tools/local-analysis/SPATIAL_PREPARATION.md`.

The **Automatic analysis** tab imports source-bound local scoreboard results and a bounded person-tracking sample. It opens proposal intervals on the video, saves scoped IndexedDB review decisions, exports/restores review backups and creates retry-stable review clips. Tracking adds source-aligned boxes, frame navigation, per-frame correction/hiding/restoration and a separate corrections backup. These proposals do not become goals, player statistics or tactical findings. Browser binding checks the sampled fingerprint, size and duration, plus dimensions for tracking; exporters first verify full source SHA256. See `tools/local-analysis/README.md` for commands. Selecting a video does not launch Python automatically; reliable player/ball identities, tactical understanding and one-click engine integration remain unfinished.

Automatic tactical proposals (2026-10-22): importing tracking now extracts review-only path-crossing cues. Reviewed, frame-specific court/team/phase evidence enables initial 6:0/5:1 shape rules. Proposals open source evidence, retain scoped coach decisions and export separately from canonical events. The actual 35:00–36:00 sample produced zero eligible proposals; defensive calibration is missing. See `tools/local-analysis/TACTICAL_RULES.md` for the contract, batch command and limits.

Tracking review acceptance (2026-10-22) includes the 130-test regression, two exporter tests and real-video Chrome checks for box geometry, saved frame corrections and Arabic mobile layout. See `VALIDATION.md` for build, source-package and remaining model-quality gates.

Saved team logos and player photos now appear in the workstation; edit their optional image URLs in team/player management. Settings also provides your own display name and account photo. HTTPS and application-relative paths are supported, with neutral identities when absent or unavailable. Images load directly with no referrer, without uploading video or adding a paid service. The declared-starter choice stays unchanged while navigating teams or tabs.

Player highlights now have complete scoped lists: three beside the video and four in the lower summary, with View all retaining every player. Names open all attempts; rate rings open only reviewed attempts, and pending-only players remain accessible through their names.

The intelligence cards now follow the reference's alternating widths when the resized pane has room. Narrow panes keep the shot map full width and place recorded-zone controls below it in two columns; evidence samples and physical court coordinates remain unchanged.

The defense ring opens the leading recorded system's exact evidence; its denominator counts descriptors, not playing time. Shot zones show recorded-zone shares with separate unknown/broad-zone handling and a 7m action. Goalkeeper samples are available inside the n-counter disclosure.

The intelligence rail uses compact procedure/insight rows with complete scoped View all lists. Choose the analyzed team in the heading; open the visible n-counter for current/historical sample details and separate shot/event evidence. Pending-only attempts stay accessible even when a reviewed denominator is unavailable. Dense and long-content acceptance remains part of the reference audit.

Player threat rows now show compact shooting-efficiency rings beside supplied photos or neutral shirt avatars, with separate all-attempt and reviewed-rate evidence actions. Reviewed/pending counts remain visible and described for screen readers. The shot-profile card has a larger labelled ring, separate reviewed-goal/pending actions and an accessible calculation note; cumulative trend points keep their exact samples.

Video source, relinking and layout/session setup now live behind the labelled gear beside playback controls. The video keeps its full source aspect and starts higher in the workstation; the empty state offers a direct Choose source action. Setup supports Escape/focus return, outside dismissal, local file verification and existing guarded YouTube attachment. It does not remount or upload the local media.

The primary video controls now use a gold progress track with a cyan remainder, larger wide-desktop playback targets and a full-width row of nine colored tagging actions. Save uses a hand icon; the recording semantics, source aspect ratio, keyboard shortcuts and local media remain unchanged. The existing athlete artwork has a stronger wide-desktop presence.

The wide workstation header now uses a 286px SESEN masthead with the existing lockup at 232px, matching the reference footprint while retaining the 192px navigation rail. Match metadata, opposing team identities and actions have separate space. Compact/tablet and mobile branding remain responsive; the home link is available once in the accessibility tree.

The match header now shows a validated saved date in explicit UTC beside venue metadata, with a competition icon and stronger title hierarchy. A keyboard-accessible details disclosure exposes full competition/team/venue text on narrow screens and for long names. Missing/invalid dates remain unrecorded; team/competition lookup stays organization-scoped and recorded results remain separate from tagged event counts.

Meetings now separate an ordered preparation agenda from a large content preview. Presentation mode shows clips, boards, evidence-linked insights or team messages while hiding speaker notes and editing controls. It tracks native fullscreen exit, respects focused controls during keyboard navigation and provides a modal fallback when fullscreen is denied. Missing/cross-organization content stays unavailable rather than crashing the stage; clips retain source-range bounds and explicit local relinking.

Review now combines unresolved/verification-needed canonical attempts and legacy issues once per event in the current session/filter selection. Exact evidence, correction and gated legacy closure are separate actions; an empty queue does not mean full-match coverage. Opening an event resets shot fields from that event's canonical attempt, or explicit unknown/empty values, instead of retaining another event's result or goalkeeper.

Video annotations now have a source/session-scoped layer library with drawing-only previews, visibility ranges and pause-on-entry status. The shared drawing editor has labelled icon tools, explicit selection mode and keyboard object selection/movement. Moving an arrow/path translates both anchors together; the preview is manual telestration, not automatic player tracking.

Lineups now shows schematic recorded roles at the calibrated period/clock, an interval-detail panel and a separate declared roster. Starter flags and profile positions never stand in for on-court evidence. Events now has a source-time feed with canonical shooter/result, missing-clock/review states and exact evidence/edit/clip actions. Existing setup and participant tools remain available in labelled disclosures.

The embedded Reports tab now prepares a coach brief with actual match context, current-selection metrics and saved event-backed insights with explicit review state. Optionally include the complete selected event register in browser print/PDF; source time and recorded game clock remain separate, and each on-screen reference opens its event. Reports export metadata/observations only, without embedding or uploading the local video.

SESEN now bundles its display fonts locally: Roboto Condensed for English/numbers and IBM Plex Sans Arabic for Arabic. Six WOFF2 files total about 263 KB, with complete OFL notices and provenance in `public/fonts`. No runtime Google Fonts connection is needed; see [brand typography](brand/BRAND.md).

Player metrics open their exact reviewed/pending/keeper event samples. Verified-minute disclosures show period, actual position, clock bounds and verification status; incomplete intervals stay unknown. Summary cards belong to Analytics, and narrow player tables scroll within their own keyboard-focusable region.

The optional local tools also prepare dense source-verified annotation sequences, correct/add missed person and ball boxes, resume human review through validated JSON, and export review-only COCO plus explicit-sample ball diagnostics. The 12-second CPU probe remains unsuitable for reliable automatic ball tracking; specialist model evaluation, expert annotations and media rights clearance remain pending. See [local review instructions](tools/local-analysis/README.md).

Optional local analysis now includes a separate eight-frame spatial review: generic ball proposals/overlapping crops, jersey-colour correction, manual normalized ball points and frame-bound ground calibration validation. Actual CPU tests exposed weak generic ball coverage and costly tiling; there is no continuous ball tracking or automatic tactical understanding. See [local tools](tools/local-analysis/README.md) and [measured validation](VALIDATION.md). Production video selection still does not run this engine.

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

Shot and turnover maps open in **Density** mode. Select a highlighted sector to inspect its exact events, or expand the map summary and choose **Points** for individual observations/editing. Percentages use known locations only; located/total and missing counts stay visible. Glow is a display aid around recorded coordinates, including unresolved attempts—not inferred ball movement or scoring probability. The same normalized coordinates remain unchanged in Arabic and at different sizes.

Browser acceptance optionally uses `HBI_E2E_SERVER_MODE=production` after an isolated Next build with matching `HBI_E2E_MODE=1`, `HBI_E2E_PORT` and mock Supabase URL/key. Run that in a separate test-only shell; the mock server port must match the built client URL. The default remains the development server. Before publication, build Pages again in a clean shell with the real public configuration; never deploy the isolated mock Next output.

The header now shows the signed-in account and its actual organization role. Its bell opens real sync/backup operations, with pending counts. **Presentation** lists meetings linked through this match's clips or event-backed insights. **Share** copies the match, explicit analysis session and source position; recipients still need organization access and a matching local file. Pending local edits must sync before others can see them. Sharing changes no permissions and uploads no video. An unavailable explicit session does not silently open another session.

The match workspace opens **Analytics**, with **Lineups**, **Events**, **Player stats**, **Team stats**, **Comparison** and **Reports** alongside drawing/review tools. The new statistics/report views use only the active session and current filters. Player/keeper tables expose reviewed samples and missing match positions/minutes; comparison keeps both teams' denominators visible. Team metric buttons open the exact supporting events. Reports offer filter-bound CSV with stable IDs/raw timestamps and browser print/save PDF without the surrounding video/editor. These views require no new SQL beyond the existing schema; preserve the merged storage-hardening changes through 0020 documented in DEPLOYMENT.md.

Quick tagging separates phase selection (Attack, Defense or a transition context) from recording an event. **7m won** records an award, not a shot; **2 min** records a suspension against the selected player/team without silently changing numerical context. Record the resulting shot separately. The colored filter chips share the timeline/evidence filter; 6:0/5:1 require linked coded possession descriptors and 7v6 requires recorded counts. Missing context never becomes an inferred tactical observation.

Open **Layout & sessions** beside the video source for focus/fit/reset and analysis-session settings. Escape closes this disclosure and restores focus; tapping outside also closes it. Native disclosure, tab and separator keys keep their own behavior instead of seeking/tagging the video. The fitted desktop workspace retains the complete source frame and shows all five populated summary cards within a 1672×941 viewport in the accepted local fixture.

The coaching console uses a resizable video/evidence split and keyboard-accessible tabs. Focus video enlarges the working surface without unmounting the player; Reset layout restores the split. On small screens the same panels stack. Five summary cards show reviewed attempts and cumulative evidence, shooters, resolved closed possessions, recorded turnover locations and team-relative match results. Selecting a statistical sample opens its supporting events. Empty samples and unresolved results remain explicit. Source selection is in an expandable section after attaching a video.

Beside the video, choose **This session** or **Last 3/5/10** for the selected team's intelligence. Historical samples end at the open match's date and use one unambiguous primary session per match; coverage exposes missing/ambiguous sessions. Timeline and lower cards stay on the current session. Each evidence row identifies its match/session and missing local source. Historical review/edit links open the actual source session; clips and meeting items reference that event's video. Relinking a matching file restores the selected nonzero source time. Match results remain independent of tags.

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

Read [DATA_SOURCES.md](DATA_SOURCES.md) for the audited handball-data and open-source integration decisions. **Data sources** in the sidebar offers an optional Wikidata player-name/revision preview and a 16-source guide. Names are exported for review, not silently imported as current rosters or performance statistics. Public metadata, code, model weights and dataset licenses are reviewed separately. The original local pilot exports MOT/CVAT suggestions with the IoU baseline. A separate optional YOLOX-S/ByteTrack comparison now offers longer before/after/source views and timestamped reviewer feedback; see [local tool instructions](tools/local-analysis/README.md). It does not add production automatic analysis or ball/tactical recognition.

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

Latest verified UI publication: code `fb35e62`, Pages deployment `0f9403cd-5eba-46f9-ab04-9828663e6123` at https://hbi.wadj.online. HTTPS login and all 37 deployed JavaScript/CSS hashes matched the tested bundle. See DEPLOYMENT.md for exact verification limits; subsequent source/documentation changes are separate from publication.

The production hostname `https://hbi.wadj.online` is active with SSL on Pages advanced mode; HTTPS SSR, current client assets and real coach sign-in to the HBI organization are verified. DNS remains at Spaceship with an independent HBI CNAME. Run `pnpm build:pages`, then `pnpm preview:pages` locally. See [DEPLOYMENT.md](DEPLOYMENT.md) and [VALIDATION.md](VALIDATION.md) for deployment details and remaining integration checks.

`pnpm build:cf` uses vinext's built-in fetch handler. Pages packaging bundles that server into `dist/pages/_worker.js`, preserves client assets and excludes their routes from SSR. Public environment variables must be set before building; server-only secrets belong in deployment bindings. The optional `deploy:cf` Worker path requires an active Cloudflare DNS zone and is not selected for this domain. The starter does not publish itself.

Browser checks can use an installed Edge on Windows with `HBI_BROWSER_CHANNEL=msedge`, or install the project's Chromium browser with `pnpm exec playwright install chromium`. The browser tests use a localhost Auth/Data fixture; PostgreSQL policy tests are independent. Read ZERO_COST_LIMITS.md before enabling sharing. A full match video often exceeds a free cloud storage allowance; keeping its bytes local is the V1 default.

If Turbopack development compilation stalls on your filesystem, set `HBI_E2E_BUNDLER=webpack` for browser checks; this selects Next's supported Webpack development mode. Production builds retain their configured default bundler. The reports journey attaches its CSV, Arabic print screenshot and browser-generated PDF to the Playwright report.

For local Worker bundle inspection after `build:cf`, run `pnpm exec wrangler deploy --dry-run`; this does not publish. On this restricted-network machine the clean verification used `WRANGLER_SEND_METRICS=false` for that command, after an initial attempt stayed open at exit. This is Wrangler's optional telemetry setting; no global configuration change is required.
