"""OCR observations are unreviewed evidence, never authoritative goal events."""
import hashlib
import re

import numpy as np
from PIL import Image
import onnxruntime as ort

OCR_SHA256 = "a84b1f6e11a65c2d733cb0cc1f014aae3f99051e3f11447dc282faa678eee544"
CHARSET = "0123456789abcdefghijklmnopqrstuvwxyz"
# Pilot calibration observed on the user's 1280x720 ON Sport recording only.
PILOT_ROIS = {
    "left_score": (554, 636, 585, 666),
    "right_score": (695, 636, 727, 666),
    "minutes": (609, 650, 639, 668),
    "seconds": (640, 650, 671, 668),
}


def parse_fields(fields):
    values = {}
    for name, observation in fields.items():
        text = observation["raw"]
        limit = 59 if name == "seconds" else 60 if name == "minutes" else 80
        values[name] = int(text) if re.fullmatch(r"\d{1,2}", text) and int(text) <= limit and observation["model_character_score"] >= 0.60 else None
    return values


def decode_ctc(logits):
    matrix = np.asarray(logits).reshape(-1, 37)
    shifted = matrix - matrix.max(axis=1, keepdims=True)
    probabilities = np.exp(shifted)
    probabilities /= probabilities.sum(axis=1, keepdims=True)
    choices = probabilities.argmax(axis=1)
    text, confidence, previous = [], [], -1
    for row, choice in enumerate(choices):
        if choice and choice != previous:
            text.append(CHARSET[choice - 1])
            confidence.append(float(probabilities[row, choice]))
        previous = choice
    return "".join(text), min(confidence, default=0)


class ScoreboardReader:
    def __init__(self, model_path):
        with open(model_path, "rb") as stream:
            if hashlib.file_digest(stream, "sha256").hexdigest() != OCR_SHA256:
                raise ValueError("Unexpected CRNN model checksum")
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        self.session = ort.InferenceSession(str(model_path), sess_options=options, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name

    def read_crop(self, crop):
        image = crop.convert("L").resize((100, 32), Image.Resampling.BILINEAR)
        tensor = ((np.asarray(image, dtype=np.float32) - 127.5) / 127.5)[None, None]
        text, confidence = decode_ctc(self.session.run(None, {self.input_name: tensor})[0])
        return {"raw": text, "model_character_score": round(confidence, 4)}

    def read(self, image, rois=PILOT_ROIS):
        fields = {}
        for name, box in rois.items():
            x1, y1, x2, y2 = box
            fields[name] = self.read_crop(image.crop((round(x1 / 1280 * image.width), round(y1 / 720 * image.height), round(x2 / 1280 * image.width), round(y2 / 720 * image.height))))
        return {"fields": fields, "parsed": parse_fields(fields), "review_status": "unreviewed"}


def score_change_candidates(observations, max_gap_ms=30000):
    """Require repeated readable scores; isolate gaps, jumps and reversals for review."""
    candidates, previous, pending, repeats = [], None, None, 0
    for row in observations:
        values = row["parsed"]
        state = (values["left_score"], values["right_score"])
        if None in state or values["minutes"] is None or values["seconds"] is None:
            pending, repeats = None, 0
            continue
        if state == pending:
            repeats += 1
        else:
            pending, repeats = state, 1
        if repeats < 2:
            continue
        if previous is None:
            previous = {"state": state, "last_ms": row["video_ms"]}
            continue
        before = previous["state"]
        if state != before:
            delta = tuple(b - a for a, b in zip(before, state))
            if any(change < 0 for change in delta):
                candidates.append({"kind": "scoreboard_discontinuity", "video_start_ms": previous["last_ms"], "video_end_ms": row["video_ms"], "before": list(before), "after": list(state), "side": None, "review_status": "unreviewed", "note": "Score regression: possible replay, correction or OCR error; never added as a goal"})
                pending, repeats = None, 0
                continue
            gap = row["video_ms"] - previous["last_ms"]
            clean = delta in ((1, 0), (0, 1)) and gap <= max_gap_ms
            candidates.append({"kind": "score_change_candidate" if clean else "scoreboard_discontinuity", "video_start_ms": previous["last_ms"], "video_end_ms": row["video_ms"], "before": list(before), "after": list(state), "side": ("left" if delta == (1, 0) else "right" if delta == (0, 1) else None), "review_status": "unreviewed", "note": "Scoreboard change interval; not the precise scoring time, shooter or a confirmed goal"})
        previous = {"state": state, "last_ms": row["video_ms"]}
    return candidates
