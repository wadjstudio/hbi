"""Render an explicitly experimental, short person-track video locally."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import time

import numpy as np
from PIL import Image, ImageDraw
from detector import PersonDetector, ShortTrackMatcher


def run(args):
    if not 1 <= args.duration <= 30 or args.start < 0:
        raise ValueError("Preview must be a bounded 1–30 second interval")
    source = Path(args.video).resolve(strict=True)
    out = Path(args.output).resolve()
    if source == out or source in out.parents:
        raise ValueError("Separate output directory required")
    out.mkdir(parents=True, exist_ok=True)
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required")
    detector, tracker = PersonDetector(args.model), ShortTrackMatcher()
    width, height, fps = 960, 540, 5
    observations, histories = [], {}
    previous_image = None
    started = time.perf_counter()
    with (out / "preview-decode.log").open("wb") as decode_log, (out / "preview-encode.log").open("wb") as encode_log:
        decode = subprocess.Popen([ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-threads", "1", "-ss", str(args.start), "-i", str(source), "-t", str(args.duration), "-vf", f"fps={fps},scale={width}:{height}", "-an", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"], stdout=subprocess.PIPE, stderr=decode_log)
        encode = subprocess.Popen([ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", str(fps), "-i", "pipe:0", "-ss", str(args.start), "-i", str(source), "-t", str(args.duration), "-map", "0:v:0", "-map", "1:a:0?", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-threads", "1", "-c:a", "aac", "-movflags", "+faststart", "-shortest", "-y", str(out / "tracking-preview.mp4")], stdin=subprocess.PIPE, stderr=encode_log)
        try:
            count = width * height * 3
            while True:
                data = bytearray()
                while len(data) < count:
                    chunk = decode.stdout.read(count - len(data))
                    if not chunk:
                        break
                    data.extend(chunk)
                if not data:
                    break
                if len(data) != count:
                    raise RuntimeError("Truncated preview frame")
                image = Image.frombytes("RGB", (width, height), bytes(data))
                thumbnail = np.asarray(image.resize((32, 18)), dtype=np.float32)
                cut = previous_image is not None and float(np.abs(thumbnail - previous_image).mean()) > 35
                if cut:
                    tracker.reset()
                    histories = {}
                previous_image = thumbnail
                detections, elapsed = detector.detect(image)
                tracks = tracker.update(detections)
                timestamp = round((args.start + len(observations) / fps) * 1000)
                observations.append({"video_ms": timestamp, "inference_seconds": elapsed, "scene_cut_heuristic": cut, "persons": tracks})
                drawing = ImageDraw.Draw(image)
                for person in tracks:
                    x1, y1, x2, y2 = person["box"]
                    point = (round((x1 + x2) / 2), round(y2))
                    history = histories.setdefault(person["track_id"], [])
                    history.append(point)
                    history[:] = history[-12:]
                    if len(history) > 1:
                        drawing.line(history, fill="#d8b57b", width=3)
                    drawing.rectangle((x1, y1, x2, y2), outline="#11d3d7", width=2)
                    drawing.ellipse((point[0] - 15, point[1] - 5, point[0] + 15, point[1] + 5), outline="#d8b57b", width=2)
                    drawing.text((x1, max(40, y1 - 14)), f"T{person['track_id']} / {person['score']:.2f}", fill="#11d3d7", stroke_width=1, stroke_fill="black")
                drawing.rectangle((0, 0, width, 36), fill="#080e12")
                drawing.text((12, 12), "SESEN PILOT | Generic person tracks | Not player identity or tactical analysis", fill="#f4f1e8")
                encode.stdin.write(image.tobytes())
                if len(observations) == 20:
                    image.save(out / "tracking-preview.jpg", quality=92)
                if len(observations) % 20 == 0:
                    print(f"Rendered {len(observations)} preview frames", flush=True)
            decode.stdout.close()
            encode.stdin.close()
            if decode.wait(timeout=30) or encode.wait(timeout=30):
                raise RuntimeError("Preview codec pipeline failed; see logs")
        except BaseException:
            for child in (decode, encode):
                if child.poll() is None:
                    child.terminate()
                    child.wait(timeout=10)
            raise
    if not observations:
        raise RuntimeError("No preview frames decoded")
    report = {"schema": "sesen.tracking-pilot.v1", "video_start_ms": round(args.start * 1000), "requested_duration_ms": round(args.duration * 1000), "sample_fps": fps, "model": "YOLOX-tiny/COCO", "tracker": "one-frame IoU baseline, not ByteTrack", "review_status": "unreviewed", "identity_warning": "Track IDs can switch or fragment; they are not player IDs", "elapsed_seconds": round(time.perf_counter() - started, 2), "observations": observations}
    (out / "tracking-analysis.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({"frames": len(observations), "elapsed_seconds": report["elapsed_seconds"], "video": str(out / "tracking-preview.mp4")}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--video", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--start", type=float, required=True)
    parser.add_argument("--duration", type=float, default=12)
    run(parser.parse_args())
