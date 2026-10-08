"""Validate exported correspondences against their proposal frame; never approve calibration."""
import argparse
import json
import re
from pathlib import Path
from spatial_proposals import court_homography


def validate(proposals, feedback):
    if proposals.get('schema') != 'sesen.spatial-proposals.v1' or feedback.get('schema') != 'sesen.spatial-feedback.v1':
        raise ValueError('Unsupported review schema')
    if any(not re.fullmatch(r'[a-f0-9]{64}', str(proposals.get(key, ''))) for key in ('source_sha256','model_sha256')):
        raise ValueError('Valid source and model hashes are required')
    if feedback.get('source_sha256') != proposals.get('source_sha256') or feedback.get('model_sha256') != proposals.get('model_sha256'):
        raise ValueError('Review belongs to a different source or model')
    if feedback.get('confirmed_events') != []:
        raise ValueError('Spatial review must not contain canonical events')
    frames = {f['index']: f for f in proposals['frames']}
    results, seen = [], set()
    for review in feedback['frames']:
        index = review['frame_index']
        if index in seen or index not in frames:
            raise ValueError('Duplicate or unknown reviewed frame')
        seen.add(index)
        frame = frames[index]
        if not re.fullmatch(r'[a-f0-9]{64}', str(frame.get('image_sha256', ''))):
            raise ValueError('Valid frame image hash is required')
        if any(review.get(key) != frame.get(key) for key in ('video_ms', 'scene', 'image_sha256')):
            raise ValueError('Review frame provenance does not match')
        anchors = review['anchors']
        if not anchors:
            continue
        matrix = court_homography([a['image_point'] for a in anchors], [a['court_point'] for a in anchors])
        results.append({'frame_index': index, 'video_ms': frame['video_ms'], 'scene': frame['scene'], 'image_sha256': frame['image_sha256'], 'homography': matrix.tolist(), 'scope': 'this_exact_frame_only', 'geometrically_valid': True, 'calibration_approved': False})
    return {'schema':'sesen.calibration-validation.v1', 'source_sha256': proposals['source_sha256'], 'frames':results, 'confirmed_events':[], 'limitation':'Mathematical validity does not verify the chosen court landmarks; human approval remains required. No camera-motion compensation, distance or speed.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--proposals', type=Path, required=True)
    parser.add_argument('--feedback', type=Path, required=True)
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = validate(json.loads(args.proposals.read_text(encoding='utf-8')), json.loads(args.feedback.read_text(encoding='utf-8')))
    with args.out.open('x', encoding='utf-8') as stream:
        json.dump(result, stream, ensure_ascii=False, indent=2)
    print(f"Validated {len(result['frames'])} frame-bound calibrations; human approval pending")


if __name__ == '__main__':
    main()
