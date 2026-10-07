import unittest
import hashlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import numpy as np
from build_review import run as build_review
from detector import ShortTrackMatcher, suppress
from scoreboard import decode_ctc, parse_fields, score_change_candidates


def observation(ms, left, right, minutes=12, seconds=0):
    return {"video_ms": ms, "parsed": {"left_score": left, "right_score": right, "minutes": minutes, "seconds": seconds}}


class AnalysisTests(unittest.TestCase):
    def test_review_builder_rejects_same_size_wrong_content(self):
        with tempfile.TemporaryDirectory() as folder:
            source, analysis = Path(folder) / "source.bin", Path(folder) / "analysis.json"
            source.write_bytes(b"wrong")
            analysis.write_text(json.dumps({"source": {"size_bytes": 5, "sha256": hashlib.sha256(b"right").hexdigest()}, "candidates": []}), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "SHA256"):
                build_review(SimpleNamespace(video=source, analysis=analysis))

    def test_review_builder_escapes_untrusted_json_script_text(self):
        with tempfile.TemporaryDirectory() as folder:
            source, analysis = Path(folder) / "source.bin", Path(folder) / "analysis.json"
            source.write_bytes(b"video")
            injection = "</script><script>globalThis.injected=true</script>"
            analysis.write_text(json.dumps({"source": {"size_bytes": 5, "sha256": hashlib.sha256(b"video").hexdigest(), "name": injection}, "candidates": []}), encoding="utf-8")
            build_review(SimpleNamespace(video=source, analysis=analysis))
            html = (Path(folder) / "review.html").read_text(encoding="utf-8")
            self.assertNotIn(injection, html)
            self.assertIn("\\u003c/script>", html)

    def test_ocr_parser_preserves_zero_and_missing(self):
        fields = {"left_score": {"raw": "0", "model_character_score": .99}, "right_score": {"raw": "2x", "model_character_score": .99}, "minutes": {"raw": "59", "model_character_score": .57}, "seconds": {"raw": "60", "model_character_score": .99}}
        self.assertEqual(parse_fields(fields), {"left_score": 0, "right_score": None, "minutes": None, "seconds": None})

    def test_overlapping_duplicate_boxes_suppressed(self):
        self.assertEqual(suppress([[0, 0, 10, 10], [1, 1, 11, 11], [30, 30, 40, 40]], [.9, .6, .8]), [0, 2])

    def test_tracker_does_not_reuse_id_twice(self):
        tracker = ShortTrackMatcher()
        first = tracker.update([{"box": [0, 0, 10, 10]}])[0]["track_id"]
        assigned = tracker.update([{"box": [0, 0, 10, 10]}, {"box": [0, 0, 10, 10]}])
        self.assertEqual(len({row["track_id"] for row in assigned}), 2)
        tracker.reset()
        self.assertNotEqual(tracker.update([{"box": [0, 0, 10, 10]}])[0]["track_id"], first)

    def test_ctc_blank_separates_repeated_digits(self):
        matrix = np.full((5, 1, 37), -10, dtype=np.float32)
        for row, value in enumerate([2, 2, 0, 2, 2]):
            matrix[row, 0, value] = 10
        self.assertEqual(decode_ctc(matrix)[0], "11")

    def test_repeated_scores_produce_only_unreviewed_interval(self):
        rows = [observation(0, 4, 4), observation(5000, 4, 4), observation(10000, 4, 5), observation(15000, 4, 5), observation(20000, 4, 5)]
        candidates = score_change_candidates(rows)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["kind"], "score_change_candidate")
        self.assertEqual(candidates[0]["review_status"], "unreviewed")
        self.assertEqual((candidates[0]["video_start_ms"], candidates[0]["video_end_ms"]), (5000, 15000))

    def test_single_bad_read_does_not_create_event(self):
        rows = [observation(0, 4, 4), observation(5000, 4, 4), observation(10000, 4, 8), observation(15000, 4, 4), observation(20000, 4, 4)]
        self.assertEqual(score_change_candidates(rows), [])

    def test_missing_clock_is_not_zero_or_event(self):
        rows = [observation(0, 4, 4), observation(5000, 4, 4), observation(10000, 4, 5, minutes=None), observation(15000, 4, 5, minutes=None)]
        self.assertEqual(score_change_candidates(rows), [])

    def test_score_regression_does_not_count_goal_again(self):
        states = [(4, 4), (4, 4), (4, 5), (4, 5), (4, 4), (4, 4), (4, 5), (4, 5)]
        candidates = score_change_candidates([observation(i * 5000, *state) for i, state in enumerate(states)])
        self.assertEqual(sum(row["kind"] == "score_change_candidate" for row in candidates), 1)
        self.assertEqual(sum(row["kind"] == "scoreboard_discontinuity" for row in candidates), 1)

    def test_gap_is_discontinuity(self):
        rows = [observation(0, 4, 4), observation(5000, 4, 4), observation(100000, 4, 5), observation(105000, 4, 5)]
        self.assertEqual(score_change_candidates(rows)[0]["kind"], "scoreboard_discontinuity")


if __name__ == "__main__":
    unittest.main()
