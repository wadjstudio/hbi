"""Read a local match's calibrated scoreboard at real source PTS intervals."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess
import time
import uuid

from PIL import Image
from scoreboard import OCR_SHA256, PILOT_ROIS, ScoreboardReader, parse_fields, score_change_candidates


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temporary.replace(path)


def run(args):
    source, output = Path(args.video).resolve(strict=True), Path(args.output).resolve()
    if not source.is_file() or source == output:
        raise ValueError("Expected a local input video and separate output directory")
    output.mkdir(parents=True, exist_ok=True)
    if (output / "scoreboard-analysis.json").exists():
        raise ValueError("Completed analysis already exists; choose a new output directory")
    initial_stat = source.stat()
    ffmpeg, ffprobe = shutil.which("ffmpeg"), shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise RuntimeError("Install FFmpeg/FFprobe for local video decoding")
    probe = subprocess.run([ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(source)], capture_output=True, text=True, encoding="utf-8", check=True, timeout=45)
    metadata = json.loads(probe.stdout)
    video = next(stream for stream in metadata["streams"] if stream["codec_type"] == "video")
    if (video["width"], video["height"]) != (1280, 720):
        raise ValueError("This experimental ON Sport profile is calibrated only for 1280x720; recalibrate for another source")
    if not 1 <= args.interval <= 30:
        raise ValueError("Sampling interval must be between 1 and 30 seconds")
    reader = ScoreboardReader(args.ocr_model)
    started = time.perf_counter()
    duration = float(metadata["format"]["duration"])
    crop_x, crop_y, crop_w, crop_h = 390, 615, 500, 60
    frame_bytes = crop_w * crop_h * 3
    log_path = output / "decode.log"
    filter_graph = f"select='isnan(prev_selected_t)+gte(t-prev_selected_t,{args.interval})',crop={crop_w}:{crop_h}:{crop_x}:{crop_y},format=rgb24,showinfo"
    command = [ffmpeg, "-hide_banner", "-nostdin", "-threads", "2", "-i", str(source), "-map", "0:v:0", "-vf", filter_graph, "-fps_mode", "vfr", "-an", "-f", "rawvideo", "pipe:1"]
    rows = []
    with log_path.open("wb") as log:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=log)
        try:
            while True:
                data = bytearray()
                while len(data) < frame_bytes:
                    chunk = process.stdout.read(frame_bytes - len(data))
                    if not chunk:
                        break
                    data.extend(chunk)
                if not data:
                    break
                if len(data) != frame_bytes:
                    raise RuntimeError("Truncated decoded frame")
                strip = Image.frombytes("RGB", (crop_w, crop_h), bytes(data))
                fields = {}
                for name, (x1, y1, x2, y2) in PILOT_ROIS.items():
                    fields[name] = reader.read_crop(strip.crop((x1 - crop_x, y1 - crop_y, x2 - crop_x, y2 - crop_y)))
                parsed = parse_fields(fields)
                rows.append({"sample_index": len(rows), "fields": fields, "parsed": parsed, "review_status": "unreviewed"})
                if len(rows) % 60 == 0:
                    write_json(output / "progress.json", {"status": "running", "samples": len(rows), "elapsed_seconds": round(time.perf_counter() - started, 1), "note": "Sampling progress; final source PTS and coverage validated at completion"})
                    print(f"Decoded/OCR {len(rows)} scoreboard samples", flush=True)
            process.stdout.close()
            if process.wait(timeout=30) != 0:
                raise RuntimeError("FFmpeg failed; see decode.log")
        except BaseException:
            process.terminate()
            process.wait(timeout=10)
            raise
    timestamps = [float(value) for value in re.findall(r"\bpts_time:\s*([0-9.+-]+)", log_path.read_text(encoding="utf-8", errors="replace"))]
    if len(timestamps) != len(rows) or not rows:
        raise RuntimeError("Decoded sample count and actual source PTS do not agree")
    if any(b <= a for a, b in zip(timestamps, timestamps[1:])):
        raise RuntimeError("Non-increasing presentation timestamps")
    if duration - timestamps[-1] > args.interval + 1:
        raise RuntimeError("Sampling did not cover the end of the source")
    for row, timestamp in zip(rows, timestamps):
        row["video_ms"] = round(timestamp * 1000)
    with source.open("rb") as stream:
        fingerprint = hashlib.file_digest(stream, "sha256").hexdigest()
    final_stat = source.stat()
    if (initial_stat.st_size, initial_stat.st_mtime_ns) != (final_stat.st_size, final_stat.st_mtime_ns):
        raise RuntimeError("Source changed during analysis; results are not valid")
    candidates = score_change_candidates(rows, max_gap_ms=round(args.interval * 3000))
    for candidate in candidates:
        candidate["id"] = str(uuid.uuid5(uuid.NAMESPACE_URL, fingerprint + json.dumps(candidate, sort_keys=True)))
    readable = sum(all(value is not None for value in row["parsed"].values()) for row in rows)
    result = {"schema": "sesen.scoreboard-pilot.v1", "source": {"name": source.name, "size_bytes": source.stat().st_size, "sha256": fingerprint, "duration_ms": round(duration * 1000), "width": video["width"], "height": video["height"]}, "analysis": {"status": "completed", "profile": "on-sport-1280x720-manually-calibrated-pilot", "sample_interval_ms": round(args.interval * 1000), "first_sample_ms": rows[0]["video_ms"], "last_sample_ms": rows[-1]["video_ms"], "sample_count": len(rows), "fully_readable_samples": readable, "elapsed_seconds": round(time.perf_counter() - started, 2), "confirmed_event_count": 0, "limitations": ["OCR character scores are uncalibrated, not accuracy estimates", "Only periodic scoreboard crops are analyzed, not full-match player tracking", "Cuts, replays, missing scoreboards and OCR errors require human review", "Candidate intervals are not exact shot times or confirmed goals", "No player identities, tactics, shot outcomes or goalkeeper statistics inferred"]}, "candidates": candidates, "observations": rows}
    result["analysis"]["model"] = {"name": "OpenCV Zoo CRNN_EN_2021sep", "sha256": OCR_SHA256, "minimum_character_score": 0.60, "score_is_calibrated_accuracy": False}
    result["analysis"]["roi_pixels"] = PILOT_ROIS
    write_json(output / "scoreboard-analysis.json", result)
    write_json(output / "progress.json", result["analysis"])
    print(json.dumps(result["analysis"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", required=True)
    parser.add_argument("--ocr-model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--interval", type=float, default=5)
    run(parser.parse_args())
