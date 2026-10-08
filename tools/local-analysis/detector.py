"""Local, generic person detector. Does not infer player identity or match events."""
import hashlib
import time

import numpy as np
from PIL import Image
import onnxruntime as ort

MODEL_SHA256 = "427cc366d34e27ff7a03e2899b5e3671425c262ea2291f88bb942bc1cc70b0f7"
MODEL_PROFILES = {
    MODEL_SHA256: (416, "YOLOX-tiny/COCO"),
    "c5c2d13e59ae883e6af3b45daea64af4833a4951c92d116ec270d9ddbe998063": (640, "YOLOX-S/COCO"),
}


def overlap(a, b):
    left, top = max(a[0], b[0]), max(a[1], b[1])
    right, bottom = min(a[2], b[2]), min(a[3], b[3])
    intersection = max(0, right - left) * max(0, bottom - top)
    area_a = max(0, a[2] - a[0]) * max(0, a[3] - a[1])
    area_b = max(0, b[2] - b[0]) * max(0, b[3] - b[1])
    return intersection / max(area_a + area_b - intersection, 1e-9)


def suppress(boxes, scores, threshold=0.45):
    boxes = np.asarray(boxes, dtype=np.float64).reshape(-1, 4)
    remaining = np.argsort(-np.asarray(scores, dtype=np.float64), kind="stable")
    areas = np.maximum(0, boxes[:, 2] - boxes[:, 0]) * np.maximum(0, boxes[:, 3] - boxes[:, 1])
    selected = []
    while remaining.size:
        best, rest = int(remaining[0]), remaining[1:]
        selected.append(best)
        intersections = np.maximum(0, np.minimum(boxes[best, 2:], boxes[rest, 2:]) - np.maximum(boxes[best, :2], boxes[rest, :2])).prod(axis=1)
        ious = intersections / np.maximum(areas[best] + areas[rest] - intersections, 1e-9)
        remaining = rest[ious <= threshold]
    return selected


class PersonDetector:
    def __init__(self, model_path, threshold=0.35, nms_threshold=0.45):
        if not 0 < threshold < 1 or not 0 < nms_threshold < 1:
            raise ValueError("Detection and NMS thresholds must be between zero and one")
        with open(model_path, "rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        if digest not in MODEL_PROFILES:
            raise ValueError("Unexpected model checksum; expected a pinned official YOLOX model")
        self.input_size, self.model_name = MODEL_PROFILES[digest]
        self.model_sha256 = digest
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(model_path), sess_options=options, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        if self.session.get_inputs()[0].shape != [1, 3, self.input_size, self.input_size]:
            raise ValueError("Unexpected YOLOX input shape")
        self.threshold = threshold
        self.nms_threshold = nms_threshold
        grids, steps = [], []
        for stride in (8, 16, 32):
            width = self.input_size // stride
            xx, yy = np.meshgrid(np.arange(width), np.arange(width))
            grids.append(np.column_stack([xx.ravel(), yy.ravel()]))
            steps.append(np.full((width * width, 1), stride))
        self.grid = np.concatenate(grids)
        self.steps = np.concatenate(steps)

    def detect(self, image):
        groups, timings = self.detect_classes(image, {0: self.threshold})
        return groups["person"], timings["inference_seconds"]

    def detect_classes(self, image, thresholds=None):
        """One inference, independent class NMS; sports-ball proposals are not handball events."""
        thresholds = {0: self.threshold, 32: 0.1} if thresholds is None else thresholds
        if not thresholds or any(c not in (0, 32) or not 0 < t < 1 for c, t in thresholds.items()):
            raise ValueError("Only person / sports-ball classes and thresholds in (0,1) are supported")
        wall_start = time.perf_counter()
        width, height = image.size
        scale = min(self.input_size / width, self.input_size / height)
        resized = image.convert("RGB").resize((int(width * scale), int(height * scale)), Image.Resampling.BILINEAR)
        # The upstream release expects BGR float32 in [0,255], top-left padding.
        padded = np.full((self.input_size, self.input_size, 3), 114, dtype=np.float32)
        padded[:resized.height, :resized.width] = np.asarray(resized)[:, :, ::-1]
        tensor = padded.transpose(2, 0, 1)[None].copy()
        start = time.perf_counter()
        predictions = self.session.run(None, {self.input_name: tensor})[0][0]
        elapsed = time.perf_counter() - start
        if predictions.shape != (len(self.grid), 85):
            raise ValueError("Unexpected YOLOX output shape")
        post_start = time.perf_counter()
        groups = {}
        for class_id, threshold in thresholds.items():
            name = "person" if class_id == 0 else "sports_ball"
            groups[name] = self.decode_class(predictions, class_id, threshold, scale, width, height)
        return groups, {"inference_seconds": elapsed, "postprocess_seconds": time.perf_counter() - post_start, "wall_seconds": time.perf_counter() - wall_start}

    def decode_class(self, predictions, class_id, threshold, scale, width, height):
        scores = predictions[:, 4] * predictions[:, 5 + class_id]
        selected = np.flatnonzero(scores >= threshold)
        centers = (predictions[selected, :2] + self.grid[selected]) * self.steps[selected]
        sizes = np.exp(np.clip(predictions[selected, 2:4], -20, 20)) * self.steps[selected]
        boxes = np.column_stack([centers - sizes / 2, centers + sizes / 2]) / scale
        boxes[:, (0, 2)] = np.clip(boxes[:, (0, 2)], 0, width)
        boxes[:, (1, 3)] = np.clip(boxes[:, (1, 3)], 0, height)
        valid_scores = scores[selected]
        valid = np.isfinite(boxes).all(axis=1) & np.isfinite(valid_scores) & ((boxes[:, 2] - boxes[:, 0]) > 1) & ((boxes[:, 3] - boxes[:, 1]) > 1)
        boxes, valid_scores = boxes[valid], valid_scores[valid]
        kept = suppress(boxes, valid_scores, self.nms_threshold)
        name = "person" if class_id == 0 else "sports_ball"
        return [{"box": [round(float(v), 2) for v in boxes[i]], "score": round(float(valid_scores[i]), 4), "class": name} for i in kept]


class ShortTrackMatcher:
    """IoU baseline only, not ByteTrack or a persistent player identity model."""
    def __init__(self):
        self.previous = []
        self.next_id = 1

    def reset(self):
        self.previous = []

    def update(self, detections):
        pairs = sorted(((overlap(a["box"], b["box"]), ai, bi) for ai, a in enumerate(self.previous) for bi, b in enumerate(detections)), reverse=True)
        used_old, used_new = set(), set()
        assigned = {}
        for similarity, ai, bi in pairs:
            if similarity >= 0.25 and ai not in used_old and bi not in used_new:
                assigned[bi] = self.previous[ai]["track_id"]
                used_old.add(ai)
                used_new.add(bi)
        result = []
        for i, detection in enumerate(detections):
            identity = assigned.get(i)
            if identity is None:
                identity = self.next_id
                self.next_id += 1
            result.append({**detection, "track_id": identity})
        self.previous = result
        return result
