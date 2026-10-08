import copy
import unittest
from annotation_dataset import box, coco_review, evaluate_ball, validate


def fixture():
    frames=[{'index':i,'video_ms':2110000+i*100,'scene':1,'image':f'frames/{i+1:06}.jpg','image_sha256':'c'*64,'person_suggestions':[{'id':'model-1-4'}],'ball_prediction_status':'complete','ball_proposals':[]} for i in range(4)]
    sequence={'schema':'sesen.annotation-sequence.v1','sequence_id':'a'*64,'source_sha256':'b'*64,'derivative_sha256':'d'*64,'width':960,'height':540,'frames':frames}
    reviews=[{'frame_index':f['index'],'source_video_ms':f['video_ms'],'scene':f['scene'],'image_sha256':f['image_sha256'],'persons':[],'persons_complete':False,'ignored_prediction_ids':[],'ball':{'status':'unreviewed','box':None}} for f in frames]
    review={'schema':'sesen.annotation-review.v1','sequence_id':sequence['sequence_id'],'source_sha256':sequence['source_sha256'],'derivative_sha256':sequence['derivative_sha256'],'width':960,'height':540,'frames':reviews,'confirmed_events':[]}
    return sequence,review


class AnnotationTests(unittest.TestCase):
    def test_no_review_produces_null_metrics(self):
        sequence,review=fixture()
        result=evaluate_ball(sequence,review)
        self.assertEqual(result['scored_frames'],0)
        self.assertIsNone(result['precision']);self.assertIsNone(result['recall'])
        self.assertEqual(coco_review(sequence,review)['images'],[])

    def test_one_match_extra_proposal_miss_and_uncertain_exclusion(self):
        sequence,review=fixture(); target=[.1,.2,.12,.24]
        review['frames'][0]['ball']={'status':'visible','box':target}
        sequence['frames'][0]['ball_proposals']=[{'box':target,'score':.8},{'box':[.5,.5,.6,.6],'score':.7}]
        review['frames'][1]['ball']={'status':'visible','box':target}
        review['frames'][2]['ball']={'status':'not_visible','box':None}
        sequence['frames'][2]['ball_proposals']=[{'box':target,'score':.2}]
        review['frames'][3]['ball']={'status':'uncertain','box':None}
        sequence['frames'][3]['ball_proposals']=[{'box':target,'score':.5}]
        result=evaluate_ball(sequence,review)
        self.assertEqual((result['true_positives'],result['false_positives'],result['false_negatives']),(1,2,1))
        self.assertEqual(result['scored_frames'],3);self.assertAlmostEqual(result['precision'],1/3);self.assertEqual(result['recall'],.5)

    def test_not_run_is_never_scored_as_missed_ball(self):
        sequence,review=fixture();review['frames'][0]['ball']={'status':'visible','box':[.1,.1,.2,.2]};sequence['frames'][0]['ball_prediction_status']='not_run'
        self.assertEqual(evaluate_ball(sequence,review)['false_negatives'],0)
        self.assertEqual(evaluate_ball(sequence,review)['scored_frames'],0)

    def test_source_frame_geometry_events_and_duplicate_ids_are_rejected(self):
        sequence,review=fixture()
        mutations=[lambda r:r.update(source_sha256='e'*64),lambda r:r['frames'][0].update(source_video_ms=1),lambda r:r.update(width=1280),lambda r:r['frames'].append(copy.deepcopy(r['frames'][0])),lambda r:r.update(confirmed_events=[{}])]
        for change in mutations:
            modified=copy.deepcopy(review);change(modified)
            with self.assertRaises(ValueError):validate(sequence,modified)

    def test_boxes_reject_nonfinite_boolean_zero_area_and_outside(self):
        for value in ([0,0,0,1],[0,0,2,1],[0,float('nan'),1,1],[False,0,1,1],None):
            with self.assertRaises(ValueError):box(value)

    def test_human_only_coco_and_scene_local_identity_preserve_partial_labels(self):
        sequence,review=fixture()
        review['frames'][0]['persons']=[{'identity':'p1','box':[.1,.2,.3,.4],'role':'player','kit_colour':'red','origin':'manual','source_prediction_id':None}]
        coco=coco_review(sequence,review)
        self.assertEqual(len(coco['annotations']),1)
        self.assertEqual(coco['annotations'][0]['attributes']['scene_local_identity'],'p1')
        self.assertFalse(coco['images'][0]['persons_exhaustive']);self.assertFalse(coco['images'][0]['ball_exhaustive'])
        self.assertFalse(coco['info']['approved_for_training'])
        self.assertEqual(coco['annotations'][0]['bbox'],[96,108,191.99999999999997,108])
        review['frames'][0]['persons'].append(copy.deepcopy(review['frames'][0]['persons'][0]))
        with self.assertRaises(ValueError):validate(sequence,review)

    def test_ball_only_export_excludes_uncertain_and_unreviewed_even_with_person_labels(self):
        sequence,review=fixture()
        review['frames'][0]['ball']={'status':'visible','box':[.1,.1,.2,.2]}
        review['frames'][1]['ball']={'status':'not_visible','box':None}
        review['frames'][2]['ball']={'status':'uncertain','box':None}
        review['frames'][3]['persons']=[{'identity':'p1','box':[.1,.2,.3,.4],'role':'unknown','kit_colour':'unknown','origin':'manual','source_prediction_id':None}]
        coco=coco_review(sequence,review,ball_only=True)
        self.assertEqual([i['id'] for i in coco['images']],[1,2])
        self.assertEqual(coco['categories'],[{'id':2,'name':'sports_ball'}])
        self.assertEqual(len(coco['annotations']),1)
        self.assertFalse(coco['info']['approved_for_training'])


if __name__=='__main__':unittest.main()
