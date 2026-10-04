# HBI Architecture

## Runtime and boundaries

Browser: React UI, native video, normalized SVG drawing, Dexie drafts/outbox, explicit direct R2 upload. Next/vinext on Cloudflare: authentication boundary and routes requiring R2 secrets. Supabase: Auth, PostgreSQL, Data API, RLS and analytical RPCs. One application; no Prisma, Drizzle, microservices, Redis, Kafka or transcoding.

`features/` owns domain behavior; `components/workspace/` composes interactive workflows; `lib/analytics` owns pure metric functions; `lib/video` owns media/time utilities; `lib/local` owns durable browser storage; `lib/permissions` mirrors allowed UI actions. `stores/` is reserved for transient state, not business truth. UI code receives data through the workspace provider and does not use a service role.

## Domain

Organization → teams/seasons/competitions/players → match/roster → videos/analysis sessions → clock segments, possessions, tactical assignments, events, canonical shot attempts, substitutions/on-court intervals.

Coaching documents: tactic document → ordered frames + stable object identities → frame-object geometry + timed transitions. Annotations reference a video/session and a half-open playback interval. Evidence links have typed foreign keys to insights/events/shots/clips/tactics. Presentations contain ordered clips, tactics, insights or text with speaker notes.

## Authoritative contracts

SQL migrations are authoritative for persistence, constraints, grants, RLS and indexes. The generated database types originate from the migrated PostgreSQL catalog; `pnpm db:types` regenerates official Supabase types when local Supabase is available. Zod validates browser records, backup structure, normalized drawings and route inputs. JSON is restricted to flexible geometry, presentation/report content and button templates; identity and analytical context use columns/FKs.

Organization identity and parent context are immutable. Composite FKs enforce organization consistency. Context triggers cover match/session/video and child-document compatibility. Deletes cascade where existing domain FKs prescribe it; referenced taxonomy terms are archived, not deleted.

## Time and metrics

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

`features/workspace/provider.tsx` owns loading, scoping, local transactions and synchronization. `features/analysis/contracts.ts` validates operations against generated database types; `features/players/position-metrics.ts` computes match-position metrics with source event IDs. The component provider is a compatibility re-export. Local media URLs are scoped to the authenticated workspace and released at sign-out/workspace changes; binaries never enter drafts/backups.

`get_tactical_distribution` and `v_tactical_observations` are the canonical taxonomy analytics. Defensive terms attribute an attacking possession to the opposite/defending match team; labels and custom terms retain their stable IDs. The old enum-based defense RPC remains a legacy compatibility interface. Multiple behavioral descriptors can overlap; their shares need not sum to one.

Both Next and vinext generate route metadata. `typecheck` regenerates Next route types first; run the two production builds sequentially. Neither a successful build nor local tests verify deployment CPU time or a real account's quotas.

`features/reports/export.ts` exports the report's filtered primary-session observations with stable IDs and separate video/period clocks. UTF-8 CSV quotes embedded delimiters/newlines and neutralizes spreadsheet formula prefixes. Report notes fall back to the asynchronously loaded record until edited; saving preserves other report content. Browser print CSS hides navigation/edit controls and retains Arabic notes and event evidence.

An open report draft captures its original row/revision; refreshing other analysts' records must not silently rebase it. Locale persistence waits for the saved preference to be read, including repeated React development initialization.
