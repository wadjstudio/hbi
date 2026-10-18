# SESEN analysis workspace

October 15 measured composition: summary cards fit at approximately 744–936px inside 1672×941 using linked footage and explicitly synthetic observations (reference starts near 735px). Layout/session controls occupy a native video-header disclosure; keep keyboard/mouse/touch dismissal and player identity/time intact. This acceptance establishes first-screen visibility; remaining reference details still require audit.

## Authority and visual target

The user's final SESEN handball workstation image is the visual target. It takes
precedence over generic dashboard or marketing-page templates. The product is
the authenticated Next application; a standalone mock-up is not completion.

Use the existing cyan/gold SESEN tokens and assets under `public/brand` (provenance
in `brand/BRAND.md`). Keep the graphite surface, thin teal borders, restrained
gold active navigation, consistent Lucide icons and neutral identity placeholders.
Do not substitute invented players, team crests, league averages or match scores.

## Composition

- Typography: self-host Roboto Condensed for English/numbers and IBM Plex Sans Arabic for Arabic, with existing system fallbacks. Use 16px primary navigation, 19px intelligence heading, 14px card/tab headings and 12px sample text; preserve clear numeric columns with tabular figures. Keep full OFL notices and font provenance. Inspect actual loaded-font states in both languages before accepting fit; do not pass geometry checks through clipped labels or smaller unreadable text.
- Desktop: approximately 195px navigation, compact match header, resizable
  58/42 video/intelligence split, timeline and recording controls under the video.
  Fit workspace bounds the desktop media plane to viewport height inside a matte;
  it preserves the source aspect and overlay coordinates. The natural-size toggle
  and focus mode remain available. Narrow screens use the natural full-width plane.
- Intelligence: two columns of defensive systems/threat profile, shot map/players,
  tactical patterns/evidence-backed insights. Goalkeeper detail remains available
  through a labelled disclosure. Narrow panels reflow to one column.
  At pane widths of at least 570px, use alternating 45/55 proportions matching the reference: defense/patterns/players narrower, threat/map/insights wider. Below 570px retain equal or single-column cards and place the shot-zone legend below its full-width map in two columns; pane width, not viewport alone, controls this behavior.
- Five evidence-linked summary cards follow the analysis tabs. Setup should not
  dominate the first screen; expand sources, calibration, recording context and
  detailed evidence on demand. Never crop controls or overlay essential content.
- Player cards use three rail/four lower highlights and a complete scoped native-modal list. Preserve full wrapped names, pending-only identity access and separate reviewed-rate evidence; keep original row/chart/control dimensions and mobile44px targets.
- Small screens stack the workspace, retain labelled controls and use the modal
  navigation drawer. Arabic RTL and English LTR remain supported. Video coordinates
  and the chronological timeline retain their physical direction.

## Interaction and data

- Maintain keyboard panel resizing, focus mode, accessible tab navigation,
  visible focus, reduced motion and Escape/focus return from navigation.
- Timeline starts with events; possessions/clips have an explicit expanded-state
  button. Radar region breakdown remains reachable through its disclosure.
- Distinguish match result, video time, game clock and tagged session statistics.
- Insight cards surface saved insights with directly linked events in the current
  view, retaining review status. Opening evidence must respect the current event
  filter. An insight's original title may describe a larger saved sample.
- Null measurements stay unknown; no fabricated traces, heatmaps, comparative
  baselines or implied automatic tactical analysis.
- Trend points are actual cumulative reviewed samples, with exact supporting
  evidence on click or keyboard activation. Turnover maps use recorded normalized
  positions; missing coordinates remain missing. Recent form uses team-relative
  match scores independently of tagged session statistics.
- The intelligence header offers current-session/3/5/10 scope. Historical coverage
  is anchored to the open match date and one unambiguous primary per match. Keep
  timeline/lower-card scope explicit. Evidence identifies the actual source and
  supports its review/edit/relink/clip flow, including same-match session changes.

## Acceptance still required for final visual parity

Review real footage and populated, explicitly test-only event fixtures at
1672×941, 1440px, 1024px, 768px and 375px. Inspect desktop and Arabic/mobile
screenshots, not just passing DOM assertions. Verify evidence links, setting
disclosures, recording, offline behavior and presentation remain usable.

Populated charts and historical source-aware journeys have deterministic browser
acceptance, with clearly synthetic statistics and actual bounded footage where
available. This is not pixel parity or completion of the automatic analysis engine.
The populated first-screen summary now fits the accepted viewport close to the
reference. Remaining header/navigation/interaction details still need a full
comparison against the original image; geometry alone is not goal completion.
