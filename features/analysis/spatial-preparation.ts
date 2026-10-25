import { z } from "zod";
import { trackingSchema, type TrackingReport, type TrackingCorrections } from "./tracking-results";

const colour = z.enum(["red", "white", "green", "cyan", "unknown"]);
const point = z.tuple([z.number().finite().min(0).max(40), z.number().finite().min(0).max(20)]);
export const spatialPreparationSchema = z.object({
  schema: z.literal("sesen.spatial-preparation.v1"), status: z.literal("unreviewed"),
  source: trackingSchema.shape.source, tracking_model_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  time_basis: z.literal("nominal-source-samples"),
  team_colours: z.object({ A: colour.exclude(["unknown"]), B: colour.exclude(["unknown"]) }).strict(),
  frames: z.array(z.object({
    frame_index: z.number().int().min(0).max(899), video_ms: z.number().int().nonnegative(), scene: z.number().int().nonnegative(),
    image: z.string().regex(/^frame-\d{4}\.jpg$/), image_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    calibration: z.object({ state: z.enum(["unavailable", "estimated_seed", "estimated_flow"]),
      anchor_frame_index: z.number().int().min(0).max(899).nullable(),
      matches: z.number().int().min(0).max(300).optional(),
      holdout_error_px: z.number().finite().min(0).max(2.5).nullable().optional(),
    }).strict(),
    persons: z.array(z.object({ track_id: z.number().int().positive(),
      colour: z.object({ group: colour, support: z.number().finite().min(0).max(1), team: z.enum(["A", "B"]).nullable(),
        reason: z.enum(["colour_only", "colour_visible_only", "low_score_or_clipped", "torso_overlap"]) }).strict(),
      court_point: point.nullable(),
    }).strict()).max(100),
  }).strict()).min(1).max(900),
  confirmed_events: z.array(z.never()).length(0), limitations: z.array(z.string().max(1000)).min(1).max(20),
}).strict();
export type SpatialPreparation = z.infer<typeof spatialPreparationSchema>;

export function parseSpatialPreparation(input: unknown, report: TrackingReport, corrections: TrackingCorrections = {}) {
  const result = spatialPreparationSchema.parse(input);
  if (Object.keys(corrections).length) throw new Error("Preparation uses original boxes; restore them or prepare the corrected evidence again");
  if (JSON.stringify(result.source) !== JSON.stringify(report.source) || result.tracking_model_sha256 !== report.engine.model_sha256 ||
      result.frames.length !== report.frames.length || result.team_colours.A === result.team_colours.B)
    throw new Error("Preparation belongs to a different source/model/sample");
  for (const [i, frame] of result.frames.entries()) {
    const tracked = report.frames[i]!;
    const ids = new Set(frame.persons.map((p) => p.track_id));
    if (frame.frame_index !== i || frame.video_ms !== tracked.video_ms || frame.scene !== tracked.scene ||
        frame.persons.length !== tracked.persons.length || ids.size !== frame.persons.length || tracked.persons.some((p) => !ids.has(p.track_id)))
      throw new Error("Preparation frame/scene/track links do not match");
    const c = frame.calibration, anchor = c.anchor_frame_index;
    if (c.state === "unavailable") {
      if (anchor !== null || frame.persons.some((p) => p.court_point !== null)) throw new Error("Unavailable calibration cannot have metric positions");
    } else {
      if (anchor === null || anchor > i || report.frames[anchor]?.scene !== frame.scene ||
          result.frames[anchor]?.calibration.state !== "estimated_seed" ||
          c.state === "estimated_seed" && anchor !== i ||
          c.state === "estimated_flow" && (anchor === i || (c.matches ?? 0) < 25 || typeof c.holdout_error_px !== "number" ||
            result.frames[i - 1]?.calibration.state === "unavailable" || result.frames[i - 1]?.scene !== frame.scene))
        throw new Error("Invalid scene-local camera evidence");
    }
    for (const person of frame.persons) {
      const observed = tracked.persons.find((p) => p.track_id === person.track_id)!;
      const team = person.colour.team;
      if (team && (person.colour.group !== result.team_colours[team] || person.colour.support < .35 ||
          !["colour_only", "colour_visible_only"].includes(person.colour.reason) || observed.score < .5))
        throw new Error("Unknown/occluded evidence cannot establish a kit group");
      if (person.court_point && observed.box.some((v) => v < 0 || v > 1)) throw new Error("Clipped feet cannot establish court coordinates");
    }
  }
  return result;
}
