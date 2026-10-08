"""Validate human frame reviews; export bounded COCO review data and ball diagnostics."""
import argparse
import hashlib
import json
from pathlib import Path
import re

from export_mot import integer, number


def box(value):
    if not isinstance(value,list) or len(value)!=4:
        raise ValueError('Four normalized coordinates required')
    for v in value:
        number(v,0,1)
    if value[2]<=value[0] or value[3]<=value[1]:
        raise ValueError('Box has no area')
    return value


def validate(sequence, review):
    if sequence.get('schema')!='sesen.annotation-sequence.v1' or review.get('schema')!='sesen.annotation-review.v1':
        raise ValueError('Unsupported sequence/review schema')
    for key in ('sequence_id','source_sha256','derivative_sha256'):
        if not re.fullmatch(r'[a-f0-9]{64}',str(sequence.get(key,''))) or review.get(key)!=sequence[key]:
            raise ValueError('Review/source binding mismatch')
    for key in ('width','height'):
        integer(sequence[key],1,16384)
        if review.get(key)!=sequence[key]:
            raise ValueError('Review geometry mismatch')
    if review.get('confirmed_events')!=[] or not isinstance(review.get('frames'),list):
        raise ValueError('Reviews must have no canonical events')
    if not isinstance(sequence['frames'],list) or not 2<=len(sequence['frames'])<=150 or len(review['frames'])>len(sequence['frames']):
        raise ValueError('Invalid bounded frame count')
    source_frames={f['index']:f for f in sequence['frames']}
    if len(source_frames)!=len(sequence['frames']) or sorted(source_frames)!=list(range(len(sequence['frames']))):
        raise ValueError('Sequence frames must be dense and unique')
    seen=set()
    for frame in review['frames']:
        index=integer(frame['frame_index'],0,len(sequence['frames'])-1)
        original=source_frames[index]
        if index in seen or frame.get('source_video_ms')!=original['video_ms'] or frame.get('scene')!=original['scene'] or frame.get('image_sha256')!=original['image_sha256']:
            raise ValueError('Duplicate or mismatched reviewed frame')
        if not re.fullmatch(r'[a-f0-9]{64}',str(original['image_sha256'])):
            raise ValueError('Invalid image hash')
        seen.add(index)
        if not isinstance(frame.get('persons_complete'),bool) or not isinstance(frame.get('persons'),list) or len(frame['persons'])>100:
            raise ValueError('Invalid person review')
        identities=set(); predictions={p['id'] for p in original['person_suggestions']}
        for person in frame['persons']:
            identity=person['identity']
            if not isinstance(identity,str) or not re.fullmatch(r'[A-Za-z0-9_-]{1,64}',identity) or identity in identities:
                raise ValueError('Invalid or duplicate scene-local person identity')
            identities.add(identity); box(person['box'])
            if person.get('role') not in ('player','referee','staff','unknown') or person.get('kit_colour') not in ('red','white','green','cyan','unknown') or person.get('origin') not in ('manual','reviewed_prediction'):
                raise ValueError('Invalid person attributes')
            prediction=person.get('source_prediction_id')
            if 'source_prediction_id' not in person:
                raise ValueError('Source prediction link must be explicit or null')
            if prediction is not None and prediction not in predictions:
                raise ValueError('Unknown source prediction')
        ignored=frame.get('ignored_prediction_ids')
        if not isinstance(ignored,list) or any(not isinstance(i,str) or i not in predictions for i in ignored) or len(set(ignored))!=len(ignored):
            raise ValueError('Invalid ignored prediction identities')
        ball=frame.get('ball',{})
        if not isinstance(ball,dict) or 'box' not in ball:
            raise ValueError('Ball review requires an explicit box or null')
        if ball.get('status') not in ('unreviewed','visible','not_visible','uncertain'):
            raise ValueError('Invalid ball review status')
        if ball['status']=='visible':
            box(ball['box'])
        elif ball.get('box') is not None:
            raise ValueError('Nonvisible/unreviewed ball must have a null box')
    return source_frames


