import { trackingSchema } from "@/features/analysis/tracking-results";
export const trackingFixture = () => trackingSchema.parse({
  schema: "sesen.workbench-tracking.v1",
  source: { name: "match.mp4", size_bytes: 500, sha256: "a".repeat(64),
    local_fingerprint: "b".repeat(64), fingerprint_scheme: "hbi-head-tail-size-v1",
    duration_ms: 60000, width: 1280, height: 720 },
  engine: { name: "ByteTrack sample", model: "YOLOX", model_sha256: "c".repeat(64), limitations: ["Unreviewed person tracklets"] },
  time_basis: "nominal-source-samples", start_ms: 1000, end_ms: 1300, sample_fps: 10,
  frames: [
    { video_ms: 1000, scene: 0, persons: [{ track_id: 1, box: [.1, .2, .3, .6], score: .8 }] },
    { video_ms: 1100, scene: 0, persons: [] },
    { video_ms: 1200, scene: 1, persons: [{ track_id: 1, box: [.5, .2, .7, .6], score: .7 }] },
  ],
});
