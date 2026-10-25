"""Source-bound colour and camera preparation; every inferred result remains unreviewed."""
import argparse
import hashlib
import json
import math
import re
from pathlib import Path
import shutil
import subprocess

import numpy as np
from PIL import Image
from spatial_proposals import jersey_colour, court_homography


def validate_tracking(data):
    if data.get('schema') != 'sesen.workbench-tracking.v1' or data.get('time_basis') != 'nominal-source-samples':
        raise ValueError('Expected nominal source-bound tracking samples')
    source, model = data['source'], data['engine']
    if not all(re.fullmatch(r'[a-f0-9]{64}', str(v)) for v in (source['sha256'], model['model_sha256'])):
        raise ValueError('Source/model digests required')
    fps, start, end = data['sample_fps'], data['start_ms'], data['end_ms']
    if type(fps) is not int or not 1 <= fps <= 60 or not 0 <= start < end <= source['duration_ms'] or end-start > 90000:
        raise ValueError('Invalid sample duration/rate')
    if not 1 <= len(data['frames']) <= 900 or len(data['frames']) != (end-start)*fps/1000:
        raise ValueError('Incomplete sample grid')
    previous = data['frames'][0]['scene']
    for i, frame in enumerate(data['frames']):
        if abs(frame['video_ms']-round(start+i*1000/fps)) > 1 or frame['scene'] not in (previous, previous+1) or len(frame['persons']) > 100:
            raise ValueError('Invalid sample time/scene')
        previous = frame['scene']; ids = set()
        for p in frame['persons']:
            if type(p['track_id']) is not int or p['track_id'] <= 0 or p['track_id'] in ids:
                raise ValueError('Invalid/duplicate track')
            ids.add(p['track_id']); b = p['box']
            if len(b) != 4 or not all(type(v) in (int, float) and math.isfinite(v) and -2 <= v <= 3 for v in b) or b[2] <= b[0] or b[3] <= b[1] or not 0 <= p['score'] <= 1:
                raise ValueError('Invalid observed box/score')
    return data


def project(matrix, point):
    value = matrix @ np.array([*point, 1.0])
    if not np.isfinite(value).all() or abs(value[2]) < 1e-8:
        return None
    xy = value[:2] / value[2]
    return [round(float(v), 4) for v in xy] if 0 <= xy[0] <= 40 and 0 <= xy[1] <= 20 else None


def colour_observation(image, person, others, teams):
    box = person['box']
    if person['score'] < .5 or any(v < 0 or v > 1 for v in box):
        return {'group': 'unknown', 'support': 0.0, 'team': None, 'reason': 'low_score_or_clipped'}
    x1, y1, x2, y2 = box
    # Avoid reading a neighbour's jersey through an overlapping torso.
    torso = [x1 + (x2-x1)*.25, y1 + (y2-y1)*.18, x2 - (x2-x1)*.25, y1 + (y2-y1)*.55]
    area = (torso[2]-torso[0]) * (torso[3]-torso[1])
    overlapping = []
    for other in others:
        if other['track_id'] == person['track_id']:
            continue
        b = other['box']
        overlap = max(0, min(torso[2], b[2])-max(torso[0], b[0])) * max(0, min(torso[3], b[3])-max(torso[1], b[1]))
        if area <= 0 or overlap / area > .25:
            overlapping.append(b)
    if overlapping:
        # Use only the visible torso patch, never a neighbour's pixels or a remembered track label.
        bounds = [max(0,int(torso[0]*image.width)), max(0,int(torso[1]*image.height)),
            min(image.width,int(torso[2]*image.width)), min(image.height,int(torso[3]*image.height))]
        crop = image.crop(bounds); hsv = np.asarray(crop.convert('HSV'),dtype=float)/255
        if hsv.size == 0:
            return {'group': 'unknown', 'support': 0.0, 'team': None, 'reason': 'torso_overlap'}
        visible = np.ones(hsv.shape[:2],bool)
        for b in overlapping:
            left, top = max(0,int(b[0]*image.width)-bounds[0]), max(0,int(b[1]*image.height)-bounds[1])
            right, bottom = min(crop.width,int(math.ceil(b[2]*image.width))-bounds[0]), min(crop.height,int(math.ceil(b[3]*image.height))-bounds[1])
            visible[top:bottom,left:right] = False
        if visible.sum() < 30 or visible.mean() < .4:
            return {'group': 'unknown', 'support': 0.0, 'team': None, 'reason': 'torso_overlap'}
        hue,sat,value = hsv[...,0][visible],hsv[...,1][visible],hsv[...,2][visible]
        light = value > .18
        masks = {'red': ((hue < .045)|(hue > .95)) & (sat > .5) & light,
            'white': (sat < .22)&(value > .62), 'green': (hue > .22)&(hue < .46)&(sat > .4)&light,
            'cyan': (hue >= .46)&(hue < .58)&(sat > .4)&light}
        ranked = sorted(((float(v.mean()),k) for k,v in masks.items()),reverse=True)
        support, group = ranked[0]
        if support < .35 or support-ranked[1][0] < .15: group = 'unknown'
        return {'group':group,'support':round(support,4),'team':teams.get(group),'reason':'colour_visible_only'}
    pixels = [x1*image.width, y1*image.height, x2*image.width, y2*image.height]
    result = jersey_colour(image, pixels)
    return {**result, 'team': teams.get(result['group']), 'reason': 'colour_only'}


