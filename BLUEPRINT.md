# SESEN — Handball Intelligence / HBI Zero-Cost V1 Blueprint

## Spatial proposals and review — 8 October 2026

An optional eight-snapshot experiment adds generic sports-ball decoding, overlapping crops, jersey-colour suggestions and a manual spatial review/export page. Full-frame inference yielded no ball proposals; costly tiling yielded two unreviewed proposals, so this is not an accepted handball detector. Exact-frame four-point homography validation exists, with human landmark approval still required and no reuse across camera motion. There are no inferred ball trajectories, distances/speeds, team identities or tactical events. Production integration, licensed specialist training, independent annotated evaluation and practical throughput remain acceptance gates.

## Tracking review follow-up — 8 October 2026

Reviewer feedback identified a too-short 5fps sample, missed overlapping people and fragmented tracks. A separate local before/after experiment now compares the preserved YOLOX-tiny/IoU baseline against YOLOX-S/ByteTrack at 10fps, with a same-detection IoU diagnostic and a standalone timestamped feedback page. It is capped at 90 seconds, uses explicit model/source provenance and optional isolated Python dependencies, and never converts predictions or feedback into match events. Ball detection, team discrimination, court calibration, robust occlusion/re-identification and tactical recognition remain unimplemented evaluation gates. Production video selection still does not invoke this engine.

## External knowledge and smarter analysis — 8 October 2026

The current source includes `/data-sources`: a reviewed 16-source handball-data/tool guide and optional Wikidata name/revision preview with unreviewed JSON export. Reads are explicit, bounded, credential-free and validated; they do not create rosters, stats or player identities in video. DATA_SOURCES.md records primary links, licensing distinctions, coverage gaps and the next integration decisions. GitHub repository-head/license snapshots and a minimal CC0 real-endpoint fixture accompany the contracts.

The original local pilot exports MOT predictions/CVAT review suggestions with dense preview/source-time mapping, validated geometry and scene-local identities. No CVAT server, TrackEval package or third-party training dataset is required or installed. The later local comparison adds optional ByteTrack separately. Future automatic analysis requires independently reviewed handball samples, ball/team/court calibration, event precision/recall evaluation and an authenticated review/import boundary. Product statistics still use canonical reviewed observations. No migration or hosted deployment is implied by this source update.

## Final identity — 7 October 2026

SESEN Sports Intelligence is the umbrella brand; Handball Intelligence is this application's specialization. The final user image and SESEN_CODEX_UI_KIT define graphite/ivory surfaces, cyan controls, champagne-gold active navigation, a unified match header, video/timeline/tagging beside evidence and full-width analytics below. The kit's older orange navigation reference is superseded by the final gold image; orange keeps its event meaning. Actual data, session isolation and missing samples remain authoritative.

Implemented identity includes generated transparent mark/horizontal lockup masters, optimized web exports, favicons 16/32/48, Android 192/512 regular/maskable icons, Apple 180 icon, manifest/standalone metadata and social sharing card. Masks use a separately padded safe zone. Responsive navigation has desktop labels, medium icon rail with accessible names and mobile native modal drawer. Brand inputs/provenance and asset hashes live in `brand/`; no demo events/portraits/heatmaps were imported. Generated raster reconstruction is not the missing original vector source. The prior HBI repo/domain/storage/schema/backup identities remain stable; no SQL migration is introduced by this branding work. Full offline navigation and OS-specific install verification remain separate acceptance gates.

## Purpose and acceptance

The October 6 workbench puts video, zoomable event/possession/clip lanes and evidence-linked intelligence on one screen. A verified Al Ahly–Zamalek final (23 May 2025, 31–28) provides official provenance and retry-safe metadata import; events remain empty until manually tagged. 0017–0019 enable online IFrame-API tagging, possessions and clips in a separate source/session. Local files support precise/offline/telestration work. No automatic extraction, roster inference or clock calibration is implied. Follow `docs/ui-redesign/RESEARCH.md` for interface gates.

A coach/analyst manages matches, records possessions and player actions against local video, studies the last 3/5/10 opponent matches, inspects evidence, builds tactics and prepares a meeting/report. Every displayed metric exposes its sample and source observations. Manual professional tagging is the source of truth; automatic CV and mandatory AI are excluded.

## Experimental local engine

An optional `tools/local-analysis` prototype now analyzes a user-supplied local broadcast with pinned ONNX models: periodic scoreboard OCR across the source, unreviewed score-change intervals/discontinuities and a short generic person-track overlay export. It uses local Python/FFmpeg/NumPy/Pillow/ONNX Runtime, without a cloud service or production schema change. A standalone review page verifies the selected source and exports decisions; it does not create canonical events. The prototype is separate from the manual V1 web workflow described above. Its frame sampling is not full-frame tactical understanding; temporary track IDs are not players. Automatic tactical recognition and production integration require reviewed handball data, measured evaluation and authenticated review/import contracts. See `tools/local-analysis/README.md` and `VALIDATION.md`.

