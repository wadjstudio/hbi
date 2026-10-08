"""Pinned, optional Supervision ByteTrack adapter; current observations only."""
from importlib.metadata import version
import math
import numpy as np


class ByteTrackMatcher:
    def __init__(self, fps=10):
        if not isinstance(fps, int) or isinstance(fps, bool) or not 5 <= fps <= 25:
            raise ValueError('Tracking FPS must be an integer in 5..25')
        if version('supervision') != '0.27.0':
            raise RuntimeError('Use the pinned optional supervision==0.27.0 environment')
        from supervision import ByteTrack
        self.tracker = ByteTrack(track_activation_threshold=0.35, lost_track_buffer=30, minimum_matching_threshold=0.8, frame_rate=fps, minimum_consecutive_frames=1)

    def reset(self):
        self.tracker.reset()

    def update(self, detections):
        rows = []
        for detection in detections:
            box, score = detection['box'], detection['score']
            if len(box) != 4 or not all(math.isfinite(v) for v in [*box, score]) or not 0 <= score <= 1 or box[2] <= box[0] or box[3] <= box[1] or detection.get('class') != 'person':
                raise ValueError('Invalid person detection')
            rows.append([*box, score])
        # ByteTrack buffers lost states internally, but emits only currently
        # matched, activated tracks here: no predicted boxes during occlusion.
        tracks = self.tracker.update_with_tensors(np.asarray(rows, dtype=np.float32).reshape(-1, 5))
        return [{'box': [round(float(v), 2) for v in track.tlbr], 'score': round(float(track.score), 4), 'class': 'person', 'track_id': int(track.external_track_id), 'position_basis': 'Kalman-filtered current detection'} for track in tracks]
