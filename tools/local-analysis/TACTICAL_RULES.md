# Local tactical proposals

Continuity diagnostics (2026-10-26): proposal results and exports now retain current-sample observed/usable box counts, comparable-pair frame coverage, scene cuts, interrupted pair runs, fixed-window resets, observed order reversals and reviewed versus estimated court-frame counts. The workstation exposes them in a disclosure. Counts come from the same motion-rule pass; they are not model accuracy, athlete identities or confirmed match events. A missing/geometry interruption combines missing tracks, hidden/clipped feet and depth/scale gates; it does not prove a specific occlusion cause. No rule thresholds or proposal IDs changed.

Update 2026-10-25: optional unreviewed kit/camera preparation and estimated near-goal grouping are described in [SPATIAL_PREPARATION.md](SPATIAL_PREPARATION.md). These estimates never satisfy the reviewed-ground prerequisites below. A second real 70:10–71:10 source sample also returned zero eligible proposals; no action accuracy is claimed.

The Automatic analysis tab runs `features/analysis/tactical-proposals.ts` on imported tracking. The browser and optional batch script share the exact rule implementation. No cloud inference, API key, new model download or SQL migration is required. Selecting the video alone still does not run the detector.

## Implemented rules

- **Possible path crossing:** two scene-local tracks reverse their relative horizontal order, approach within 0.025 image widths, separate by at least 0.04 widths and remain continuously observed for 0.6–4 seconds. Comparable foot depth/scale and detector support of at least 0.5 are required. Common horizontal translation alone cannot reverse the order. Cuts, missing observations, hidden/invalid feet and crowd views break the run. Camera rotation, identity switches, officials and opponents can still cause false positives. This is a visual cue, not an identified attacking cross or ball exchange.
- **Possible 6:0 / 5:1 shape:** requires imported, explicitly reviewed per-frame court evidence. Six outfield defenders must satisfy the shape continuously for at least two seconds. The 6:0 rule requires all six at 5.5–8.5 m from the goal mouth; 5:1 requires five in that band and one at 9.5–12 m. These are initial engineering thresholds, not official definitions or validated classifiers. The three-metre goal mouth lies at y=8.5–11.5 on a 40×20 m court. Goalkeepers are excluded; direction changes split evidence.

Vocabulary references: [IHF booklet](https://www.ihf.info/sites/default/files/2020-03/H%40S_Booklet.pdf), [EHF teaching videos](https://activitiesarchive.eurohandball.com/teaching-videos/basic-handball). These sources do not validate our thresholds. No possession, pass, shot, foul, screen, athlete identity or tactical success is inferred.

## Review and evidence

Each proposal retains rule version, source-video interval, scene, exact frame indices and temporary track IDs. Proposal exports also retain the tracking-model digest and exact correction/ground evidence basis. Evidence controls seek the linked local video. Percentages describe detector support or rule satisfaction, never calibrated probability. Results are capped at 200 with truncation disclosed. Coach review/rejection and notes stay in the existing account/org/session/video-scoped IndexedDB row and never create canonical events, shots, insights or statistics.

Export tracking corrections to back up the report, corrections, optional ground evidence and decisions. Export proposals and evidence is a separate report, not a workspace backup or confirmed-event import. Old tracking backups remain readable. Older strict-schema app versions reject the new optional `tactics` field; use the current app for these backups.

Editing a track box explicitly clears tactical calibration and decisions because the evidence changed. Export the tracking review first when retaining prior notes matters. Replacing saved tactical evidence is refused until the coach uses the explicit clear action. Reimports never overwrite saved reviews silently.

## Reviewed court preparation input

`sesen.tactical-ground.v1` is a preparation input, not an output the current detector already produces:

- `source_sha256` and `model_sha256` match the bound report.
- Optional `corrections` is the exact tracking-corrections snapshot used during calibration (including notes), or omitted for an unedited report. The current corrections must match this basis. A coach can recalibrate corrected boxes; hidden observations cannot supply ground evidence.
- Strictly increasing `frames` reference exact `frame_index` and `scene` values.
- Each frame has a distinct `calibration_id`; `calibration_reviewed`, `teams_reviewed` and `outfield_complete` are true. `phase` is `set_defense`, `defending_team` is A/B and `goal_x` is 0/40.
- `persons` reference observed IDs in that frame without duplicates. Each has `team` A/B, `role` outfield/goalkeeper, `ground_contact_reviewed: true` and finite `x_m`/`y_m` in the 40×20 court. A/B are reviewed groups, not roster identities.

Human/producer review remains responsible for landmark correctness, ground contact, camera motion and completeness. Valid JSON is not proof of correct calibration. This release validates source/frame links and bounds; it does not generate reviewed teams or automatically calibrate the match. Evidence tied to edited boxes is rejected. Missing frame evidence breaks shape runs; a homography must not be copied across camera motion.

## Batch extraction

From the app folder after installing frozen dependencies:

```powershell
node scripts/extract-tactics.mjs TRACKING_OR_REVIEW.json NEW_OUTPUT.json
node scripts/extract-tactics.mjs TRACKING_OR_REVIEW.json NEW_OUTPUT.json REVIEWED_GROUND.json
```

The script uses the existing Wrangler-bundled esbuild, cleans only its own temporary folder, bounds input sizes and refuses to overwrite output. It does not re-decode/re-hash the video; use the full-source-verified tracking exporter first and relink the video in the workstation.

## Actual-match result

The supplied 600-frame / 8563-proposal source-video 35:00–36:00 sample produced **zero eligible proposals**. Defensive extraction is unavailable because reviewed ground/team evidence is absent. This does not mean the match contains no tactics or crossings. No thresholds were relaxed to manufacture detections.

Next gate: prepare reviewed ground/team evidence on a representative real sequence, assess identity continuity and compare extracted shapes/actions with coach labels. Automatic court/team preparation, ball tracking, possession/action recognition, precision/recall evaluation and full-match batch processing remain unfinished.
