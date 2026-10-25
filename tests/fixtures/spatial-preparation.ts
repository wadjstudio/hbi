import { crossingFixture } from "./tactical-results";
import type { SpatialPreparation } from "@/features/analysis/spatial-preparation";

export function preparationFixture(calibrated = true): SpatialPreparation {
  const r = crossingFixture();
  return { schema: "sesen.spatial-preparation.v1", status: "unreviewed", source: r.source,
    tracking_model_sha256: r.engine.model_sha256, time_basis: "nominal-source-samples",
    team_colours: { A: "red", B: "white" }, confirmed_events: [], limitations: ["Synthetic preparation fixture"],
    frames: r.frames.map((f, i) => ({ frame_index: i, video_ms: f.video_ms, scene: f.scene,
      image: `frame-${String(i).padStart(4, "0")}.jpg`, image_sha256: "c".repeat(64),
      calibration: calibrated ? { state: i === 0 ? "estimated_seed" : "estimated_flow", anchor_frame_index: 0,
        matches: i === 0 ? 0 : 30, holdout_error_px: i === 0 ? null : .4 } : { state: "unavailable", anchor_frame_index: null },
      persons: f.persons.map((p, j) => ({ track_id: p.track_id,
        colour: { group: j === 0 ? "red" : "white", support: .8, team: j === 0 ? "A" : "B", reason: "colour_only" },
        court_point: calibrated ? [20+j, 10] : null })),
    })) };
}