def iou(a,b):
    intersection=max(0,min(a[2],b[2])-max(a[0],b[0]))*max(0,min(a[3],b[3])-max(a[1],b[1]))
    return intersection/max((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-intersection,1e-12)


def evaluate_ball(sequence, review, threshold=.25):
    source=validate(sequence,review); number(threshold,.01,1)
    tp=fp=fn=scored=visible=hidden=0
    details=[]
    for f in review['frames']:
        original=source[f['frame_index']]
        if f['ball']['status'] not in ('visible','not_visible') or original['ball_prediction_status']!='complete':
            continue
        candidates=original['ball_proposals']
        for p in candidates:
            box(p['box']); number(p['score'],0,1)
        is_visible=f['ball']['status']=='visible'; scored+=1; visible+=is_visible; hidden+=not is_visible
        best=max((iou(f['ball']['box'],p['box']) for p in candidates),default=0) if is_visible else None
        hit=int(is_visible and best>=threshold)
        tp+=hit; fp+=len(candidates)-hit; fn+=int(is_visible)-hit
        details.append({'frame_index':f['frame_index'],'source_video_ms':f['source_video_ms'],'ball_status':f['ball']['status'],'proposal_count':len(candidates),'best_iou':best,'matched':bool(hit)})
    return {'schema':'sesen.ball-review-evaluation.v1','sequence_id':sequence['sequence_id'],'source_sha256':sequence['source_sha256'],'total_frames':len(source),'scored_frames':scored,'visible_ball_frames':visible,'reviewed_nonvisible_frames':hidden,'excluded_frames':len(source)-scored,'true_positives':tp,'false_positives':fp,'false_negatives':fn,'precision':tp/(tp+fp) if tp+fp else None,'recall':tp/(tp+fn) if tp+fn else None,'iou_threshold':threshold,'frames':details,'limitations':['Only human-reviewed visible/nonvisible frames with completed predictions are scored','Unreviewed, uncertain and not-run frames never become negatives','Single ball per image; additional unmatched proposals count as false positives','Model-guided human review is not an independent blind benchmark','No trajectory, player identity, tactical or full-match accuracy inferred']}


def coco_review(sequence, review, ball_only=False):
    validate(sequence,review)
    images=[]; annotations=[]
    for f in review['frames']:
        if ball_only and f['ball']['status'] not in ('visible','not_visible'):
            continue
        if not f['persons'] and f['ball']['status'] not in ('visible','not_visible'):
            continue
        original=sequence['frames'][f['frame_index']]; image_id=f['frame_index']+1
        images.append({'id':image_id,'file_name':original['image'],'width':sequence['width'],'height':sequence['height'],'source_video_ms':f['source_video_ms'],'image_sha256':f['image_sha256'],'scene':f['scene'],'persons_exhaustive':f['persons_complete'],'ball_exhaustive':f['ball']['status'] in ('visible','not_visible')})
        items=[] if ball_only else [(1,p['box'],{'scene_local_identity':p['identity'],'role':p['role'],'kit_colour':p['kit_colour'],'origin':p['origin']}) for p in f['persons']]
        if f['ball']['status']=='visible':
            items.append((2,f['ball']['box'],{'origin':'human_review'}))
        for category,b,attributes in items:
            geometry=[b[0]*sequence['width'],b[1]*sequence['height'],(b[2]-b[0])*sequence['width'],(b[3]-b[1])*sequence['height']]
            annotations.append({'id':len(annotations)+1,'image_id':image_id,'category_id':category,'bbox':geometry,'area':geometry[2]*geometry[3],'iscrowd':0,'attributes':attributes})
    categories=[{'id':2,'name':'sports_ball'}] if ball_only else [{'id':1,'name':'person'},{'id':2,'name':'sports_ball'}]
    return {'info':{'description':'Ball-only explicitly reviewed frames' if ball_only else 'SESEN review interchange; includes partial labels, not a training dataset','sequence_id':sequence['sequence_id'],'source_sha256':sequence['source_sha256'],'usage_rights':'not_reviewed','approved_for_training':False,'warning':'Standard COCO loaders may ignore completeness attributes. Do not train on partial mixed-class review data. Clear broadcast/data rights before any training or publication; model-guided review is not independent ground truth'},'licenses':[],'categories':categories,'images':images,'annotations':annotations}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sequence',type=Path,required=True)
    parser.add_argument('--review',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    args=parser.parse_args()
    sequence=json.loads(args.sequence.read_text(encoding='utf-8')); review=json.loads(args.review.read_text(encoding='utf-8'))
    coco=coco_review(sequence,review); evaluation=evaluate_ball(sequence,review)
    if args.out.exists():
        raise ValueError('A new output directory is required')
    verified=[]
    for image in coco['images']:
        if not re.fullmatch(r'frames/[0-9]{6}\.jpg',image['file_name']):
            raise ValueError('Unsafe frame filename')
        path=(args.sequence.parent/image['file_name']).resolve(strict=True)
        if not path.is_relative_to(args.sequence.parent.resolve()):
            raise ValueError('Frame file outside the sequence directory')
        data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=image['image_sha256']:
            raise ValueError('Frame file/provenance mismatch')
        verified.append((image['file_name'],data))
    args.out.mkdir(parents=True,exist_ok=False)
    for name,data in verified:
        target=args.out/name;target.parent.mkdir(exist_ok=True);target.write_bytes(data)
    (args.out/'annotations.review.coco.json').write_text(json.dumps(coco,ensure_ascii=False,indent=2),encoding='utf-8')
    (args.out/'ball-only.review.coco.json').write_text(json.dumps(coco_review(sequence,review,ball_only=True),ensure_ascii=False,indent=2),encoding='utf-8')
    (args.out/'ball-evaluation.json').write_text(json.dumps(evaluation,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'reviewed_images':len(coco['images']),'annotations':len(coco['annotations']),'scored_ball_frames':evaluation['scored_frames'],'approved_for_training':False}))


if __name__=='__main__':
    main()
