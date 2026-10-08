"""Prepare a bounded dense annotation sequence from a verified local preview."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time

from PIL import Image
from detector import PersonDetector
from export_mot import digest, integer


def build(args):
    comparison, out = args.comparison.resolve(strict=True), args.out.resolve()
    offset, count = integer(args.offset_frame, 0, 599), integer(args.frames, 2, 150)
    report_bytes = (comparison / 'comparison.json').read_bytes()
    report = json.loads(report_bytes)
    if report.get('schema') != 'sesen.tracking-comparison.v1' or report['sample_fps'] != 10 or report['width'] != 960 or report['height'] != 540:
        raise ValueError('Expected the verified 960x540, 10fps comparison')
    if offset + count > report['frames'] or len(report['observations']) != report['frames']:
        raise ValueError('Requested sequence is outside the comparison')
    if out.exists() or out == comparison or out in comparison.parents:
        raise ValueError('A new output directory is required')
    media = comparison / 'raw-preview.mp4'
    verification = json.loads((comparison / 'media-verification.json').read_text(encoding='utf-8'))['raw-preview.mp4']
    before = media.stat()
    media_hash = digest(media)
    if media_hash != verification['sha256'] or before.st_size != verification['bytes']:
        raise ValueError('Unannotated derivative does not match its verified manifest')
    ffmpeg, ffprobe = shutil.which('ffmpeg'), shutil.which('ffprobe')
    if not ffmpeg or not ffprobe:
        raise RuntimeError('FFmpeg / FFprobe required')
    probe = json.loads(subprocess.check_output([ffprobe,'-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames','-of','json',str(media)]))['streams'][0]
    if (probe['width'],probe['height'],probe['r_frame_rate'],int(probe['nb_frames'])) != (960,540,'10/1',report['frames']):
        raise ValueError('Derivative geometry/frame grid does not match the comparison')
    detector = PersonDetector(args.model, threshold=.1, nms_threshold=.65) if args.model else None
    out.mkdir(parents=True, exist_ok=False)
    images = out / 'frames'
    images.mkdir()
    started = time.perf_counter()
    with (out / 'decode.log').open('xb') as log:
        subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-threads','1','-i',str(media),'-vf',f'select=between(n\\,{offset}\\,{offset+count-1})','-fps_mode','vfr','-q:v','2',str(images/'%06d.jpg')],stderr=log,stdout=subprocess.DEVNULL,check=True,timeout=120)
    files = sorted(images.glob('*.jpg'))
    if len(files) != count:
        raise RuntimeError('Incomplete frame extraction; no complete sequence emitted')
    frames = []
    for i, filename in enumerate(files):
        row = report['observations'][offset+i]
        stamp = report['video_start_ms'] + (offset+i)*100
        if row['video_ms'] != stamp:
            raise ValueError('Comparison source time grid is inconsistent')
        image = Image.open(filename).convert('RGB')
        if image.size != (960,540):
            raise ValueError('Extracted frame geometry changed')
        proposals, timings = detector.detect_classes(image, {32:.1}) if detector else ({'sports_ball':[]},None)
        suggestions = [{'id':f"model-{row['scene']}-{p['track_id']}", 'box':[p['box'][0]/960,p['box'][1]/540,p['box'][2]/960,p['box'][3]/540], 'score':p['score']} for p in row['candidate']]
        balls = [{**p,'box':[p['box'][0]/960,p['box'][1]/540,p['box'][2]/960,p['box'][3]/540]} for p in proposals['sports_ball']]
        frames.append({'index':i,'comparison_frame':offset+i+1,'video_ms':stamp,'scene':row['scene'],'cut_heuristic':row['scene_cut_heuristic'],'image':f'frames/{filename.name}','image_sha256':digest(filename),'person_suggestions':suggestions,'ball_proposals':balls,'ball_prediction_status':'complete' if detector else 'not_run','timings':timings})
        if (i+1)%10==0:
            progress={'frames':i+1,'target':count,'elapsed_seconds':round(time.perf_counter()-started,2)}
            (out/'progress.json').write_text(json.dumps(progress),encoding='utf-8')
            print(json.dumps(progress),flush=True)
    after = media.stat()
    if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):
        raise ValueError('Derivative changed during processing')
    sequence={'schema':'sesen.annotation-sequence.v1','source_sha256':report['source_sha256'],'derivative_sha256':media_hash,'comparison_sha256':hashlib.sha256(report_bytes).hexdigest(),'width':960,'height':540,'sample_fps':10,'frames':frames,'ball_model_sha256':detector.model_sha256 if detector else None,'ball_threshold':.1 if detector else None,'usage_rights':'not_reviewed','approved_for_training':False,'elapsed_seconds':round(time.perf_counter()-started,2),'time_basis':'Nominal source grid from a previously verified bounded derivative, not original decoded PTS or game clock','limitations':['Model suggestions are unreviewed and may include spectators/referees/duplicate boxes','Human IDs are scene-local review identities, never roster identities','No inferred trajectories, automatic tactical events or confirmed match mutations','Original source hash is inherited from verified prior comparison; original file was not rehashed in this extraction','Media rights must be cleared independently before training or publishing a dataset']}
    sequence['sequence_id']=hashlib.sha256(json.dumps(sequence,sort_keys=True).encode()).hexdigest()
    (out/'sequence.json').write_text(json.dumps(sequence,ensure_ascii=False,indent=2),encoding='utf-8')
    for source_name, output_name in [('annotation_review.html','index.html'),('annotation_review.css','annotation_review.css'),('annotation_review.mjs','annotation_review.mjs'),('annotation_contract.mjs','annotation_contract.mjs')]:
        (out/output_name).write_bytes(Path(__file__).with_name(source_name).read_bytes())
    print(json.dumps({'complete':True,'frames':count,'ball_proposals':sum(len(f['ball_proposals']) for f in frames),'elapsed_seconds':sequence['elapsed_seconds']}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--comparison',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--model',type=Path)
    parser.add_argument('--offset-frame',type=int,default=100)
    parser.add_argument('--frames',type=int,default=120)
    build(parser.parse_args())
