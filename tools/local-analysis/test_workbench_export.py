import hashlib
import json
from pathlib import Path
import tempfile
import unittest
from export_workbench import export, local_fingerprint


class WorkbenchExportTests(unittest.TestCase):
    def test_source_binding_and_output_never_confirms_events(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            source, report, output = root / "video.mp4", root / "report.json", root / "workbench.json"
            source.write_bytes(b"video")
            report.write_text(json.dumps({"schema": "sesen.scoreboard-pilot.v1", "source": {"size_bytes": 5, "sha256": hashlib.sha256(b"video").hexdigest(), "duration_ms": 60000}, "analysis": {"status": "completed", "model": {"name": "OCR", "sha256": "a" * 64}, "limitations": ["No confirmed events"]}, "candidates": []}))
            result = export(report, source, output)
            self.assertEqual(result["source"]["local_fingerprint"], hashlib.sha256(b"video5").hexdigest())
            self.assertNotIn("confirmed_events", result)
            with self.assertRaises(ValueError):
                export(report, source, output)
            source.write_bytes(b"other")
            with self.assertRaisesRegex(ValueError, "SHA256"):
                export(report, source, root / "wrong.json")

    def test_fingerprint_matches_browser_head_tail_boundaries(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "video"
            for size in (1, 1048576, 1048577, 2097152, 2097153):
                data = b"a" * size
                source.write_bytes(data)
                expected = data[:1048576] + data[max(1048576, size - 1048576):] + str(size).encode()
                self.assertEqual(local_fingerprint(source), hashlib.sha256(expected).hexdigest())


if __name__ == "__main__":
    unittest.main()
