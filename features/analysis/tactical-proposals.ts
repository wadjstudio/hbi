import { z } from "zod";
import { spatialPreparationSchema, parseSpatialPreparation, type SpatialPreparation } from "./spatial-preparation";
import { trackingSchema, validateCorrections, visibleTrackingBox, trackingCorrectionKey,
  trackingCorrectionsSchema, type TrackingReport, type TrackingCorrections } from "./tracking-results";

// Rule support is not a calibrated probability or independent model accuracy.
export const TACTICAL_RULE_VERSION = "sesen-tactics-rules-v1";
const groundFrame = z.object({
  frame_index: z.number().int().min(0).max(899), scene: z.number().int().nonnegative(),
  calibration_id: z.string().min(1).max(100), calibration_reviewed: z.literal(true),
  teams_reviewed: z.literal(true), outfield_complete: z.literal(true), phase: z.literal("set_defense"),
  defending_team: z.enum(["A", "B"]), goal_x: z.union([z.literal(0), z.literal(40)]),
  persons: z.array(z.object({ track_id: z.number().int().positive(), team: z.enum(["A", "B"]),
    role: z.enum(["outfield", "goalkeeper"]), ground_contact_reviewed: z.literal(true),
    x_m: z.number().finite().min(0).max(40), y_m: z.number().finite().min(0).max(20),
  }).strict()).max(30),
}).strict();
export const tacticalGroundSchema = z.object({
  schema: z.literal("sesen.tactical-ground.v1"),
  source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  model_sha256: z.string().regex(/^[a-f0-9]{64}$/),
  corrections: trackingCorrectionsSchema.optional(),
  frames: z.array(groundFrame).min(1).max(900),
}).strict();
export type TacticalGround = z.infer<typeof tacticalGroundSchema>;
export const tacticalReviewSchema = z.object({
  ground: tacticalGroundSchema.optional(),
  preparation: spatialPreparationSchema.optional(),
  decisions: z.record(z.string().max(200), z.object({
    status: z.enum(["reviewed", "rejected"]), note: z.string().max(500),
  }).strict()).refine((v) => Object.keys(v).length <= 200, "Too many tactical decisions"),
}).strict();
export type TacticalReview = z.infer<typeof tacticalReviewSchema>;
export type TacticalProposal = {
  id: string; kind: "crossing_motion" | "defense_6_0" | "defense_5_1" | "near_goal_block";
  scene: number; start_ms: number; end_ms: number; frame_indices: number[];
  track_ids: number[]; team: "A" | "B" | null; support: number;
  evidence_quality?: "unreviewed_camera_and_kits";
};

export function parseTacticalGround(input: unknown, report: TrackingReport, corrections: TrackingCorrections = {}) {
  const ground = tacticalGroundSchema.parse(input);
  if (ground.source_sha256 !== report.source.sha256 || ground.model_sha256 !== report.engine.model_sha256)
    throw new Error("Court evidence belongs to a different source/model");
  const basis = validateCorrections(report, ground.corrections ?? {});
  const current = validateCorrections(report, corrections);
  const signature = (v: TrackingCorrections) => JSON.stringify(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)));
  if (signature(basis) !== signature(current)) throw new Error("Court evidence uses different box corrections; recalibrate it");
  let previous = -1;
  const calibrations = new Set<string>();
  for (const sample of ground.frames) {
    const frame = report.frames[sample.frame_index];
    if (!frame || sample.frame_index <= previous || sample.scene !== frame.scene || calibrations.has(sample.calibration_id))
      throw new Error("Court evidence has an invalid frame/scene");
    previous = sample.frame_index;
    calibrations.add(sample.calibration_id);
    const ids = new Set<number>();
    for (const person of sample.persons) {
      const key = trackingCorrectionKey(sample.frame_index, frame.scene, person.track_id);
      const observation = frame.persons.find((p) => p.track_id === person.track_id);
      const box = key in current ? current[key]!.box : observation?.box;
      if (ids.has(person.track_id) || !observation || !box || box.some((v) => v < 0 || v > 1))
        throw new Error("Court evidence references a duplicate, absent or corrected observation; recalibrate it");
      ids.add(person.track_id);
    }
  }
  return ground;
}

