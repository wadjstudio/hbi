# SESEN workstation reference audit — 16 October 2026

Target: the user's final SESEN workstation image, 1672×941. The screenshot is a visual/interaction target, not an authoritative source of match observations. Never seed its percentages, player portraits, score clock or tactical conclusions as analyzed data.

| Reference region | Current implementation and inspected evidence | Remaining gate |
| --- | --- | --- |
| SESEN logo, gold/cyan/graphite shell, athlete mural | Shipped brand assets and shell; populated desktop screenshot inspected after the statistics tabs revision | Compare exact scale, spacing, texture and contrast again after header/typography changes |
| Competition/round/date/venue | Match header uses saved match metadata; synthetic capture is labelled as fixture data | Improve hierarchy to the reference while retaining truthful missing metadata |
| Teams, result and match clock | Header result and calibrated source clock are separate; real footage retains its aspect | Audit live/recorded score wording and narrow layout with real populated metadata |
| Analysis / Presentation | Existing analysis/meeting navigation is functional | Match reference labels and preserve the active match/session into presentation entry |
| Share, notification, coach identity | Current header exposes sync/language/settings; it does not reproduce the reference coach/share group | Implement useful scoped actions and actual signed-in identity; no invented coach photo, notifications or sharing state |
| Video, transport, layout | Native local/online source modes, keyboard-safe controls, fit/focus/resizing retain the mounted media; Chrome acceptance passed | Compare typography/control density with the reference; online player restrictions remain visible |
| Event timeline and chips | Actual event markers plus canonical-result, shot, award, suspension, transition, coded-defense and recorded-numerical filters | Inspect missing-context/long-match density and label hierarchy; no fabricated event distribution |
| Nine quick-tag controls | Phase changes are separate from event writes; Goal/Save each create one attempt; award/suspension meanings are explicit | Recheck text/icon sizes at final typography; retain context/player selection and undo/redo |
| Historical intelligence scope | This session / Last 3/5/10 uses one unambiguous primary session per match; source-aware evidence acceptance passed | Reference styling and metadata hierarchy; missing coverage must remain visible |
| Defense and threat cards | Recorded descriptors and reviewed shot origins, with sample/method disclosures | The reference's league comparison needs an actual compatible dataset; never invent its second series |
| Shot map | Canonical coordinates; missing locations are excluded explicitly | Density/heat rendering may use only real measured locations, with evidence selection retained |
| Key players | Sample rows and neutral number avatars; observed identity/efficiency | Use approved actual roster portraits if available; refine the row layout without fake athletes |
| Tactical tendencies and insights | Recorded possession descriptors and evidence-linked rules/reviewable insights | Match the reference hierarchy; automatic tactical understanding remains a separate unfinished engine |
| Main tab sequence | Analytics, Lineups, Events, Player stats, Team stats, Comparison, Reports, plus retained annotation/review tools | New views have behavior tests; capture/inspect each populated view at desktop and mobile |
| Player / keeper metrics | Canonical reviewed attempts, keeper goal/save denominator, observed match positions, verified interval minutes | Per-cell evidence/interval drill-down and visual refinement remain to be audited; aggregate player evidence alone is not proof of every metric interaction |
| Team / comparison / report views | Current organization/match/session and filters; exact team-metric evidence; CSV stable IDs/raw time; report-only print acceptance | Inspect exported PDF pagination and richer coach-facing report composition |
| Five lower cards | Evidence-linked shot/possession trends, player samples, recorded turnover positions and team-relative results | Keep methods/sample gaps readable. Current accepted summary bounds: 741.52–932.98px at 1672×941 |
| Arabic/mobile/keyboard | Existing console acceptance covers RTL, responsive layout, focus and menu behavior | Complete per-view mobile/RTL inspection for all newly added content; match reference typography at desktop |

The visual goal remains active. Passing existing geometry and behavior tests proves only their stated scope. Finish the missing regions, inspect actual rendered states, and repeat a complete requirement-by-requirement audit before claiming reference parity.

Deployment state is authoritative only when re-read from the repository/Pages metadata. DEPLOYMENT.md records the merged migration/storage-hardening release; current source also retains the subsequently merged transient-sync fixes. Documentation changes and Git pushes do not deploy code by themselves.
