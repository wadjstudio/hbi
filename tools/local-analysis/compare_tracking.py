"""Controlled local baseline/ByteTrack comparison; not tactical event detection."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import time

import numpy as np
from PIL import Image
from byte_tracker import ByteTrackMatcher
from detector import PersonDetector, ShortTrackMatcher


def read_frame(stream, count):
    data = bytearray()
    while len(data) < count:
        chunk = stream.read(count - len(data))
        if not chunk:
            break
        data.extend(chunk)
    if data and len(data) != count:
        raise RuntimeError('Truncated decoded frame')
    return bytes(data)


def cut_score(image, previous):
    current = np.asarray(image.resize((32, 18)), dtype=np.float32)
    score = float(np.abs(current - previous).mean()) if previous is not None else 0
    return current, score


def summarize(rows, key):
    tracks, detections, empty, recoveries, last_seen = set(), 0, 0, 0, {}
    for frame, row in enumerate(rows):
        persons = row[key]
        empty += not persons
        detections += len(persons)
        for person in persons:
            identity = (row['scene'], person['track_id'])
            tracks.add(identity)
            if identity in last_seen and frame - last_seen[identity] > 1:
                recoveries += 1
            last_seen[identity] = frame
    return {'emitted_boxes': detections, 'scene_local_tracklets': len(tracks), 'frames_without_emitted_tracks': empty, 'gaps_followed_by_same_id': recoveries}


def run(args):
    if not math.isfinite(args.start) or args.start < 0 or not 1 <= args.duration <= 90:
        raise ValueError('Use a bounded 1..90 second preview and valid source start')
    source, out = Path(args.video).resolve(strict=True), Path(args.output).resolve()
    if out.exists() or out == source or source in out.parents:
        raise ValueError('A new separate output directory is required')
    ffmpeg = shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('FFmpeg required')
    baseline = PersonDetector(args.tiny_model)
    candidate = PersonDetector(args.small_model, threshold=0.1, nms_threshold=0.65)
    if baseline.model_name != 'YOLOX-tiny/COCO' or candidate.model_name != 'YOLOX-S/COCO':
        raise ValueError('Comparison requires tiny baseline and S candidate')
    baseline_tracker, ablation_tracker, tracker = ShortTrackMatcher(), ShortTrackMatcher(), ByteTrackMatcher(fps=10)
    before = source.stat()
    with source.open('rb') as stream:
        source_hash = hashlib.file_digest(stream, 'sha256').hexdigest()
    out.mkdir(parents=True, exist_ok=False)
    width, height, fps = 960, 540, 10
    observations, previous, scene = [], None, 0
    started = time.perf_counter()
    with (out / 'decode.log').open('wb') as log, (out / 'observations.jsonl').open('x', encoding='utf-8') as journal:
        decode = subprocess.Popen([ffmpeg, '-hide_banner','-loglevel','error','-nostdin','-threads','1','-ss',str(args.start),'-i',str(source),'-t',str(args.duration),'-vf',f'fps={fps},scale={width}:{height}','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE,stderr=log)
        try:
            index, old = 0, []
            while data := read_frame(decode.stdout, width * height * 3):
                image = Image.frombytes('RGB', (width, height), data)
                previous, change = cut_score(image, previous)
                cut = change > 35
                if cut:
                    scene += 1
                    baseline_tracker.reset(); ablation_tracker.reset(); tracker.reset()
                    old = []
                # The left baseline is sampled at the original 5fps. On odd
                # comparison frames its previous image/boxes are held for display.
                baseline_elapsed = None
                if index % 2 == 0:
                    old_detections, baseline_elapsed = baseline.detect(image)
                    old = baseline_tracker.update(old_detections)
                detections, elapsed = candidate.detect(image)
                tracks = tracker.update(detections)
                ablation = ablation_tracker.update(detections)
                row = {'preview_frame':index+1,'video_ms':round((args.start+index/fps)*1000),'scene':scene,'scene_cut_heuristic':cut,'cut_score':round(change,3),'baseline_sampled':index%2==0,'baseline_seconds':baseline_elapsed,'candidate_seconds':elapsed,'baseline':old,'candidate_detections':detections,'candidate':tracks,'same_detector_iou':ablation}
                observations.append(row)
                journal.write(json.dumps(row)+'\n'); journal.flush()
                if index in [0,50,100,150,200,300,450,599]:
                    image.save(out / f'source-frame-{index:04}.jpg', quality=94)
                index += 1
                if index % 20 == 0:
                    (out / 'progress.json').write_text(json.dumps({'frames':index,'target_frames':args.duration*fps,'elapsed_seconds':round(time.perf_counter()-started,1),'status':'running'}),encoding='utf-8')
                    print(f'Analyzed {index}/{args.duration*fps} frames in {time.perf_counter()-started:.1f}s',flush=True)
            decode.stdout.close()
            if decode.wait(timeout=30):
                raise RuntimeError('Decoder failed; see local log')
        finally:
            if decode.poll() is None:
                decode.terminate(); decode.wait(timeout=10)
    after = source.stat()
    if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):
        raise RuntimeError('Source changed during comparison')
    if len(observations) != args.duration*fps:
        raise RuntimeError('Incomplete bounded preview; no complete report emitted')
    sampled = [row for row in observations if row['baseline_sampled']]
    report = {'schema':'sesen.tracking-comparison.v1','review_status':'unreviewed','source_sha256':source_hash,'source_size_bytes':before.st_size,'video_start_ms':round(args.start*1000),'duration_ms':args.duration*1000,'sample_fps':fps,'width':width,'height':height,'frames':len(observations),'elapsed_seconds':round(time.perf_counter()-started,2),'baseline':{'model':baseline.model_name,'sha256':baseline.model_sha256,'fps':5,'detection_threshold':0.35,'nms_threshold':0.45,'tracker':'one-frame IoU','summary':summarize(sampled,'baseline')},'candidate':{'model':candidate.model_name,'sha256':candidate.model_sha256,'fps':10,'detection_threshold':0.1,'nms_threshold':0.65,'tracker':'Supervision 0.27.0 ByteTrack','activation_threshold':0.35,'new_track_threshold':0.45,'lost_buffer_seconds':1,'summary':summarize(observations,'candidate')},'same_detector_iou':summarize(observations,'same_detector_iou'),'cut_reset':{'heuristic':'mean absolute RGB difference of 32x18 thumbnail >35','resets':scene,'reliable_scene_segmentation':False},'limitations':['Counts are diagnostic, not accuracy, recall or proven player identities','Detector, thresholds, NMS, frame rate and tracker change together in the visual comparison; tracker-only diagnostic uses identical candidate detections with IoU','Buffered lost tracks are not drawn; only current matched observations use Kalman-filtered boxes','Camera motion, spectators, referees, occlusion and ID switches remain possible','No ball model, court calibration, team classification, tactical recognition or confirmed match event','Preview timestamps are nominal source-video samples, not game clock'], 'observations':observations}
    (out/'comparison.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    (out/'progress.json').write_text(json.dumps({'frames':len(observations),'status':'complete','elapsed_seconds':report['elapsed_seconds']}),encoding='utf-8')
    print(json.dumps({key:report[key] for key in ['frames','elapsed_seconds','baseline','candidate','same_detector_iou']}))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video',required=True)
    parser.add_argument('--tiny-model',required=True)
    parser.add_argument('--small-model',required=True)
    parser.add_argument('--output',required=True)
    parser.add_argument('--start',type=float,required=True)
    parser.add_argument('--duration',type=int,default=60)
    run(parser.parse_args())
