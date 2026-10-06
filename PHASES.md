# HBI V1 phases and acceptance gates

The October 7 console iteration adds a resizable video/evidence split, focus/reset controls, keyboard-accessible tabs and five evidence-driven summary cards. Acceptance requires the complete native-video and online-source journeys, RTL/narrow-screen checks and both production builds. Hosted 0017–0019 and publication are authorized by the user; authorization alone is not evidence of execution. Record actual migration/deployment results in VALIDATION.md.

Online-analysis continuation: source/session identities, IFrame-API transport, direct controller timing, source-bound clips, offline guards, scoped player consent, a shot-origin profile and goalkeeper side cards are implemented locally. The published site remains on its preceding workbench until migrations 0017–0019 are applied and the new bundle deployed. Live official-player behavior, unavailable/changed broadcasts and a fully tagged real match remain operational gates; passing the mock API contract is not a claim of live verification.

October 6 iteration: production components now include the match hub, verified real-match reference, match context, video transport, zoomable timeline lanes, compact tagging controls, session intelligence and an evidence-to-meeting dialog. This is a usable workbench iteration, not evidence that feature parity with established analysis platforms is complete. Further gates include a fully tagged real match, real multi-analyst use, annotation/board refinement and measured long-video performance. Keep detailed acceptance outcomes in VALIDATION.md.

1. Foundation: dependency lock, deployment adapter, typed domain, permissions, forward migrations. Gate: clean/upgrade SQL, isolation, relational constraints and both builds.
2. Match workflow: setup, roster, local video, clock calibration, possessions, tagging, canonical shots, on-court intervals/substitutions, outbox and backups. Gate: interrupted recording survives; retries do not duplicate; concurrent edits conflict visibly.
3. Coaching tools: goalkeeper/player/opponent analytics, sample sizes, evidence links, tactical documents/frames/objects/animations and video telestration. Gate: metrics reproduce source observations; coordinates survive resizing; every insight has inspectable evidence.
4. Presentation: clips, playlists, ordered meetings, speaker notes, reports/CSV/browser PDF and optional R2 sharing. Gate: relink sources, play sequences, handle missing sources, preserve saved report notes, export the filtered primary sample with separate clocks, print Arabic evidence, enforce roles/quotas and sign short-lived URLs.

All four stages have implementation in this starter update. Completion of operational deployment additionally requires configured Supabase Auth and a real R2 bucket if sharing is enabled. See VALIDATION.md for verification actually performed; implementations and verification status must remain distinct.

Future, optional: richer position-specific indicators after extending event collection, measured performance optimization and AI phrasing of already calculated data. Core workflows always work with AI disabled. Full offline app navigation, automatic computer vision, cloud transcoding, broadcast, GPS/medical/ERP and recruitment marketplace remain outside V1.

Implementation and verification must be assessed separately. Read VALIDATION.md and ZERO_COST_LIMITS.md; preserve migrations 0001–0010 and the generated database contracts. Use features/workspace for queries/sync and components/workspace for UI composition.

Deployment gate: Pages build, local SSR/assets and real organization loading; then separately approve Pages access, verify live HTTPS, add its custom domain and only the external `hbi` CNAME. DNS remains at Spaceship. Live CPU/quotas, multi-user isolation, token expiry and R2 require their own verification.
