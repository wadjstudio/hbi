import unittest
from byte_tracker import ByteTrackMatcher
from compare_tracking import summarize
from detector import PersonDetector, suppress


def detection(x=20,score=.9):
    return {'box':[x,20,x+20,60],'score':score,'class':'person'}


class TrackingTests(unittest.TestCase):
    def test_low_confidence_can_continue_existing_track_but_cannot_create_new_one(self):
        tracker=ByteTrackMatcher()
        identity=tracker.update([detection()])[0]['track_id']
        continued=tracker.update([detection(21,.2)])
        self.assertEqual(continued[0]['track_id'],identity)
        self.assertLess(continued[0]['score'],.35)
        self.assertEqual(ByteTrackMatcher().update([detection(score=.2)]),[])

    def test_gap_has_no_drawn_prediction_and_recovers_same_identity(self):
        tracker=ByteTrackMatcher()
        identity=tracker.update([detection()])[0]['track_id']
        self.assertEqual(tracker.update([]),[])
        recovered=tracker.update([detection(22)])
        self.assertEqual(recovered[0]['track_id'],identity)

    def test_buffer_expiry_and_cut_reset_do_not_recover_old_state(self):
        tracker=ByteTrackMatcher()
        identity=tracker.update([detection()])[0]['track_id']
        for _ in range(13):
            tracker.update([])
        tracker.update([detection()])
        current=tracker.update([detection()])
        self.assertNotEqual(current[0]['track_id'],identity)
        tracker.reset()
        self.assertEqual(tracker.update([detection(score=.2)]),[])

    def test_no_duplicate_ids_and_invalid_input_is_rejected(self):
        tracker=ByteTrackMatcher()
        rows=tracker.update([detection(),detection(70)])
        self.assertEqual(len({row['track_id'] for row in rows}),2)
        for row in [detection(score=float('nan')),{'box':[2,0,1,20],'score':.9,'class':'person'},detection(score=2)]:
            with self.assertRaises(ValueError):
                tracker.update([row])

    def test_less_aggressive_nms_preserves_some_overlapping_person_boxes(self):
        boxes=[[0,0,20,40],[6,0,26,40]]
        self.assertEqual(suppress(boxes,[.9,.8],.45),[0])
        self.assertEqual(suppress(boxes,[.9,.8],.65),[0,1])
        # This geometry test does not prove either box is a real athlete.

    def test_diagnostics_are_scene_local_and_count_recoveries_separately(self):
        rows=[{'scene':0,'candidate':[{'track_id':1}]},{'scene':0,'candidate':[]},{'scene':0,'candidate':[{'track_id':1}]},{'scene':1,'candidate':[{'track_id':1}]}]
        self.assertEqual(summarize(rows,'candidate'),{'emitted_boxes':3,'scene_local_tracklets':2,'frames_without_emitted_tracks':1,'gaps_followed_by_same_id':1})

    def test_unrecognized_weights_are_rejected_before_runtime_loading(self):
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as folder:
            model=Path(folder)/'wrong.onnx'
            model.write_bytes(b'not an approved model')
            with self.assertRaisesRegex(ValueError,'checksum'):
                PersonDetector(model)


if __name__=='__main__':
    unittest.main()
