"""Render source, baseline/updated views and a local review UI from a real comparison."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont
from compare_tracking import read_frame


def draw_tracks(image, persons, title, color, scene, clock, histories=None, frame=0):
    drawing=ImageDraw.Draw(image)
    try:
        font=ImageFont.truetype('arial.ttf',15)
    except OSError:
        font=ImageFont.load_default(size=15)
    for person in persons:
        x1,y1,x2,y2=person['box']
        x1,x2=max(0,min(image.width-1,x1)),max(0,min(image.width-1,x2))
        y1,y2=max(0,min(image.height-1,y1)),max(0,min(image.height-1,y2))
        if x2<=x1 or y2<=y1:
            continue
        drawing.rectangle((x1,y1,x2,y2),outline=color,width=2)
        point=(round((x1+x2)/2),round(y2))
        if histories is not None:
            key=(scene,person['track_id'])
            old=histories.get(key,[])
            if old and old[-1][0]!=frame-1:
                old=[]
            old=old[-7:]+[(frame,point)]
            histories[key]=old
            if len(old)>1:
                drawing.line([v[1] for v in old],fill='#d8b57b',width=2)
        drawing.text((x1,max(38,y1-18)),f"S{scene}:T{person['track_id']}",font=font,fill=color,stroke_width=1,stroke_fill='black')
    drawing.rectangle((0,0,image.width,34),fill='#080e12')
    drawing.text((10,8),f'{title} | Source {clock}',font=font,fill='#f4f1e8')
    return image


def run(args):
    report_path,source=Path(args.report).resolve(strict=True),Path(args.video).resolve(strict=True)
    out=report_path.parent
    report=json.loads(report_path.read_text(encoding='utf-8'))
    if report['schema']!='sesen.tracking-comparison.v1' or report['review_status']!='unreviewed':
        raise ValueError('Unsupported comparison')
    width,height,fps=report['width'],report['height'],report['sample_fps']
    if (width,height,fps)!=(960,540,10) or not 1<=report['duration_ms']<=90000:
        raise ValueError('Unexpected preview dimensions/timing')
    if len(report['observations'])!=report['frames'] or report['frames']!=report['duration_ms']//100:
        raise ValueError('Incomplete frame grid')
    before=source.stat()
    with source.open('rb') as stream:
        if hashlib.file_digest(stream,'sha256').hexdigest()!=report['source_sha256']:
            raise ValueError('Wrong source video')
    ffmpeg=shutil.which('ffmpeg')
    if not ffmpeg:
        raise RuntimeError('FFmpeg required')
    names={'updated-preview.mp4':width,'comparison-preview.mp4':width*2,'raw-preview.mp4':width}
    if any((out/name).exists() for name in [*names,'index.html']):
        raise ValueError('Refusing to overwrite preview outputs')
    start,duration=report['video_start_ms']/1000,report['duration_ms']/1000
    children,logs,encoders=[],[],{}
    try:
        log=(out/'render-decode.log').open('wb');logs.append(log)
        decode=subprocess.Popen([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-threads','1','-ss',str(start),'-i',str(source),'-t',str(duration),'-vf',f'fps={fps},scale={width}:{height}','-an','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=subprocess.PIPE,stderr=log)
        children.append(decode)
        for name,video_width in names.items():
            log=(out/(name+'.log')).open('wb');logs.append(log)
            encoders[name]=subprocess.Popen([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-f','rawvideo','-pix_fmt','rgb24','-s',f'{video_width}x{height}','-r',str(fps),'-i','pipe:0','-ss',str(start),'-i',str(source),'-t',str(duration),'-map','0:v:0','-map','1:a:0?','-c:v','libx264','-preset','veryfast','-crf','22','-threads','1','-c:a','aac','-movflags','+faststart','-shortest','-n',str(out/name)],stdin=subprocess.PIPE,stderr=log)
            children.append(encoders[name])
        baseline_image=None
        histories={}
        for index,row in enumerate(report['observations']):
            if row['video_ms']!=report['video_start_ms']+index*100:
                raise ValueError('Invalid source-time grid')
            data=read_frame(decode.stdout,width*height*3)
            if not data:
                raise RuntimeError('Preview source ended early')
            source_image=Image.frombytes('RGB',(width,height),data)
            encoders['raw-preview.mp4'].stdin.write(data)
            if row['baseline_sampled']:
                baseline_image=source_image.copy()
            if row['scene_cut_heuristic']:
                histories={}
            seconds=row['video_ms']//1000
            clock=f'{seconds//60:02}:{seconds%60:02}.{(row["video_ms"]%1000)//100}'
            left=draw_tracks(baseline_image.copy(),row['baseline'],'BEFORE tiny416 / IoU / 5fps','#ff9567',row['scene'],clock)
            updated=draw_tracks(source_image.copy(),row['candidate'],'AFTER S640 / ByteTrack / 10fps','#11d3d7',row['scene'],clock,histories,index)
            paired=Image.new('RGB',(width*2,height));paired.paste(left,(0,0));paired.paste(updated,(width,0))
            encoders['updated-preview.mp4'].stdin.write(updated.tobytes())
            encoders['comparison-preview.mp4'].stdin.write(paired.tobytes())
            if index in [0,50,100,150,200,300,450,599]:
                paired.save(out/f'comparison-frame-{index:04}.jpg',quality=94)
            if index%100==99:
                print(f'Rendered {index+1}/{report["frames"]} comparison frames',flush=True)
        if read_frame(decode.stdout,width*height*3):
            raise RuntimeError('Source grid has unexpected extra frames')
        decode.stdout.close()
        for encoder in encoders.values():
            encoder.stdin.close()
        for child in children:
            if child.wait(timeout=90):
                raise RuntimeError('FFmpeg render failed; see local logs')
    finally:
        for child in children:
            if child.poll() is None:
                child.terminate();child.wait(timeout=10)
        for log in logs:
            log.close()
    after=source.stat()
    if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):
        raise RuntimeError('Source changed during rendering')
    context={key:report[key] for key in ['schema','review_status','source_sha256','video_start_ms','duration_ms','frames','baseline','candidate','limitations']}
    template=Path(__file__).with_name('tracking_review.html').read_text(encoding='utf-8')
    serialized=json.dumps(context,ensure_ascii=False).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
    (out/'index.html').write_text(template.replace('__SESEN_COMPARISON_CONTEXT__',serialized),encoding='utf-8')
    print(f'Rendered {len(names)} local videos and review UI; source unchanged')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--report',required=True)
    parser.add_argument('--video',required=True)
    run(parser.parse_args())
