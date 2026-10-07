# SESEN / HBI Architecture

## Identity and presentation

`lib/brand.ts` centralizes asset paths and semantic chart colors; `components/brand` renders lockups, decorative marks and visibly neutral player avatars. `app/sesen.css` maps the supplied kit palette onto existing tokens and owns final chrome/responsive presentation. User-requested generated masters in `brand/masters` reproduce the reference identity as raster assets; `scripts/build-brand-assets.mjs` exports deterministic icons/WebP/social images with the existing Next sharp dependency. No runtime image generation or new package is involved. `brand/kit-assets.json` records imported SVG source hashes.

MatchContext portals into the shell's stable header slot without moving media DOM nodes. The modal mobile navigation uses native dialog focus handling. Public static `/brand/*`, `/favicon.ico` and `/manifest.webmanifest` bypass the Pages server. No authenticated HTML is cached for installation; user/org drafts, auth and all HBI persistent identifiers retain their original boundaries. Manifest presentation alone is not full offline app support.

## Runtime and boundaries

For external authoritative DNS, `build:pages` packages the existing vinext server as one Pages advanced-mode `_worker.js` alongside client assets. `_routes.json` bypasses SSR for static files. This is the same application and database. Public Supabase configuration comes from the build environment; secrets are excluded from generated public variables. Worker Custom Domains are optional for active Cloudflare zones.

Browser: React UI, native video, normalized SVG drawing, Dexie drafts/outbox, explicit direct R2 upload. Next/vinext on Cloudflare: authentication boundary and routes requiring R2 secrets. Supabase: Auth, PostgreSQL, Data API, RLS and analytical RPCs. One application; no Prisma, Drizzle, microservices, Redis, Kafka or transcoding.

`features/` owns domain behavior; `components/workspace/` composes interactive workflows; `lib/analytics` owns pure metric functions; `lib/video` owns media/time utilities; `lib/local` owns durable browser storage; `lib/permissions` mirrors allowed UI actions. `stores/` is reserved for transient state, not business truth. UI code receives data through the workspace provider and does not use a service role.

## Experimental local inference boundary

`tools/local-analysis` is an optional local Python/FFmpeg/ONNX pilot, outside the Next/Cloudflare runtime. It outputs immutable source-bound observations and review-only candidate intervals, plus a bounded generic person-track overlay video. Model checksums are pinned; original video bytes stay local. The standalone review page checks source identity and exports decisions without any database write. It is not yet connected to the authenticated event/outbox path. A future import must validate user/organization/match/video/session, require explicit event review and preserve model/provenance/confidence separately from canonical attempts. Neither score changes nor temporary track IDs establish goals or player identities. No new backend service or schema is introduced by this pilot.

## Domain

Organization → teams/seasons/competitions/players → match/roster → videos/analysis sessions → clock segments, possessions, tactical assignments, events, canonical shot attempts, substitutions/on-court intervals.

Coaching documents: tactic document → ordered frames + stable object identities → frame-object geometry + timed transitions. Annotations reference a video/session and a half-open playback interval. Evidence links have typed foreign keys to insights/events/shots/clips/tactics. Presentations contain ordered clips, tactics, insights or text with speaker notes.

## Authoritative contracts

SQL migrations are authoritative for persistence, constraints, grants, RLS and indexes. The generated database types originate from the migrated PostgreSQL catalog; `pnpm db:types` regenerates official Supabase types when local Supabase is available. Zod validates browser records, backup structure, normalized drawings and route inputs. JSON is restricted to flexible geometry, presentation/report content and button templates; identity and analytical context use columns/FKs.

Organization identity and parent context are immutable. Composite FKs enforce organization consistency. Context triggers cover match/session/video and child-document compatibility. Deletes cascade where existing domain FKs prescribe it; referenced taxonomy terms are archived, not deleted.

## Time and metrics

0017 commits the `youtube` storage enum before 0018 uses it. 0018 adds a validated immutable 11-character source ID and per-organization/match/source uniqueness. `features/video/source.ts` owns parsing/contracts and retry-safe IDs; the normal provider/outbox/RLS remains the write path. `lib/video/youtube.ts` loads the official IFrame API; `YouTubePlayerView` manages its lifecycle. Native/online media share transport callbacks. Tags read the controller time directly, independent of UI polling. Local and online recordings always have distinct identities/sessions.

0019 validates new/edited events, possessions and clock spans against known source duration, and requires an event/shot evidence clip to use its analysis video. It does not rewrite legacy rows: older inconsistent links/times require review. Online duration comes from the player; a changed duration blocks new tags. No overlay, download, proxy or frame extraction modifies the YouTube player; native sources retain telestration. `/privacy` explains data handling and links YouTube terms/Google privacy. `stores/media-consent.ts` holds transient scoped UI choice and clears it when source access is released.