type Observation = { id: number; x: number; y: number; height: number; score: number };
function observations(report: TrackingReport, corrections: TrackingCorrections, i: number): Observation[] {
  const frame = report.frames[i]!;
  if (frame.persons.length > 30) return []; // Crowd views are not bounded court evidence.
  return frame.persons.flatMap((p) => {
    const key = trackingCorrectionKey(i, frame.scene, p.track_id);
    const box = key in corrections ? corrections[key]!.box : p.box;
    // A clipped foot cannot establish a trajectory; never use an imagined observation.
    if (!box || box.some((v) => v < 0 || v > 1) || !visibleTrackingBox(box) || p.score < .5) return [];
    return [{ id: p.track_id, x: (box[0] + box[2]) / 2, y: box[3], height: box[3] - box[1], score: p.score }];
  });
}
function proposal(kind: TacticalProposal["kind"], report: TrackingReport, indices: number[], ids: number[],
  team: TacticalProposal["team"], support: number): TacticalProposal {
  const first = indices[0]!, last = indices[indices.length - 1]!, scene = report.frames[first]!.scene;
  const sorted = [...ids].sort((a, b) => a - b);
  return { id: `${TACTICAL_RULE_VERSION}:${kind}:${scene}:${first}:${last}:${team ?? "?"}:${sorted.join("-")}`,
    kind, scene, start_ms: report.frames[first]!.video_ms,
    end_ms: Math.min(report.end_ms, Math.round(report.frames[last]!.video_ms + 1000 / report.sample_fps)),
    frame_indices: indices, track_ids: sorted, team, support };
}

function motionProposals(report: TrackingReport, corrections: TrackingCorrections) {
  type Run = { start: number; last: number; sign: number; initialGap: number; minGap: number; scores: number[]; flipped: boolean };
  const runs = new Map<string, Run>(), results: TacticalProposal[] = [];
  const cooldown = new Map<string, number>();
  const diagnostics = { sample_frames: report.frames.length,
    observed_boxes: report.frames.reduce((n, frame) => n + frame.persons.length, 0),
    usable_observations: 0, frames_without_usable_people: 0, frames_with_comparable_pairs: 0,
    camera_cuts: 0, pair_runs_ended_at_cut: 0, pair_runs_ended_by_missing_or_geometry: 0,
    pair_window_resets: 0, observed_order_reversals: 0, maximum_pair_window_ms: 0 };
  for (let i = 0; i < report.frames.length; i++) {
    if (i && report.frames[i]!.scene !== report.frames[i - 1]!.scene) {
      diagnostics.camera_cuts++; diagnostics.pair_runs_ended_at_cut += runs.size;
      runs.clear(); cooldown.clear();
    }
    const people = observations(report, corrections, i).sort((a, b) => a.id - b.id);
    diagnostics.usable_observations += people.length;
    if (!people.length) diagnostics.frames_without_usable_people++;
    const seen = new Set<string>();
    for (let a = 0; a < people.length; a++) for (let b = a + 1; b < people.length; b++) {
      const left = people[a]!, right = people[b]!, key = `${left.id}:${right.id}`;
      // Similar foot depth/scale is only a visual gate, not a court calibration or team inference.
      if (Math.abs(left.y - right.y) > Math.min(left.height, right.height) * .6 ||
          Math.max(left.height, right.height) / Math.min(left.height, right.height) > 1.6) continue;
      seen.add(key);
      const gap = left.x - right.x, abs = Math.abs(gap), sign = Math.sign(gap);
      const run = runs.get(key);
      if (!run || i - run.last !== 1 || i - run.start > report.sample_fps * 4) {
        if (run) diagnostics.pair_window_resets++;
        if (abs >= .04) runs.set(key, { start: i, last: i, sign, initialGap: abs, minGap: abs,
          scores: [Math.min(left.score, right.score)], flipped: false });
        continue;
      }
      run.last = i; run.minGap = Math.min(run.minGap, abs); run.scores.push(Math.min(left.score, right.score));
      if (sign && sign !== run.sign) {
        if (!run.flipped) diagnostics.observed_order_reversals++;
        run.flipped = true;
      }
      const elapsed = report.frames[i]!.video_ms - report.frames[run.start]!.video_ms;
      diagnostics.maximum_pair_window_ms = Math.max(diagnostics.maximum_pair_window_ms, elapsed);
      if (run.flipped && sign === -run.sign && abs >= .04 && run.minGap <= .025 && elapsed >= 600 &&
          elapsed <= 4000 && i - (cooldown.get(key) ?? -10000) > report.sample_fps * 2) {
        results.push(proposal("crossing_motion", report,
          Array.from({ length: i - run.start + 1 }, (_, k) => run!.start + k), [left.id, right.id], null,
          Math.min(...run.scores)));
        cooldown.set(key, i); runs.delete(key);
      }
    }
    if (seen.size) diagnostics.frames_with_comparable_pairs++;
    for (const key of runs.keys()) if (!seen.has(key)) {
      diagnostics.pair_runs_ended_by_missing_or_geometry++; runs.delete(key);
    }
  }
  return { proposals: results, diagnostics };
}