def validate_seeds(data, tracking):
    if data.get('schema') != 'sesen.camera-seeds.v1' or data.get('source_sha256') != tracking['source']['sha256']:
        raise ValueError('Camera seeds belong to another source')
    seeds = {}
    for seed in data['seeds']:
        index = seed['frame_index']
        if type(index) is not int or not 0 <= index < len(tracking['frames']) or index in seeds:
            raise ValueError('Invalid or duplicate camera seed frame')
        frame = tracking['frames'][index]
        if seed['scene'] != frame['scene'] or seed.get('status') != 'unreviewed':
            raise ValueError('Seed scene/status mismatch')
        if not re.fullmatch(r'[a-f0-9]{64}', str(seed.get('image_sha256', ''))):
            raise ValueError('Seeds require an exact decoded-frame digest')
        polygon = np.asarray(seed['floor_polygon'], dtype=float)
        if polygon.ndim != 2 or polygon.shape[1] != 2 or not 3 <= len(polygon) <= 12 or not np.isfinite(polygon).all() or (polygon < 0).any() or (polygon > 1).any():
            raise ValueError('Invalid floor mask')
        seed = {**seed, 'matrix': court_homography(seed['image_points'], seed['court_points'])}
        seeds[index] = seed
    return seeds


class CameraPreparation:
    def __init__(self):
        import cv2
        self.cv = cv2
        self.matrix = None
        self.polygon = None
        self.previous = None
        self.anchor = None

    def step(self, image, persons, index, scene_changed, seed=None):
        cv = self.cv
        gray = cv.cvtColor(np.asarray(image), cv.COLOR_RGB2GRAY)
        h, w = gray.shape
        if scene_changed:
            self.matrix = self.polygon = self.previous = self.anchor = None
        quality = None
        if seed is not None:
            self.matrix = seed['matrix'].copy()
            self.polygon = np.asarray(seed['floor_polygon'], np.float32) * [w, h]
            self.anchor = index
            quality = {'state': 'estimated_seed', 'matches': 0, 'holdout_error_px': None}
        elif self.matrix is not None and self.previous is not None:
            mask = np.zeros_like(gray)
            cv.fillPoly(mask, [np.round(self.polygon).astype(np.int32)], 255)
            for p in self.previous_persons:
                b = p['box']; cv.rectangle(mask, (max(0, int(b[0]*w)-5), max(0, int(b[1]*h)-5)),
                    (min(w-1, int(b[2]*w)+5), min(h-1, int(b[3]*h)+5)), 0, -1)
            points = cv.goodFeaturesToTrack(self.previous, 300, .02, 12, mask=mask)
            flow = None
            if points is not None and len(points) >= 30:
                moved, status, _ = cv.calcOpticalFlowPyrLK(self.previous, gray, points, None)
                if moved is None or status is None:
                    moved, status = points.copy(), np.zeros((len(points), 1), np.uint8)
                back, back_status, _ = cv.calcOpticalFlowPyrLK(gray, self.previous, moved, None)
                if back is None or back_status is None:
                    back, back_status = points.copy(), np.zeros((len(points), 1), np.uint8)
                valid = (status.ravel() == 1) & (back_status.ravel() == 1) & (np.linalg.norm(back-points, axis=2).ravel() < 1)
                src, dst = points[valid].reshape(-1, 2), moved[valid].reshape(-1, 2)
                if len(src) >= 25:
                    train = np.arange(len(src)) % 5 != 0
                    flow, inliers = cv.findHomography(src[train], dst[train], cv.RANSAC, 2)
                    if flow is not None and inliers is not None:
                        estimated = cv.perspectiveTransform(src[~train].reshape(-1, 1, 2), flow).reshape(-1, 2)
                        error = float(np.median(np.linalg.norm(estimated-dst[~train], axis=1)))
                        fraction = float(inliers.mean())
                        coverage = cv.contourArea(cv.convexHull(src.astype(np.float32))) / (w*h)
                        if error > 2.5 or fraction < .7 or np.linalg.cond(flow) > 1e8 or coverage < .03:
                            flow = None
                        else:
                            quality = {'state': 'estimated_flow', 'matches': int(len(src)), 'holdout_error_px': round(error, 4)}
            if flow is None:
                self.matrix = self.polygon = self.anchor = None
            else:
                # Each transition estimates a new transform; never reuse a stationary homography during pan.
                normalize = np.diag([w, h, 1.0])
                self.matrix = self.matrix @ np.linalg.inv(normalize) @ np.linalg.inv(flow) @ normalize
                self.matrix /= self.matrix[2, 2]
                self.polygon = cv.perspectiveTransform(self.polygon.astype(np.float32).reshape(-1, 1, 2), flow).reshape(-1, 2)
                normalized = self.polygon / [w, h]
                denominators = np.column_stack([normalized, np.ones(len(normalized))]) @ self.matrix[2]
                if not ((denominators > 1e-8).all() or (denominators < -1e-8).all()):
                    self.matrix = self.polygon = self.anchor = None
        self.previous, self.previous_persons = gray, persons
        if self.matrix is None or not np.isfinite(self.matrix).all():
            self.matrix = None
            return {'state': 'unavailable', 'anchor_frame_index': None}, None, None
        return {**quality, 'anchor_frame_index': self.anchor}, self.matrix, self.polygon