Video milliseconds are independent of period-clock milliseconds. Non-overlapping clock segments identify period, video span, clock anchor and whether the clock runs. Unmapped footage has unknown match time. On-court intervals use [start,end); open/unverified intervals produce unknown playing minutes.

One shot_attempt per originating event. Reviewed attempts drive shot efficiency; legacy duplicate/ambiguous events require review. GK save percentage = saves/(saves+goals faced), excluding empty goals, misses and blocks. Zero denominator means unknown, never 0%. Primary analysis sessions alone feed default aggregate analytics. Tactical distributions use explicitly tagged possessions and expose sample counts; insights describe observed associations rather than causation.

## Local-first synchronization

Dexie keys include user + organization. A mutation commits the local row and its outbox operation in one transaction. Operations carry stable UUIDs, chronological order and expected revisions. PostgreSQL applies CAS writes under transaction locks and records idempotency receipts. A conflict retains server and local versions and stops dependent synchronization until resolved. Failed operations remain exportable.

Server refreshes must preserve rows with pending mutations, including changes made while a refresh is in flight. Authentication expiry stops uploads; sign-out clears visible state and requires reauthentication before accessing drafts. Local source identity uses a sampled SHA-256 fingerprint, file size and duration; it is a relinking check, not a media authenticity certificate.

Normal queued writes merge the returned authoritative row into the local cache without downloading the whole organization again. Deletions and substitution RPCs request a refresh after their dependent queue drains, to reconcile cascades and interval side effects. Use the explicit Refresh control to pull other analysts' changes; CAS still detects a concurrent edit before it can be overwritten. Organization metadata is initially cached through paginated reads; a larger deployment should measure this preparation workload.

Substitutions use one RPC to close/open intervals atomically, with per-team serialization and overlap protection. Ordered collections are reordered atomically. Primary-session switching is atomic.

## Optional sharing

R2 credentials exist only on the server. Upload/read/finalization routes authenticate users and authorize the selected video via RLS. A reservation accounts for shared bytes within the organization; uploads go directly to R2, and finalization verifies size. Configure deployment-wide allocations and R2 account controls separately: the per-organization limit does not enforce a global account budget.

## Implementation entry points

`components/workspace/analysis-split.tsx` owns transient split/focus state using `react-resizable-panels`. Responsive CSS stacks the mounted panels instead of remounting the media source. Radix Tabs supplies keyboard navigation and ARIA relationships. `features/analysis/match-dashboard.ts` computes the five-card console sample from the selected session/team/filter context; the component renders it and opens evidence through the workbench. Closed possessions with unresolved outcomes remain outside the scoring denominator. These MIT dependencies introduce no service or database write path.

`features/matches/reference-match.ts` contains verified provenance and a permission-checked metadata importer with organization-scoped retry-safe UUIDs. `features/analysis/workbench.ts` owns filters, timeline windows and possession-deduplicated tactical groups. `shot-profile.ts` groups reviewed origins and exposes missing/legacy regions. The workbench composes match hub/context, transport, timeline, tagging dock, threat profile, session rail and evidence dialog. Before a source is attached, the original broadcast preview remains available. Neither mode creates clock mappings automatically. The online extension adds no dependency or paid media service.

`features/workspace/provider.tsx` owns loading, scoping, local transactions and synchronization. `features/analysis/contracts.ts` validates operations against generated database types; `features/players/position-metrics.ts` computes match-position metrics with source event IDs. The component provider is a compatibility re-export. Local media URLs are scoped to the authenticated workspace and released at sign-out/workspace changes; binaries never enter drafts/backups.

`get_tactical_distribution` and `v_tactical_observations` are the canonical taxonomy analytics. Defensive terms attribute an attacking possession to the opposite/defending match team; labels and custom terms retain their stable IDs. The old enum-based defense RPC remains a legacy compatibility interface. Multiple behavioral descriptors can overlap; their shares need not sum to one.

Both Next and vinext generate route metadata. `typecheck` regenerates Next route types first; run the two production builds sequentially. Neither a successful build nor local tests verify deployment CPU time or a real account's quotas.

`features/reports/export.ts` exports the report's filtered primary-session observations with stable IDs and separate video/period clocks. UTF-8 CSV quotes embedded delimiters/newlines and neutralizes spreadsheet formula prefixes. Report notes fall back to the asynchronously loaded record until edited; saving preserves other report content. Browser print CSS hides navigation/edit controls and retains Arabic notes and event evidence.

An open report draft captures its original row/revision; refreshing other analysts' records must not silently rebase it. Locale persistence waits for the saved preference to be read, including repeated React development initialization.
