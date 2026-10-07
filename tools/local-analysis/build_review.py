"""Build a self-contained local review page; it never embeds/uploads the video."""
import argparse
import hashlib
import json
from pathlib import Path


def run(args):
    source = Path(args.video).resolve(strict=True)
    analysis_path = Path(args.analysis).resolve(strict=True)
    report = json.loads(analysis_path.read_text(encoding="utf-8"))
    stat = source.stat()
    if stat.st_size != report["source"]["size_bytes"]:
        raise ValueError("Source size changed")
    with source.open("rb") as stream:
        full_digest = hashlib.file_digest(stream, "sha256").hexdigest()
    if full_digest != report["source"]["sha256"]:
        raise ValueError("Full source SHA256 does not match the analysis")
    with source.open("rb") as stream:
        first = stream.read(1024 * 1024)
        stream.seek(max(0, stat.st_size - 1024 * 1024))
        last = stream.read(1024 * 1024)
    final_stat = source.stat()
    if (stat.st_size, stat.st_mtime_ns) != (final_stat.st_size, final_stat.st_mtime_ns):
        raise ValueError("Source changed while verifying")
    # A bounded re-link check, distinct from the full-file audit digest.
    report["source"]["edge_sha256"] = hashlib.sha256(first + last).hexdigest()
    template = Path(__file__).with_name("review-template.html").read_text(encoding="utf-8")
    serialized = json.dumps(report, ensure_ascii=False).replace("<", "\\u003c")
    output = analysis_path.parent / "review.html"
    output.write_text(template.replace("__SESEN_DATA__", serialized), encoding="utf-8")
    print(f"Created {output.name}: {len(report['candidates'])} review-only candidates; video excluded")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", required=True)
    parser.add_argument("--analysis", required=True)
    run(parser.parse_args())
