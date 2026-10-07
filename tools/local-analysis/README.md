# SESEN local analysis pilot

Experimental local tools, separate from the production analysis workflow. No upload, paid service, cloud worker, database migration or automatic match mutation is performed. Selecting a video in the existing web app does **not** yet invoke this engine.

The pilot implements two deliberately bounded capabilities:

- Full-source **periodic scoreboard OCR**, using a manually calibrated ON Sport 1280×720 layout, real decoded presentation timestamps and a pinned generic CRNN model. Repeat reads produce review-only score-change intervals or discontinuities. They are not confirmed goals, shot attempts, exact event times, tactical classifications or player statistics. Missing/unreliable readings remain null. Regressions do not automatically count an earlier score again.
- A **1–30 second person-track preview**, using a pinned generic YOLOX-tiny model and a one-frame IoU baseline. Track IDs are temporary, can switch/fragment, and do not identify players or teams. This is not ByteTrack. Small balls, player identity, camera calibration, reliable replay classification and tactical event recognition are not implemented.

## Local prerequisites

Python, FFmpeg/FFprobe on PATH, `numpy`, `Pillow`, `onnxruntime`. The pilot was run with Python 3.14.7 and ONNX Runtime 1.26.0 on CPU. Use a project virtual environment when installing dependencies; no Python dependencies are added to the web build. Models and user media belong outside the Git/source package. No GPU timing or complete automated tactical analysis is claimed.

Optional dependencies are pinned in `requirements.txt`. For an environment outside the source checkout:

```powershell
python -m venv ../sesen-analysis-venv
../sesen-analysis-venv/Scripts/python.exe -m pip install -r tools/local-analysis/requirements.txt
```

Use that environment's Python instead of plain `python` in the commands below. The existing web app does not need this environment.

Download the following **ONNX data files only** from the official projects; the runtime verifies their hashes before loading. No remote Python code is executed.

| Model        | Official source                                                                                                                       | SHA256                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| YOLOX-tiny   | [YOLOX release 0.1.1rc0](https://github.com/Megvii-BaseDetection/YOLOX/releases/download/0.1.1rc0/yolox_tiny.onnx)                    | `427cc366d34e27ff7a03e2899b5e3671425c262ea2291f88bb942bc1cc70b0f7` |
| CRNN English | [OpenCV Zoo model](https://github.com/opencv/opencv_zoo/blob/main/models/text_recognition_crnn/text_recognition_CRNN_EN_2021sep.onnx) | `a84b1f6e11a65c2d733cb0cc1f014aae3f99051e3f11447dc282faa678eee544` |

Both upstream directories publish Apache-2.0 licenses. The CRNN hash is independently recorded in the upstream Git LFS pointer. The YOLOX hash records the fetched official release artifact. The application package contains no model weights. Read [NOTICE.md](NOTICE.md) for provenance.

## Run from the repository root

```powershell
python tools/local-analysis/scan_scoreboard.py --video 'E:/path/match.mp4' --ocr-model 'C:/path/crnn_en.onnx' --output 'C:/path/pilot-output' --interval 5
python tools/local-analysis/build_review.py --video 'E:/path/match.mp4' --analysis 'C:/path/pilot-output/scoreboard-analysis.json'
python tools/local-analysis/render_preview.py --video 'E:/path/match.mp4' --model 'C:/path/yolox_tiny.onnx' --output 'C:/path/preview-output' --start 1600 --duration 12
```

The scoreboard profile is specific to the inspected broadcast. Recalibrate `PILOT_ROIS` and confirm left/right team labels before using another source, even at the same resolution. The scripts refuse a different resolution rather than silently stretching coordinates.

`scoreboard-analysis.json` includes the full source SHA256, real video timestamps, raw OCR strings, uncalibrated character scores, parsed values, missing-data counts and stable candidate UUIDs. `progress.json` records progress/completion. `decode.log` is diagnostic and can contain the private source path. Keep generated output private; it is excluded from version control and the delivery ZIP.

Open generated `review.html` locally in Chrome/Edge and select the original video. It verifies a bounded first/last 1 MiB digest, size, duration and dimensions before enabling playback links. This bounded check is distinct from the full-file audit SHA256. No network request is required. Decisions live in memory; export JSON before closing. Decisions do not write events into Supabase, and confirmed events remain empty. Candidate CSV export is available. The page contains no embedded full-match video or dependency/CDN request.

The tracking MP4 contains overlays burned into a short 5 fps derivative with the corresponding original audio. It is a visual prototype, not a high-frame-rate production export. The original recording is never overwritten. A simple visual-change heuristic resets tracks at suspected cuts; reliable broadcast replay handling remains a future requirement.

## Verification

```powershell
python tools/local-analysis/test_analysis.py
# After building a review page, with installed project Playwright/Chrome:
node tools/local-analysis/verify_review.mjs --review 'C:/path/pilot-output/review.html' --video 'E:/path/match.mp4'
```

The Python behavior checks cover duplicate suppression, one-to-one track assignment, cut reset, CTC repeated digits, repeated score observations, missing clock fields, replay-like score regressions and large gaps. Real-video behavior/results are recorded in `VALIDATION.md`; fixture tests alone establish no handball accuracy.

Next gates are a reviewed handball evaluation set, event-time refinement around candidates, player/ball specialist models, stronger tracking, reviewed camera/replay segmentation, resumable jobs and an authenticated production review/import boundary. No model prediction should bypass that boundary into published statistics.
