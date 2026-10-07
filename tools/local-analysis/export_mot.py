"""Export SESEN pilot tracks for optional MOT/CVAT review. No model or video upload."""
import argparse
import csv
import hashlib
import io
import json
import math
from pathlib import Path
import re
import zipfile


def number(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError('Invalid finite numeric value')
    return value


def integer(value, low, high):
    number(value, low, high)
    if int(value) != value:
        raise ValueError('Integer required')
    return int(value)


def digest(path):
    with path.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def convert(report, width, height):
    """Dense preview frames; source video time is retained separately, never game time."""
    width, height = integer(width, 1, 16384), integer(height, 1, 16384)
    if report.get('schema') != 'sesen.tracking-pilot.v1':
        raise ValueError('Unsupported tracking report')
    fps = integer(report['sample_fps'], 1, 60)
    start = integer(report['video_start_ms'], 0, 86400000)
    duration = integer(report['requested_duration_ms'], 1, 30000)
    observations = report['observations']
    if not isinstance(observations, list) or not 1 <= len(observations) <= 1800:
        raise ValueError('Invalid bounded preview frame count')
    if len(observations) > math.ceil(duration * fps / 1000):
        raise ValueError('Frame count exceeds preview duration')
    mot, annotations, timeline, ids = [], [], [], {}
    scene = 0
    for frame, observation in enumerate(observations, 1):
        stamp = integer(observation['video_ms'], start, start + duration)
        if abs(stamp - (start + (frame - 1) * 1000 / fps)) > 1:
            raise ValueError('Report is not a dense constant-rate preview grid')
        cut = observation.get('scene_cut_heuristic', False)
        if not isinstance(cut, bool):
            raise ValueError('Scene-cut flag must be boolean')
        if cut:
            scene += 1
        timeline.append([frame, stamp, scene])
        seen = set()
        persons = observation['persons']
        if not isinstance(persons, list) or len(persons) > 1000:
            raise ValueError('Invalid person observations')
        for person in persons:
            local_id = integer(person['track_id'], 1, 10000000)
            if local_id in seen or person.get('class') != 'person':
                raise ValueError('Duplicate frame/track or unsupported class')
            seen.add(local_id)
            score = number(person['score'], 0, 1)
            box = person['box']
            if not isinstance(box, list) or len(box) != 4:
                raise ValueError('A box needs four coordinates')
            x1, y1, x2, y2 = box
            number(x1, 0, width); number(x2, 0, width)
            number(y1, 0, height); number(y2, 0, height)
            if x2 <= x1 or y2 <= y1:
                raise ValueError('Box has no area')
            key = (scene, local_id)
            track = ids.setdefault(key, len(ids) + 1)
            # MOT uses 1-based boxes and frames. Pixel area remains unchanged.
            geometry = [round(x1 + 1, 4), round(y1 + 1, 4), round(x2 - x1, 4), round(y2 - y1, 4)]
            mot.append([frame, track, *geometry, score, -1, -1, -1])
            # CVAT's file name is gt.txt, but these are explicitly unreviewed suggestions.
            # visibility=1 is a format default, not measured visibility/confidence.
            annotations.append([frame, track, *geometry, 1, 1, 1])
    mapping = [{'export_track_id': export_id, 'scene': key[0], 'pilot_track_id': key[1]} for key, export_id in ids.items()]
    return mot, annotations, timeline, mapping


def csv_text(rows):
    stream = io.StringIO(newline='')
    csv.writer(stream, lineterminator='\n').writerows(rows)
    return stream.getvalue()


def export(report_path, output, width, height, name, source):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,63}', name):
        raise ValueError('Unsafe sequence name')
    report_path, source = Path(report_path).resolve(strict=True), Path(source).resolve(strict=True)
    output = Path(output).resolve()
    if output == source or output == report_path or output.exists():
        raise ValueError('A new output directory is required; no overwrite')
    content = report_path.read_bytes()
    report = json.loads(content)
    mot, annotations, timeline, mapping = convert(report, width, height)
    before = source.stat()
    source_hash = digest(source)
    after = source.stat()
    if (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
        raise ValueError('Source changed while hashing')
    output.mkdir(parents=True, exist_ok=False)
    (output / 'tracks.txt').write_text(csv_text(mot), encoding='utf-8')
    (output / 'frame-times.csv').write_text(csv_text([['preview_frame', 'source_video_ms', 'scene'], *timeline]), encoding='utf-8')
    fps = report['sample_fps']
    seqinfo = f'[Sequence]\nname={name}\nimDir=img1\nframeRate={fps}\nseqLength={len(timeline)}\nimWidth={width}\nimHeight={height}\nimExt=.jpg\n'
    (output / 'seqinfo.ini').write_text(seqinfo, encoding='utf-8')
    manifest = {
        'schema': 'sesen.mot-interchange.v1', 'sequence': name, 'review_status': 'unreviewed',
        'source_sha256': source_hash, 'source_size_bytes': before.st_size,
        'tracking_report_sha256': hashlib.sha256(content).hexdigest(),
        'source_binding': 'Caller-supplied source; hash identifies the file, not proof this report was inferred from it',
        'sample_fps': fps, 'width': width, 'height': height, 'dimensions_provenance': 'Explicit caller input; verify against the unannotated preview',
        'frames': len(timeline), 'boxes': len(mot), 'track_id_mapping': mapping,
        'time_basis': 'Dense preview grid generated by render_preview.py; source timestamps are nominal preview samples, not original decoded PTS or game clock',
        'identity': 'Scene-local person tracklets; not player identity or reviewed athlete tracks',
        'cvat_visibility': 'Format default 1; not measured; review every box and visibility',
        'included_media': False, 'tracker': report.get('tracker'), 'model': report.get('model'),
        'evaluation': 'No ground truth or accuracy score generated; do not evaluate against these same predictions',
    }
    serialized = json.dumps(manifest, ensure_ascii=False, indent=2)
    (output / 'manifest.json').write_text(serialized, encoding='utf-8')
    with zipfile.ZipFile(output / 'cvat-review.zip', 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('gt/gt.txt', csv_text(annotations))
        archive.writestr('gt/labels.txt', 'person\n')
        archive.writestr('SESEN_UNREVIEWED.json', serialized)
    print(json.dumps({'output': str(output), 'frames': len(timeline), 'boxes': len(mot), 'tracks': len(mapping), 'review_status': 'unreviewed'}))
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report', required=True)
    parser.add_argument('--source', required=True, help='Local original video, hashed only; never copied')
    parser.add_argument('--output', required=True)
    parser.add_argument('--width', type=int, required=True)
    parser.add_argument('--height', type=int, required=True)
    parser.add_argument('--name', default='sesen-pilot')
    args = parser.parse_args()
    export(args.report, args.output, args.width, args.height, args.name, args.source)
