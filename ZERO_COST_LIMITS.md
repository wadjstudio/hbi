# Zero-Cost V1 limits

Reviewed 2026-10-02 against the linked official documentation. Quotas can change; verify them before provisioning.

| Service | Free allowance relevant to HBI | V1 behavior |
| --- | --- | --- |
| Supabase | 500 MB database/project; 5 GB uncached egress; 1 GB file storage; 50,000 MAU | Stores structured observations and metadata; video stays local. Free projects can pause after inactivity. [Billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [plan limits](https://supabase.com/pricing) |
| Cloudflare Workers | 100,000 requests/day; 10 ms CPU/request; 128 MB memory; 64 MiB uncompressed bundle; one-second startup | One Worker for the app and optional signing routes. Build/dry-run size does not measure production CPU/startup. [Limits](https://developers.cloudflare.com/workers/platform/limits/) |
| R2 Standard, optional | 10 GB-month storage; 1M Class A and 10M Class B operations/month; Internet egress free | Explicit uploads, temporary reads and configurable per-organization reservation limit, default 1 GiB. Usage exceeding free allowances can be billed. [Pricing](https://developers.cloudflare.com/r2/pricing/) |
| Local device | Available disk and browser IndexedDB quota vary | Draft JSON/outbox only in IndexedDB; export backups. Video binaries remain in files selected by the user. |

Core analysis requires no R2, paid AI, transcoding or paid backend. Supabase/Cloudflare must remain on their free plans within quotas; local development is also supported. The R2 reservation limit is not a global billing cap: untracked bucket objects, old uploads, other organizations and other products also consume account quota. Allocate an account-wide budget before enabling it; leave credentials unset when sharing is unnecessary. HBI never upgrades an account or starts an automatic paid service.

Current limits do not establish that every workload fits the free plan. Measure actual deployment CPU, startup, egress and storage; optimize client-side work and bounded queries before changing the agreed architecture. No deployment has been performed by this delivery.
