import json
from pathlib import Path
import tempfile
import unittest
import zipfile
from export_mot import convert, export


def fixture():
    return {'schema': 'sesen.tracking-pilot.v1', 'sample_fps': 5, 'video_start_ms': 1590000, 'requested_duration_ms': 1000, 'observations': [
        {'video_ms': 1590000, 'persons': [{'track_id': 4, 'class': 'person', 'score': 0.8, 'box': [0, 1, 20, 31]}]},
        {'video_ms': 1590200, 'scene_cut_heuristic': True, 'persons': [{'track_id': 4, 'class': 'person', 'score': 0.7, 'box': [1, 2, 21, 32]}]},
        {'video_ms': 1590400, 'persons': []},
    ]}


class InterchangeTests(unittest.TestCase):
    def test_geometry_scene_identity_and_empty_frames(self):
        mot, cvat, times, mapping = convert(fixture(), 960, 540)
        self.assertEqual(mot[0], [1, 1, 1, 2, 20, 30, 0.8, -1, -1, -1])
        self.assertEqual(mot[1][1], 2)
        self.assertEqual(cvat[0][-3:], [1, 1, 1])
        self.assertEqual(times[-1], [3, 1590400, 1])
        self.assertEqual(len(mapping), 2)

    def test_reject_duplicate_frame_track(self):
        report = fixture()
        report['observations'][0]['persons'] *= 2
        with self.assertRaises(ValueError): convert(report, 960, 540)

    def test_reject_invalid_geometry_confidence_and_track(self):
        for field, value in [('box', [0, 0, 0, 1]), ('box', [0, -1, 1, 2]), ('box', [0, 0, 961, 2]), ('box', [float('nan'), 0, 1, 2]), ('score', float('inf')), ('score', 1.1), ('track_id', True), ('class', 'ball')]:
            report = fixture()
            report['observations'][0]['persons'][0][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError): convert(report, 960, 540)

    def test_reject_invented_or_sparse_time_and_wrong_schema(self):
        for field, value in [('video_ms', 1590100), ('video_ms', -1), ('scene_cut_heuristic', 'yes')]:
            report = fixture(); report['observations'][1][field] = value
            with self.assertRaises(ValueError): convert(report, 960, 540)
        report = fixture(); report['schema'] = 'other'
        with self.assertRaises(ValueError): convert(report, 960, 540)

    def test_package_has_no_video_or_ground_truth_claim_and_does_not_overwrite(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); report = root / 'report.json'; source = root / 'video.mp4'; output = root / 'export'
            report.write_text(json.dumps(fixture()), encoding='utf-8'); source.write_bytes(b'test source')
            manifest = export(report, output, 960, 540, 'test', source)
            self.assertEqual(manifest['review_status'], 'unreviewed')
            self.assertFalse(manifest['included_media'])
            with zipfile.ZipFile(output / 'cvat-review.zip') as archive:
                self.assertEqual(set(archive.namelist()), {'gt/gt.txt', 'gt/labels.txt', 'SESEN_UNREVIEWED.json'})
                self.assertIsNone(archive.testzip())
            for target, name in [(output, 'test'), (source, 'test'), (root / 'unsafe', '../escape')]:
                with self.assertRaises(ValueError): export(report, target, 960, 540, name, source)
            self.assertEqual(source.read_bytes(), b'test source')


if __name__ == '__main__': unittest.main()