## Stack and layout

The coaching surface uses MIT-licensed react-resizable-panels and Radix Tabs, with compact match context, source options, transport/timeline, an adjacent intelligence rail and five canonical-sample summary cards. Desktop panels resize by pointer or keyboard; focus and responsive stacking retain the mounted player. Dashboard formulas live in features/analysis/match-dashboard.ts, independent of visual primitives. Missing sample data stays unknown. Upstream notices ship in public/third-party-ui-notices.txt.

Next.js 16, React 19, strict TypeScript, Tailwind 4; vinext/Vite on Cloudflare's Worker runtime, packaged as Pages advanced mode for external DNS; Supabase Auth/PostgreSQL/Data API/RLS; Dexie/IndexedDB; native HTML video and SVG tactical/shot surfaces; Zod; AWS S3 presigning for optional R2; Vitest/Testing Library/Playwright. Exact resolved versions live in pnpm-lock.yaml, not prose guesses. Native browser printing provides Arabic-compatible PDF; CSV is escaped UTF-8.

Deployment target hbi.wadj.online retains authoritative DNS at Spaceship. `build:pages` bundles one `_worker.js` server and client assets with static-route exclusions; no extra service is added. Publishing, external CNAME and live HTTPS/CPU validation remain separate from local builds. See DEPLOYMENT.md. No automatic hosted migrations or nameserver transfer is required.

Application routes: overview, matches and match workspace, opponents, team, players and player detail, video-lab, tactics and board detail, playlists and playlist detail, meetings and presentation detail, reports and report detail, settings. Arabic is default; English and RTL/LTR are supported.

Domain modules reside in features; reusable workflows in components/workspace; infrastructure and pure calculations in lib. PostgreSQL owns shared truth, Dexie owns unsynced drafts/outbox, and component state owns ephemeral playback/editing. Secrets remain on server routes.

## Database contract

SQL under supabase/migrations is the authoritative executable schema. Generated database types follow the migrated catalog; run the official Supabase generator after local application. Preserve the first ten migrations; apply 0011–0019 forward. 0017 must commit before 0018 uses the new enum value. Hosted 0017–0019 and publication are authorized in this session but remain unapplied until connection/execution is verified; never reset production to upgrade.

| Group        | Relations and intent                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity     | profiles, organizations, organization_members; owner/technical_director/head_coach/assistant_coach/analyst/viewer                              |
| Competition  | teams, seasons, competitions, players, team_players, matches, match_roster                                                                     |
| Video        | videos, analysis_sessions, video_clock_segments; video identity and independent period-clock mapping                                           |
| Analysis     | possessions, events, event_participants, tags/event_tags; numerical and phase context                                                          |
| Tactics      | tactical_terms, possession_tactics; standard global vocabulary and organization extensions                                                     |
| Shooting/GK  | shot_attempts and legacy_shot_reviews; one attempt, attribution, result, court/goal placement, distance, shot type, rebound, fast-break origin |
| Lineups      | starting roster, on_court_intervals and substitutions; actual position, verified duration and atomic exchange                                  |
| Board        | tactic_documents, tactic_frames, tactic_objects, tactic_frame_objects, tactic_animations                                                       |
| Telestration | video_annotations; timed normalized objects and pause-on-entry                                                                                 |
| Evidence     | clips/clip_events, insights, evidence_links with real FKs                                                                                      |
| Delivery     | playlists/playlist_items, reports, presentations/presentation_items                                                                            |
| Contracts    | metric_definitions, tagging_templates, revision columns and sync_receipts                                                                      |

Core lookup indexes cover organization, match/session, video ranges, player attribution, interval overlap, frame ordering and both directions of evidence links. Composite FKs, checks, exclusions and context triggers enforce consistency beyond RLS.

## Taxonomy

Separate phase, formation, attacking action, defensive system, defensive behavior, numerical context and shot type. Seeded concepts cover positional/fast/second-wave attack and return defense; 6v6/7v6/two pivots; cross/double cross/screens/pivot cooperation/wing entry/position exchange/isolation/breakthrough/overload; 6:0/5:1/3:2:1/4:2/3:3/man/mixed; stepping out/cover/switch/help/retreat/press; jump/standing/breakthrough/wing/pivot/7m/lob shots.

Codes and IDs stay stable across languages. Staff add organization terms; used terms are archived. Legacy attack_system/defense_system fields are retained for compatibility and do not automatically acquire richer meaning.

## Canonical calculations

- Shot efficiency: goals / reviewed known-result attempts. A shot and its outcome never count twice.
- GK save percentage: saves / (saves + goals faced), excluding misses, blocks, empty goals and unresolved attribution.
- Position splits: recorded on-court position/shot position; unknown assignment is visible, not inferred from a player's permanent profile.
- Assists, turnovers, zone-specific efficiency and verified minutes use documented observations. A zero denominator or open/unverified playing interval is unknown.
- Default aggregate analytics use one primary analysis per match. Other sessions remain editable and can be explicitly made primary.
- Tendencies are deterministic observed frequencies with evidence and sample counts; they are not causal or AI predictions.

