"""Bind an existing local OCR report to its video for SESEN workbench review.

No model execution, network, upload, video copying or event confirmation here.
"""
import argparse
import hashlib
import json
from pathlib import Path


def local_fingerprint(source):
    block = 1024 * 1024
    size = source.stat().st_size
    with source.open("rb") as stream:
        head = stream.read(block)
        stream.seek(max(block, size - block))
        tail = stream.read()
    return hashlib.sha256(head + tail + str(size).encode("ascii")).hexdigest()


def export(report_path, source_path, output_path):
    report_path = Path(report_path).resolve(strict=True)
    source = Path(source_path).resolve(strict=True)
    output = Path(output_path).resolve()
    if output.exists() or output in (source, report_path):
        raise ValueError("Choose a new output file")
    report = json.loads(report_path.read_text(encoding="utf-8"))
    if report.get("schema") != "sesen.scoreboard-pilot.v1" or report.get("analysis", {}).get("status") != "completed":
        raise ValueError("A completed SESEN scoreboard report is required")
    before = source.stat()
    with source.open("rb") as stream:
        digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if digest != report["source"]["sha256"] or before.st_size != report["source"]["size_bytes"]:
        raise ValueError("Source SHA256 or size mismatch")
    candidate_keys = ("id", "kind", "video_start_ms", "video_end_ms", "before", "after", "side", "note")
    bundle = {
        "schema": "sesen.workbench-analysis.v1",
        "source": {
            "name": source.name, "size_bytes": before.st_size, "sha256": digest,
            "local_fingerprint": local_fingerprint(source),
            "fingerprint_scheme": "hbi-head-tail-size-v1",
            "duration_ms": report["source"]["duration_ms"],
        },
        "engine": {
            "name": report["analysis"]["model"]["name"],
            "model_sha256": report["analysis"]["model"]["sha256"],
            "limitations": report["analysis"]["limitations"],
        },
        "candidates": [{key: candidate[key] for key in candidate_keys} for candidate in report["candidates"]],
    }
    after = source.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise ValueError("Source changed during export")
    with output.open("x", encoding="utf-8") as stream:
        json.dump(bundle, stream, ensure_ascii=False, indent=2)
    return bundle


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--report", required=True)
    parser.add_argument("--video", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    result = export(args.report, args.video, args.output)
    print(json.dumps({"output": args.output, "candidates": len(result["candidates"]), "confirmed_events": 0}))
