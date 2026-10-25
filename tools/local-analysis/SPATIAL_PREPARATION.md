# Unreviewed spatial preparation

This optional local workflow prepares evidence for review. It does not recognize a complete match or automatically run when a coach selects a video.

Use the pinned optional `requirements-tracking.txt` environment on a disk with sufficient space. Never upload the original video automatically or install the Python packages into the web bundle.

```powershell
python prepare_tactical_sequence.py --tracking TRACKING.json --video ORIGINAL.mp4 --out NEW_PREPARATION_FOLDER
python prepare_tactical_sequence.py --tracking TRACKING.json --video ORIGINAL.mp4 --out NEW_CAMERA_FOLDER --seeds SEEDS.json
node scripts/extract-tactics.mjs TRACKING.json NEW_PROPOSALS.json NEW_CAMERA_FOLDER/preparation.json
```

Run the first two commands from `tools/local-analysis`, and the last from the app root. Outputs must be new paths. The producer verifies full source SHA256, size, geometry/duration and the bounded nominal sample grid; decoded frame count must match. Import `preparation.json` through Automatic analysis after importing its bound tracking sample. Back up using Export tracking corrections. A proposal export is a separate evidence report.

## What is estimated

Visible red/white/green/cyan torso patches supply provisional kit groups, independently per frame. Other people mask occluded patch pixels; inadequate visible support remains unknown. No colour/identity is carried across missing observations. Groups may include staff/bench and never constitute a lineup or athlete identity.

Optional `sesen.camera-seeds.v1` input binds the original source digest and exact decoded-frame digest. Each seed supplies `frame_index`, `scene`, `image_sha256`, four normalized image points, their four 40×20 m court points, a normalized floor polygon and status `unreviewed` (see the producer's validation for exact field names). Landmark estimates are not validated merely because JSON or reprojection checks pass. Without a seed, court points stay null.

Optical flow uses floor features outside person boxes, forward/backward checks, held-out points and bounded RANSAC quality. Scene cuts and quality failures clear calibration until a new seed. Points outside the floor or court, clipped feet and unsafe projective geometry stay null; coordinates are not clamped. Camera-flow quality cannot establish that seed landmarks are metrically correct.

The browser validates source/model identity, every frame/time/scene/observed track, kit mapping and calibration ancestry. It does not load referenced frame JPEGs or independently re-hash their bytes. Current producer output is based on uncorrected boxes; importing it with nonempty box corrections is rejected. Editing a box clears preparation/decisions explicitly. Export prior review notes before editing if retention matters.

## Rules and limits

An estimated near-goal block requires 4–7 same-group observations, 5.5–9 m from the goal mouth, at least 4 m lateral span, at most 5 m depth spread and two continuous seconds. More than ten accumulated IDs, missing geometry/groups or scene changes break a run. These are initial engineering thresholds, not handball definitions or validated classifiers. The cue explicitly retains `unreviewed_camera_and_kits`; it does not assign a formation, possession, role or outcome. Reviewed 6:0/5:1 rules keep their separate complete-outfield/team/phase/ground prerequisites.

No pass, shot, foul, screen, possession, score or tactical success is inferred. No canonical event, shot, insight or metric is written. Two real one-minute samples returned zero eligible proposals. Useful automatic tactics requires better evidence continuity and independent coach-labelled evaluation; full-match throughput and recognition accuracy remain unmeasured.
