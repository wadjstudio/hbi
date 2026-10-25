import hashlib
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
from export_tracking_workbench import export


class TrackingWorkbenchTests(unittest.TestCase):
    def make_report(self, source):
        return {"schema": "sesen.tracking-comparison.v1", "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
            "source_size_bytes": source.stat().st_size, "width": 960, "height": 540,
            "video_start_ms": 1000, "duration_ms": 100, "sample_fps": 10,
            "candidate": {"tracker": "ByteTrack", "model": "YOLOX", "sha256": "a" * 64},
            "limitations": ["Track IDs are not player identities"],
            "observations": [{"video_ms": 1000, "scene": 0, "candidate": [
                {"track_id": 1, "score": .8, "box": [96, 108, 288, 324]}]}]}

    @patch("export_tracking_workbench.shutil.which", return_value="ffprobe")
    @patch("export_tracking_workbench.subprocess.run")
    def test_verifies_original_and_normalizes_without_inventing_events(self, probe, _which):
        probe.return_value = SimpleNamespace(stdout=json.dumps({"streams": [{"codec_type": "video", "width": 1280, "height": 720}], "format": {"duration": "60"}}))
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); video = root / "video.mp4"; video.write_bytes(b"video")
            report = root / "report.json"; report.write_text(json.dumps(self.make_report(video)))
            result = export(report, video, root / "out.json")
            self.assertEqual(result["frames"][0]["persons"][0]["box"], [.1, .2, .3, .6])
            self.assertEqual(result["source"]["width"], 1280)
            self.assertEqual(result["time_basis"], "nominal-source-samples")
            self.assertNotIn("events", result)
            with self.assertRaises(ValueError):
                export(report, video, root / "out.json")
            video.write_bytes(b"other")
            with self.assertRaisesRegex(ValueError, "SHA256"):
                export(report, video, root / "wrong.json")

    @patch("export_tracking_workbench.shutil.which", return_value="ffprobe")
    @patch("export_tracking_workbench.subprocess.run")
    def test_rejects_aspect_changes(self, probe, _which):
        probe.return_value = SimpleNamespace(stdout=json.dumps({"streams": [{"codec_type": "video", "width": 640, "height": 480}], "format": {"duration": "60"}}))
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); video = root / "video.mp4"; video.write_bytes(b"video")
            report = root / "report.json"; report.write_text(json.dumps(self.make_report(video)))
            with self.assertRaisesRegex(ValueError, "aspect ratio"):
                export(report, video, root / "out.json")


if __name__ == "__main__":
    unittest.main()
