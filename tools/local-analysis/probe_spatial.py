"""Bounded colour / generic ball experiment using cached, source-bound frames."""
import argparse
import hashlib
import json
from pathlib import Path
import statistics
import time

from PIL import Image
from detector import PersonDetector, overlap, suppress
from spatial_proposals import jersey_colour


def scalar_nms(boxes, scores, threshold):
    remaining = sorted(range(len(scores)), key=lambda i: float(scores[i]), reverse=True)
    kept = []
    while remaining:
        best, *rest = remaining
        kept.append(best)
        remaining = [i for i in rest if overlap(boxes[best], boxes[i]) <= threshold]
    return kept


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--comparison", type=Path, required=True)
    parser.add_argument("--model", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--ball-tiles", action="store_true", help="Six overlapping image tiles per frame; increases inference cost, not model capability")
    args = parser.parse_args()
    rows = [json.loads(line) for line in (args.comparison / "observations.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    report = json.loads((args.comparison / "comparison.json").read_text(encoding="utf-8"))
    args.out.mkdir(parents=True, exist_ok=False)
    detector = PersonDetector(args.model, threshold=.1, nms_threshold=.65)
    frames, benchmarks = [], []
    for index in (0, 50, 100, 150, 200, 300, 450, 599):
        image_path = args.comparison / f"source-frame-{index:04}.jpg"
        image = Image.open(image_path).convert("RGB")
        groups, timings = detector.detect_classes(image)
        tile_seconds = 0.0
        if args.ball_tiles:
            balls = [{**b, 'origin':'full_frame'} for b in groups['sports_ball']]
            for left in (0, image.width // 4, image.width // 2):
                for top in (0, image.height // 3):
                    bounds = (left, top, left + image.width // 2, top + image.height * 2 // 3)
                    tiled, measured = detector.detect_classes(image.crop(bounds), {32: .1})
                    tile_seconds += measured['wall_seconds']
                    for ball in tiled['sports_ball']:
                        x1,y1,x2,y2 = ball['box']
                        balls.append({**ball,'box':[x1+left,y1+top,x2+left,y2+top],'origin':'tile','tile_bounds':list(bounds)})
            kept = suppress([b['box'] for b in balls], [b['score'] for b in balls], .45)
            groups['sports_ball'] = [balls[i] for i in kept]
        timings['tile_wall_seconds'] = tile_seconds
        timings['total_detection_wall_seconds'] = timings['wall_seconds'] + tile_seconds
        # Profile NMS with exactly the same recorded detections and assert parity.
        boxes = [item["box"] for item in rows[index]["candidate_detections"]]
        scores = [item["score"] for item in rows[index]["candidate_detections"]]
        before = time.perf_counter(); reference = scalar_nms(boxes, scores, .65); scalar = time.perf_counter() - before
        before = time.perf_counter(); vector = suppress(boxes, scores, .65); elapsed = time.perf_counter() - before
        if reference != vector:
            raise RuntimeError("NMS parity failed")
        benchmarks.append({"frame": index, "boxes": len(boxes), "scalar_seconds": scalar, "vector_seconds": elapsed})
        tracks = [{**track, "jersey_colour": jersey_colour(image, track["box"])} for track in rows[index]["candidate"]]
        filename = image_path.name
        (args.out / filename).write_bytes(image_path.read_bytes())
        frame = {"index": index, "video_ms": rows[index]["video_ms"], "scene": rows[index]["scene"], "image": filename, "image_sha256": hashlib.sha256(image_path.read_bytes()).hexdigest(), "width": image.width, "height": image.height, "tracks": tracks, "ball_proposals": groups["sports_ball"], "timings": timings}
        frames.append(frame)
        print(json.dumps({"frame": index, "balls": len(groups["sports_ball"]), "colour_groups": {g: sum(t["jersey_colour"]["group"] == g for t in tracks) for g in ("red", "white", "green", "cyan", "unknown")}, "timings": timings}), flush=True)
    output = {"schema": "sesen.spatial-proposals.v1", "status": "unreviewed", "source_sha256": report["source_sha256"], "model_sha256": detector.model_sha256, "ball_threshold":.1, "ball_tiles":args.ball_tiles, "frames": frames, "nms_benchmark": benchmarks, "median_wall_seconds": statistics.median(f["timings"]["total_detection_wall_seconds"] for f in frames), "limitations": ["Eight selected stills, not a ball tracker or full-match analysis", "Generic COCO sports-ball model; proposals may be empty or wrong", "Jersey colour is a crop heuristic, not team identity", "No court calibration, metres, speed or tactical conclusions inferred", "Cached JPEGs may differ from original decoded pixels"]}
    (args.out / "proposals.json").write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    template = Path(__file__).with_name("spatial_review.html").read_text(encoding="utf-8")
    # Data is fetched from a sibling file; source metadata is never interpolated into HTML.
    (args.out / "index.html").write_text(template, encoding="utf-8")
    print(json.dumps({"completed": True, "frames": len(frames), "median_wall_seconds": output["median_wall_seconds"]}))


if __name__ == "__main__":
    main()
