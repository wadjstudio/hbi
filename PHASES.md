# HBI V1 phases and acceptance gates

1. Foundation: dependency lock, deployment adapter, typed domain, permissions, forward migrations. Gate: clean/upgrade SQL, isolation, relational constraints and both builds.
2. Match workflow: setup, roster, local video, clock calibration, possessions, tagging, canonical shots, on-court intervals/substitutions, outbox and backups. Gate: interrupted recording survives; retries do not duplicate; concurrent edits conflict visibly.
3. Coaching tools: goalkeeper/player/opponent analytics, sample sizes, evidence links, tactical documents/frames/objects/animations and video telestration. Gate: metrics reproduce source observations; coordinates survive resizing; every insight has inspectable evidence.
4. Presentation: clips, playlists, ordered meetings, speaker notes, reports/CSV/browser PDF and optional R2 sharing. Gate: relink sources, play sequences, handle missing sources, preserve saved report notes, export the filtered primary sample with separate clocks, print Arabic evidence, enforce roles/quotas and sign short-lived URLs.

All four stages have implementation in this starter update. Completion of operational deployment additionally requires configured Supabase Auth and a real R2 bucket if sharing is enabled. See VALIDATION.md for verification actually performed; implementations and verification status must remain distinct.

Future, optional: richer position-specific indicators after extending event collection, measured performance optimization and AI phrasing of already calculated data. Core workflows always work with AI disabled. Full offline app navigation, automatic computer vision, cloud transcoding, broadcast, GPS/medical/ERP and recruitment marketplace remain outside V1.

Implementation and verification must be assessed separately. Read VALIDATION.md and ZERO_COST_LIMITS.md; preserve migrations 0001–0010 and the generated database contracts. Use features/workspace for queries/sync and components/workspace for UI composition.
