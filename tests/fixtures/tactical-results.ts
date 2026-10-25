import { trackingFixture } from "./tracking-results";
import { trackingSchema } from "@/features/analysis/tracking-results";
import type { TacticalGround } from "@/features/analysis/tactical-proposals";

export function crossingFixture() {
  const base = trackingFixture();
  return trackingSchema.parse({ ...base, end_ms: 3100,
    frames: Array.from({ length: 21 }, (_, i) => ({ video_ms: 1000 + i * 100, scene: 0,
      persons: [{ track_id: 1, box: [.18 + i * .02, .5, .22 + i * .02, .8], score: .8 },
        { track_id: 2, box: [.58 - i * .02, .5, .62 - i * .02, .8], score: .9 }] })) });
}
export function defenseFixture(advanced = false) {
  const base = crossingFixture();
  const report = trackingSchema.parse({ ...base, end_ms: 4100,
    frames: Array.from({ length: 31 }, (_, i) => ({ video_ms: 1000 + i * 100, scene: 0,
      persons: Array.from({ length: 7 }, (_, k) => ({ track_id: k + 1,
        box: [.1 + k * .05, .3, .13 + k * .05, .7], score: .85 })) })) });
  const ground: TacticalGround = { schema: "sesen.tactical-ground.v1", source_sha256: report.source.sha256,
    model_sha256: report.engine.model_sha256, frames: report.frames.map((_, frame_index) => ({
      frame_index, scene: 0, calibration_id: `reviewed-frame-${frame_index}`, calibration_reviewed: true,
      teams_reviewed: true, outfield_complete: true, phase: "set_defense", defending_team: "A", goal_x: 0,
      persons: Array.from({ length: 7 }, (_, k) => ({ track_id: k + 1, team: "A",
        role: k === 6 ? "goalkeeper" : "outfield", ground_contact_reviewed: true,
        x_m: k === 6 ? 1 : advanced && k === 2 ? 10.2 : 7, y_m: k === 6 ? 10 : 5 + k * 2 })),
    })) };
  return { report, ground };
}