## Professional analysis workflow

Online sources store a validated immutable YouTube ID, not a fake fingerprint or unchecked URL. Loading the player requires the user's scoped privacy/terms choice, cleared on sign-out. The original player retains branding/controls/ads. Tagging reads its current source time directly; duration changes block new events for review. Seeks depend on keyframes and require internet. No download/proxy/frame extraction or telestration overlays on that player. Native and online versions have different sessions, anchors and clip references; never copy their timestamps implicitly. Clips play source-time intervals through the same player in meetings. `/privacy` explains account/draft/media handling and external services.

Setup → link source → roster → clock segments → possession → tactical action → player action → outcome → score/numerical context → review → filter → evidence clip → tactic/insight → playlist/meeting/report.

Quick tagging uses configurable buttons and pre/post roll, keyboard play/pause/seek/tag/undo/redo, and durable local saves. Shot and goalkeeper details remain correctable. Clock calibration accounts for period resets, stopped clocks and missing footage. Substitutions preserve half-open intervals and roster membership. Clips reference source timestamps; no rendering/transcoding is required.

## Drawing and presentation

Tactical object identities persist across frames, allowing interpolation of player/ball positions and paths. Geometry uses normalized coordinates. Video annotations occupy explicit source-time windows and can pause on entry. Meetings mix clips, boards, insights and text in a stable order; speaker notes stay out of presentation mode. Missing local media requests relinking; shared R2 media is fetched via an authenticated signed read URL.

Reports filter the primary analysis by match/team/player, show reviewed and pending sample counts, retain saved coach notes after asynchronous loading/reopening, and expose source-event evidence. CSV preserves observation IDs, video time, period and independent match-clock time; missing values remain blank. Arabic browser printing hides editing/navigation controls. Spreadsheet formula prefixes are escaped in text exports.

## Security and sync

All organization data is protected by explicit grants and operation-specific RLS. Every member sees their organization's teams; viewer is read-only. Team management: owner/TD/head coach; seasons/competitions: owner/TD; analysis and coaching documents: staff; deleting matches: owner/TD/head coach. Onboarding is one RPC. No ordinary user operation bypasses RLS.

Local caches and outbox operations are keyed by user and organization. Local save + queued mutation are atomic. Stable operation UUIDs, expected revisions and server receipts make retries idempotent. Conflicts preserve both versions and require an explicit resolution. Backups can only be restored into the matching account/org; signing out removes visible access.

Only an already prepared workspace supports continued offline recording/playback. New routes, initial login and setup require connectivity; there is no full-app service worker guarantee.

## Zero-cost boundaries and deployment

R2 is opt-in. Video uploads directly from browser to a private bucket; a server route signs short-lived URLs after RLS authorization and reserves organization quota. Finalization checks uploaded size. Configure CORS for the exact application origin (PUT/GET/HEAD, Content-Type, range reads) and server-only R2 credentials. Default organization allocation is 1 GiB; administrators must also budget the sum of organizations and control the R2 account. Free allocations are finite; storage/operations exceeding them may incur charges at the provider.

No paid video platform, microservice, ORM, Redis, Kafka, cloud transcoding, mandatory LLM, full-match CV, medical/GPS/ERP or recruitment marketplace. No account deployment is performed by this deliverable.

## Validation and deliverables

See VALIDATION.md for actual commands/results, including the distinction between a PostgreSQL/WASM Auth shim and real Supabase. Tests cover metrics, time, local atomicity/isolation, new/upgrade schema, permissions, context consistency, overlap constraints, substitutions and CAS/retries. Browser checks exercise implemented workflows; external cloud checks require configured accounts.

Deliver source-only ZIP, matching standalone Blueprint, SHA256, CHANGELOG and validation record. Exclude dependencies, secrets and build output. See PHASES.md for gates and FIRST_CODEX_PROMPT.md for continuation.

## Additional foundation details

Migrations 0011–0016 add coaching models, integrity/RLS, revision sync, ordering, optional sharing reservations and tactical analytics. 0017–0019 add online source identity and source-duration/evidence checks. Existing legacy rows are preserved for review. Supabase clients use catalog-generated types, function contracts and relationships. Position metrics use the position recorded at the observation. The rail adds reviewed shot-origin shares, missing-location counts and goalkeeper sample denominators; all open source observations. Board edits autosave to the outbox. Native media must be relinked after reopening; online media needs internet. Meetings open insight evidence directly.

See ZERO_COST_LIMITS.md for finite free-plan quotas and VALIDATION.md for measured verification. This delivery contains source and instructions; it does not provision or deploy accounts.
