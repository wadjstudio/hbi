"""Synthetic behaviour checks, not a real-match accuracy benchmark."""
import copy
import unittest
import numpy as np
from PIL import Image
from prepare_tactical_sequence import (CameraPreparation, colour_observation, project,
    validate_seeds, validate_tracking)


def report():
    return {'schema': 'sesen.workbench-tracking.v1', 'time_basis': 'nominal-source-samples',
        'source': {'sha256': 'a'*64, 'duration_ms': 60000}, 'engine': {'model_sha256': 'b'*64},
        'sample_fps': 10, 'start_ms': 0, 'end_ms': 300,
        'frames': [{'video_ms': i*100, 'scene': 0, 'persons': [{'track_id': 1, 'box': [.2,.2,.3,.8], 'score': .8}]} for i in range(3)]}


def seed():
    return {'frame_index': 0, 'scene': 0, 'status': 'unreviewed', 'image_sha256': 'c'*64,
        'image_points': [[0,0],[1,0],[1,1],[0,1]], 'court_points': [[0,0],[40,0],[40,20],[0,20]],
        'floor_polygon': [[0,0],[1,0],[1,1],[0,1]]}


class PreparationTests(unittest.TestCase):
    def test_rejects_wrong_time_grid_duplicates_and_unbounded_samples(self):
        good = report(); validate_tracking(good)
        for kind in ('time', 'id', 'duration', 'hash'):
            data = copy.deepcopy(good)
            if kind == 'time': data['frames'][1]['video_ms'] = 500
            if kind == 'id': data['frames'][0]['persons'] *= 2
            if kind == 'duration': data['end_ms'] = 90001
            if kind == 'hash': data['source']['sha256'] = 'invalid'
            with self.assertRaises(ValueError): validate_tracking(data)

    def test_seed_requires_source_frame_scene_digest_and_unreviewed_state(self):
        good = {'schema': 'sesen.camera-seeds.v1', 'source_sha256': 'a'*64, 'seeds': [seed()]}
        self.assertIn(0, validate_seeds(good, report()))
        for patch in ({'scene': 1}, {'status': 'reviewed'}, {'image_sha256': ''}, {'image_points': [[0,0]]*4}):
            data = copy.deepcopy(good); data['seeds'][0].update(patch)
            with self.assertRaises(ValueError): validate_seeds(data, report())

    def test_colour_is_frame_local_and_overlap_clipping_and_low_support_remain_unknown(self):
        image = Image.new('RGB', (200,200), 'red')
        p = {'track_id': 1, 'box': [.1,.1,.6,.9], 'score': .9}; teams = {'red': 'A', 'white': 'B'}
        self.assertEqual(colour_observation(image, p, [p], teams)['team'], 'A')
        self.assertEqual(colour_observation(Image.new('RGB', (200,200), 'white'), p, [p], teams)['team'], 'B')
        other = {**p, 'track_id': 2}
        self.assertIsNone(colour_observation(image, p, [p, other], teams)['team'])
        self.assertIsNone(colour_observation(image, {**p, 'score': .2}, [p], teams)['team'])
        partial = {'track_id': 2, 'box': [.4,.1,.7,.9], 'score': .9}
        result = colour_observation(image, p, [p, partial], teams)
        self.assertEqual(result['team'], 'A'); self.assertEqual(result['reason'], 'colour_visible_only')

    def test_project_rejects_horizon_and_outside_court_without_clamping(self):
        self.assertEqual(project(np.diag([40,20,1]), [.5,.5]), [20,10])
        self.assertIsNone(project(np.diag([40,20,1]), [2,.5]))
        self.assertIsNone(project(np.zeros((3,3)), [.5,.5]))

    def test_camera_tracks_static_floor_then_resets_on_cut_and_blank_frames(self):
        rng = np.random.default_rng(17)
        image = Image.fromarray(rng.integers(0,255,(240,400,3),dtype=np.uint8))
        prepared = validate_seeds({'schema': 'sesen.camera-seeds.v1', 'source_sha256': 'a'*64, 'seeds': [seed()]}, report())[0]
        camera = CameraPreparation()
        q, matrix, _ = camera.step(image, [], 0, True, prepared)
        self.assertEqual(q['state'], 'estimated_seed')
        q, after, _ = camera.step(image, [], 1, False)
        self.assertEqual(q['state'], 'estimated_flow'); np.testing.assert_allclose(after, matrix, atol=1e-5)
        q, after, _ = camera.step(image, [], 2, True)
        self.assertEqual(q['state'], 'unavailable'); self.assertIsNone(after)
        camera.step(image, [], 3, False, prepared)
        q, after, _ = camera.step(Image.new('RGB', (400,240), 'black'), [], 4, False)
        self.assertEqual(q['state'], 'unavailable'); self.assertIsNone(after)


if __name__ == '__main__': unittest.main()