function defenseProposals(report: TrackingReport, ground: TacticalGround) {
  const results: TacticalProposal[] = [];
  let run: { kind: "defense_6_0" | "defense_5_1"; team: "A" | "B"; goal: number; scene: number; indices: number[]; ids: number[] } | null = null;
  function flush() {
    if (run && report.frames[run.indices.at(-1)!]!.video_ms - report.frames[run.indices[0]!]!.video_ms >= 2000)
      results.push(proposal(run.kind, report, run.indices, run.ids, run.team, 1));
    run = null;
  }
  for (const sample of ground.frames) {
    const people = sample.persons.filter((p) => p.team === sample.defending_team && p.role === "outfield");
    // Distance to the three-metre goal mouth, not just x: wing defenders lie on the arc too.
    const depths = people.map((p) => Math.hypot(Math.abs(p.x_m - sample.goal_x), Math.max(8.5 - p.y_m, p.y_m - 11.5, 0)));
    const low = depths.filter((d) => d >= 5.5 && d <= 8.5).length;
    const high = depths.filter((d) => d >= 9.5 && d <= 12).length;
    const kind = people.length === 6 ? low === 6 ? "defense_6_0" : low === 5 && high === 1 ? "defense_5_1" : null : null;
    const ids = people.map((p) => p.track_id).sort((a, b) => a - b);
    if (!kind) { flush(); continue; }
    if (run && (run.kind !== kind || run.team !== sample.defending_team || run.goal !== sample.goal_x ||
        run.scene !== sample.scene || sample.frame_index !== run.indices.at(-1)! + 1 || ids.join() !== run.ids.join())) flush();
    if (!run) run = { kind, team: sample.defending_team, goal: sample.goal_x, scene: sample.scene, indices: [], ids };
    run.indices.push(sample.frame_index);
  }
  flush();
  return results;
}

function estimatedBlocks(report: TrackingReport, preparation: SpatialPreparation) {
  const results: TacticalProposal[] = [];
  for (const team of ["A", "B"] as const) for (const goal of [0, 40]) {
    let indices: number[] = [], ids = new Set<number>(), support = 1;
    const flush = () => {
      if (indices.length && report.frames[indices.at(-1)!]!.video_ms - report.frames[indices[0]!]!.video_ms >= 2000)
        results.push({ ...proposal("near_goal_block", report, indices, [...ids], team, support),
          id: `${proposal("near_goal_block", report, indices, [], team, support).id}:goal-${goal}`,
          evidence_quality: "unreviewed_camera_and_kits" });
      indices = []; ids = new Set(); support = 1;
    };
    for (const frame of preparation.frames) {
      const people = frame.persons.filter((p) => {
        if (!p.court_point || p.colour.team !== team || p.colour.support < .5) return false;
        const [x, y] = p.court_point;
        const distance = Math.hypot(x - goal, Math.max(8.5 - y, y - 11.5, 0));
        return distance >= 5.5 && distance <= 9;
      });
      const lateral = people.map((p) => p.court_point![1]);
      const depth = people.map((p) => p.court_point![0]);
      const eligible = frame.calibration.state !== "unavailable" && people.length >= 4 && people.length <= 7 &&
        Math.max(...lateral) - Math.min(...lateral) >= 4 && Math.max(...depth) - Math.min(...depth) <= 5;
      if (!eligible) { flush(); continue; }
      const combined = new Set([...ids, ...people.map((p) => p.track_id)]);
      if (indices.length && (frame.scene !== report.frames[indices.at(-1)!]!.scene || combined.size > 10)) flush();
      indices.push(frame.frame_index);
      people.forEach((p) => { ids.add(p.track_id); support = Math.min(support, p.colour.support); });
    }
    flush();
  }
  return results;
}

export function extractTacticalProposals(input: TrackingReport, corrections: TrackingCorrections = {}, ground?: TacticalGround, preparation?: SpatialPreparation) {
  const report = trackingSchema.parse(input);
  validateCorrections(report, corrections);
  const verified = ground ? parseTacticalGround(ground, report, corrections) : undefined;
  const prepared = preparation ? parseSpatialPreparation(preparation, report, corrections) : undefined;
  const motion = motionProposals(report, corrections);
  const all = [...motion.proposals, ...(verified ? defenseProposals(report, verified) : []),
    ...(prepared ? estimatedBlocks(report, prepared) : [])]
    .sort((a, b) => a.start_ms - b.start_ms || a.id.localeCompare(b.id));
  return { proposals: all.slice(0, 200), truncated: all.length > 200,
    diagnostics: { ...motion.diagnostics, reviewed_ground_frames: verified?.frames.length ?? 0,
      estimated_calibrated_frames: prepared?.frames.filter((f) => f.calibration.state !== "unavailable").length ?? 0,
      estimated_kit_observations: prepared?.frames.reduce((n, f) => n + f.persons.filter((p) => p.colour.team !== null).length, 0) ?? 0 },
    defense_ready: Boolean(verified), rule_version: TACTICAL_RULE_VERSION };
}

export function validateTacticalReview(report: TrackingReport, corrections: TrackingCorrections, input: unknown): TacticalReview {
  const review = tacticalReviewSchema.parse(input);
  const valid = new Set(extractTacticalProposals(report, corrections, review.ground, review.preparation).proposals.map((p) => p.id));
  if (Object.keys(review.decisions).some((id) => !valid.has(id))) throw new Error("Stale or unrelated tactical decision");
  return review;
}
