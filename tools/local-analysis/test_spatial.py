"""Behaviour tests for spatial review aids; no real-model accuracy claims."""
import unittest
import numpy as np
from PIL import Image
from detector import PersonDetector, overlap, suppress
from spatial_proposals import court_homography, jersey_colour
from validate_calibration import validate


class SpatialTests(unittest.TestCase):
    def test_class_specific_decode_does_not_merge_person_and_ball(self):
        detector = object.__new__(PersonDetector)
        detector.grid = np.array([[0, 0], [1, 0]])
        detector.steps = np.array([[8], [8]])
        detector.nms_threshold = .45
        predictions = np.zeros((2, 85))
        predictions[:,4] = 1
        predictions[0,5] = .8
        predictions[1,37] = .6  # COCO 32: sports ball, not person.
        people = detector.decode_class(predictions, 0, .1, 1, 100, 100)
        balls = detector.decode_class(predictions, 32, .1, 1, 100, 100)
        self.assertEqual([p['class'] for p in people], ['person'])
        self.assertEqual([b['class'] for b in balls], ['sports_ball'])
        self.assertNotEqual(people[0]['box'], balls[0]['box'])

    def test_vector_nms_matches_scalar_for_overlaps_ties_and_empty(self):
        rng = np.random.default_rng(73)
        for count in (0, 1, 20, 200):
            starts = rng.uniform(-10, 100, (count, 2))
            boxes = np.column_stack([starts, starts + rng.uniform(0, 50, (count, 2))])
            scores = rng.integers(0, 4, count) / 4
            for threshold in (0, .45, .65, 1):
                remaining = sorted(range(count), key=lambda i: float(scores[i]), reverse=True)
                reference = []
                while remaining:
                    best, *rest = remaining
                    reference.append(best)
                    remaining = [i for i in rest if overlap(boxes[best], boxes[i]) <= threshold]
                self.assertEqual(suppress(boxes, scores, threshold), reference)

    def test_colours_are_groups_and_mixed_dark_tiny_remain_unknown(self):
        for rgb, expected in (((220, 20, 20), 'red'), ((240, 240, 240), 'white'), ((20, 200, 30), 'green'), ((0, 200, 210), 'cyan'), ((15, 15, 15), 'unknown')):
            self.assertEqual(jersey_colour(Image.new('RGB', (100, 200), rgb), [0, 0, 100, 200])['group'], expected)
        mixed = Image.new('RGB', (100, 200), 'red')
        mixed.paste('white', (50, 0, 100, 200))
        self.assertEqual(jersey_colour(mixed, [0, 0, 100, 200])['group'], 'unknown')
        self.assertEqual(jersey_colour(mixed, [0, 0, 4, 8])['group'], 'unknown')

    def test_homography_maps_reviewed_corners_and_centre(self):
        h = court_homography([[.1,.2],[.9,.2],[.9,.8],[.1,.8]], [[0,0],[40,0],[40,20],[0,20]])
        point = h @ [.5,.5,1]
        np.testing.assert_allclose(point[:2] / point[2], [20,10], atol=1e-8)

    def test_calibration_rejects_collinear_missing_outside_and_crossed_anchors(self):
        court = [[0,0],[40,0],[40,20],[0,20]]
        invalid = [[], [[0,0],[.3,.3],[.6,.6],[1,1]], [[0,0],[0,0],[1,1],[0,1]], [[-.1,0],[1,0],[1,1],[0,1]]]
        for points in invalid:
            with self.assertRaises(ValueError):
                court_homography(points, court)
        with self.assertRaises(ValueError):
            court_homography([[0,0],[1,0],[0,1],[1,1]], court)

    def test_feedback_is_source_and_frame_bound_and_never_approved(self):
        frame = {'index':0, 'video_ms':2100000, 'scene':1, 'image_sha256':'c'*64}
        proposals = {'schema':'sesen.spatial-proposals.v1','source_sha256':'a'*64,'model_sha256':'b'*64,'frames':[frame]}
        anchors = [{'image_point':a,'court_point':b} for a,b in zip([[0,0],[1,0],[1,1],[0,1]], [[0,0],[40,0],[40,20],[0,20]])]
        review = {**frame,'frame_index':0,'anchors':anchors}
        feedback = {'schema':'sesen.spatial-feedback.v1','source_sha256':'a'*64,'model_sha256':'b'*64,'confirmed_events':[],'frames':[review]}
        result = validate(proposals, feedback)
        self.assertFalse(result['frames'][0]['calibration_approved'])
        self.assertEqual(result['confirmed_events'], [])
        with self.assertRaises(ValueError):
            validate(proposals, {**feedback,'source_sha256':'d'*64})
        with self.assertRaises(ValueError):
            validate(proposals, {**feedback,'frames':[{**review,'video_ms':2100100}]})
        with self.assertRaises(ValueError):
            validate(proposals, {**feedback,'frames':[review,review]})
        with self.assertRaises(ValueError):
            validate({**proposals,'source_sha256':None}, {**feedback,'source_sha256':None})


if __name__ == '__main__':
    unittest.main()
