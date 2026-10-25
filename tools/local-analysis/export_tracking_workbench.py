"""Export existing ByteTrack comparison samples; no inference or identity claims."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
from export_workbench import local_fingerprint


def export(report_path, video_path, output_path):
    report_path, video = Path(report_path).resolve(strict=True), Path(video_path).resolve(strict=True)
    output = Path(output_path).resolve()
    if output.exists() or report_path.stat().st_size > 50 * 1024 * 1024:
        raise ValueError("Choose new output and a bounded report")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("schema") != "sesen.tracking-comparison.v1" or not 1 <= len(report["observations"]) <= 900:
        raise ValueError("Expected bounded tracking comparison")
    stat = video.stat()
    with video.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != report["source_sha256"] or stat.st_size != report["source_size_bytes"]:
        raise ValueError("Source SHA256 or size mismatch")
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        raise RuntimeError("FFprobe required to verify source geometry/duration")
    result = subprocess.run([ffprobe, "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)],
        check=True, capture_output=True, encoding="utf-8", timeout=45)
    metadata = json.loads(result.stdout)
    geometry = next(row for row in metadata["streams"] if row["codec_type"] == "video")
    width, height = report["width"], report["height"]
    if width <= 0 or height <= 0 or abs(width / height - geometry["width"] / geometry["height"]) > 0.001:
        raise ValueError("Preview changed aspect ratio; alignment is not established")
    frames = []
    for row in report["observations"]:
        persons = []
        for person in row["candidate"]:
            raw = person["box"]
            if len(raw) != 4 or not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) for v in raw):
                raise ValueError("Invalid box")
            persons.append({"track_id": person["track_id"], "score": person["score"],
                "box": [raw[0] / width, raw[1] / height, raw[2] / width, raw[3] / height]})
        frames.append({"video_ms": row["video_ms"], "scene": row["scene"], "persons": persons})
    candidate = report["candidate"]
    bundle = {
        "schema": "sesen.workbench-tracking.v1",
        "source": {"name": video.name, "sha256": digest, "size_bytes": stat.st_size,
            "local_fingerprint": local_fingerprint(video), "fingerprint_scheme": "hbi-head-tail-size-v1",
            "duration_ms": round(float(metadata["format"]["duration"]) * 1000),
            "width": geometry["width"], "height": geometry["height"]},
        "engine": {"name": candidate["tracker"], "model": candidate["model"],
            "model_sha256": candidate["sha256"], "limitations": report["limitations"]},
        "time_basis": "nominal-source-samples", "start_ms": report["video_start_ms"],
        "end_ms": report["video_start_ms"] + report["duration_ms"],
        "sample_fps": report["sample_fps"], "frames": frames,
    }
    after = video.stat()
    if (stat.st_size, stat.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise ValueError("Source changed during export")
    serialized = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    with output.open("x", encoding="utf-8") as stream:
        stream.write(serialized)
    return bundle


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    parser.add_argument("--video", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    bundle = export(args.report, args.video, args.output)
    print(json.dumps({"frames": len(bundle["frames"]), "boxes": sum(len(f["persons"]) for f in bundle["frames"]), "confirmed_events": 0}))