def prepare(tracking_path, video, output, seeds_path=None, team_a='red', team_b='white'):
    if team_a == team_b or team_a not in ('red', 'white', 'green', 'cyan') or team_b not in ('red', 'white', 'green', 'cyan'):
        raise ValueError('Two different supported kit colours are required')
    tracking_path, video, output = Path(tracking_path), Path(video), Path(output)
    if output.exists() or tracking_path.stat().st_size > 10*1024*1024:
        raise ValueError('Choose a new output folder and bounded tracking report')
    tracking = validate_tracking(json.loads(tracking_path.read_text(encoding='utf8')))
    source = tracking['source']; before = video.stat()
    with video.open('rb') as stream:
        if hashlib.file_digest(stream, 'sha256').hexdigest() != source['sha256'] or before.st_size != source['size_bytes']:
            raise ValueError('Original video SHA256/size mismatch')
    probe = json.loads(subprocess.run([shutil.which('ffprobe') or 'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(video)],
        capture_output=True, encoding='utf-8', check=True, timeout=60).stdout)
    stream = next(s for s in probe['streams'] if s['codec_type'] == 'video')
    if (stream['width'], stream['height']) != (source['width'], source['height']) or abs(float(probe['format']['duration'])*1000-source['duration_ms']) > 1000:
        raise ValueError('Source geometry/duration mismatch')
    output.mkdir(parents=True, exist_ok=False)
    subprocess.run([shutil.which('ffmpeg') or 'ffmpeg', '-nostdin', '-v', 'error', '-ss', str(tracking['start_ms']/1000), '-i', str(video),
        '-t', str((tracking['end_ms']-tracking['start_ms'])/1000), '-vf', f"fps={tracking['sample_fps']}", '-q:v', '3', '-start_number', '0', str(output/'frame-%04d.jpg')], check=True, timeout=600)
    if len(list(output.glob('frame-*.jpg'))) != len(tracking['frames']):
        raise ValueError('Decoded frame count differs from the nominal tracking grid')
    seeds = validate_seeds(json.loads(Path(seeds_path).read_text(encoding='utf8')), tracking) if seeds_path else {}
    camera = CameraPreparation() if seeds else None
    frames = []; teams = {team_a: 'A', team_b: 'B'}
    for i, original in enumerate(tracking['frames']):
        image_path = output/f'frame-{i:04d}.jpg'
        digest = hashlib.sha256(image_path.read_bytes()).hexdigest()
        image = Image.open(image_path).convert('RGB')
        seed = seeds.get(i)
        if seed and digest != seed['image_sha256']:
            raise ValueError('Seed belongs to a different decoded frame')
        changed = i == 0 or original['scene'] != tracking['frames'][i-1]['scene']
        quality, matrix, polygon = camera.step(image, original['persons'], i, changed, seed) if camera else ({'state': 'unavailable', 'anchor_frame_index': None}, None, None)
        people = []
        for person in original['persons']:
            colour = colour_observation(image, person, original['persons'], teams)
            b = person['box']; foot = [(b[0]+b[2])/2, b[3]]
            on_floor = matrix is not None and camera.cv.pointPolygonTest(polygon.astype(np.float32), (foot[0]*image.width, foot[1]*image.height), False) >= 0
            point = project(matrix, foot) if on_floor and all(0 <= v <= 1 for v in b) else None
            people.append({'track_id': person['track_id'], 'colour': colour, 'court_point': point})
        frames.append({'frame_index': i, 'video_ms': original['video_ms'], 'scene': original['scene'], 'image': image_path.name,
            'image_sha256': digest, 'calibration': quality, 'persons': people})
        if i % 50 == 0:
            print(json.dumps({'frame': i, 'calibrated': quality['state'] != 'unavailable'}), flush=True)
    after = video.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise ValueError('Original changed during preparation')
    result = {'schema': 'sesen.spatial-preparation.v1', 'status': 'unreviewed', 'source': source,
        'tracking_model_sha256': tracking['engine']['model_sha256'], 'time_basis': tracking['time_basis'],
        'team_colours': {'A': team_a, 'B': team_b}, 'frames': frames, 'confirmed_events': [],
        'limitations': ['Colour groups are not confirmed teams or athlete identities', 'Ground points use unreviewed seed landmarks and estimated camera flow',
            'Missing calibration has null coordinates; no ball or tactical event is inferred', 'Source times follow the inherited nominal sample grid']}
    with (output/'preparation.json').open('x', encoding='utf8') as f:
        json.dump(result, f, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    print(json.dumps({'complete': True, 'frames': len(frames), 'calibrated_frames': sum(f['calibration']['state'] != 'unavailable' for f in frames),
        'classified_observations': sum(p['colour']['team'] is not None for f in frames for p in f['persons'])}), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--tracking', required=True); parser.add_argument('--video', required=True)
    parser.add_argument('--out', required=True); parser.add_argument('--seeds')
    parser.add_argument('--team-a', default='red'); parser.add_argument('--team-b', default='white')
    args = parser.parse_args()
    prepare(args.tracking, args.video, args.out, args.seeds, args.team_a, args.team_b)
