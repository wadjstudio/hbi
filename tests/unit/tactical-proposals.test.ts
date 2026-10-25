import { describe, expect, it } from "vitest";
import { crossingFixture, defenseFixture } from "@/tests/fixtures/tactical-results";
import { extractTacticalProposals, parseTacticalGround, validateTacticalReview } from "@/features/analysis/tactical-proposals";
import { trackingCorrectionKey } from "@/features/analysis/tracking-results";
import { preparationFixture } from "@/tests/fixtures/spatial-preparation";

function estimatedDefenseFixture() {
  const { report, ground } = defenseFixture();
  const preparation = preparationFixture();
  preparation.source = report.source;
  preparation.frames = report.frames.map((frame, i) => ({
    ...preparation.frames[0]!, frame_index: i, video_ms: frame.video_ms,
    image: `frame-${String(i).padStart(4, "0")}.jpg`,
    calibration: { state: "estimated_seed" as const, anchor_frame_index: i },
    persons: frame.persons.map((p, j) => ({ track_id: p.track_id,
      colour: { group: "red" as const, support: .8, team: "A" as const, reason: "colour_only" as const },
      court_point: [ground.frames[i]!.persons[j]!.x_m, ground.frames[i]!.persons[j]!.y_m] as [number, number] })),
  }));
  return { report, preparation };
}

describe("review-only tactical rules", () => {
  it("keeps sustained estimated blocks provisional without promoting them to a defensive formation", () => {
    const { report, preparation } = estimatedDefenseFixture();
    const result = extractTacticalProposals(report, {}, undefined, preparation);
    expect(result.defense_ready).toBe(false);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({ kind: "near_goal_block", team: "A",
      evidence_quality: "unreviewed_camera_and_kits", track_ids: [1, 2, 3, 4, 5, 6] });
    expect(result.proposals[0]!.frame_indices).toHaveLength(31);
    expect(validateTacticalReview(report, {}, { preparation, decisions: {} }).preparation?.status).toBe("unreviewed");
  });
  it("does not bridge missing calibration, unknown kit groups or camera cuts in estimated blocks", () => {
    for (const mode of ["calibration", "colour", "scene"] as const) {
      const { report, preparation } = estimatedDefenseFixture();
      if (mode === "calibration") {
        preparation.frames[15]!.calibration = { state: "unavailable", anchor_frame_index: null };
        preparation.frames[15]!.persons.forEach((p) => { p.court_point = null; });
      } else if (mode === "colour") {
        preparation.frames[15]!.persons.forEach((p) => {
          p.colour = { group: "unknown", support: 0, team: null, reason: "colour_only" };
        });
      } else {
        report.frames.slice(15).forEach((f) => { f.scene = 1; });
        preparation.frames.slice(15).forEach((f) => { f.scene = 1; });
      }
      expect(extractTacticalProposals(report, {}, undefined, preparation).proposals).toEqual([]);
    }
  });
  it("extracts a deterministic visual crossing with frame evidence and no fabricated team/ball/event", () => {
    const report = crossingFixture(), before = JSON.stringify(report);
    const result = extractTacticalProposals(report), p = result.proposals[0]!;
    expect(result.defense_ready).toBe(false); expect(result.proposals).toHaveLength(1);
    expect(p.kind).toBe("crossing_motion"); expect(p.team).toBeNull(); expect(p.track_ids).toEqual([1, 2]);
    expect(p.frame_indices[0]).toBe(0); expect(p.end_ms).toBeLessThanOrEqual(report.end_ms);
    expect(p.support).toBe(.8); expect(p).not.toHaveProperty("goal"); expect(p).not.toHaveProperty("ball");
    expect(extractTacticalProposals(report)).toEqual(result); expect(JSON.stringify(report)).toBe(before);
    expect(validateTacticalReview(report, {}, { decisions: { [p.id]: { status: "reviewed", note: "Coach checked" } } }).decisions[p.id]?.status).toBe("reviewed");
  });
  it("does not join missing detections or camera scenes", () => {
    for (const mode of ["missing", "cut"] as const) {
      const report = crossingFixture();
      if (mode === "missing") report.frames[10]!.persons = [];
      else for (let i = 10; i < report.frames.length; i++) report.frames[i]!.scene = 1;
      expect(extractTacticalProposals(report).proposals).toEqual([]);
    }
  });
  it("does not turn common camera translation or parallel runs into a crossing", () => {
    const report = crossingFixture();
    report.frames.forEach((f, i) => { f.persons[1]!.box = [.3 + i * .02, .5, .34 + i * .02, .8]; });
    expect(extractTacticalProposals(report).proposals).toEqual([]);
  });
  it("requires comparable depth, usable feet, sufficient scores and sustained motion", () => {
    for (const mode of ["depth", "clipped", "score"] as const) {
      const report = crossingFixture();
      report.frames.forEach((f) => { const p = f.persons[1]!;
        if (mode === "depth") p.box = [p.box[0], .05, p.box[2], .2];
        if (mode === "clipped") p.box[3] = 1.1;
        if (mode === "score") p.score = .3;
      });
      expect(extractTacticalProposals(report).proposals).toEqual([]);
    }
  });
  it("honours exact-frame hidden corrections without carrying them into another frame", () => {
    const report = crossingFixture(), corrections = { [trackingCorrectionKey(10, 0, 1)]: {
      frame_index: 10, scene: 0, track_id: 1, box: null, note: "Occluded" } };
    expect(extractTacticalProposals(report, corrections).proposals).toEqual([]);
    const id = extractTacticalProposals(report).proposals[0]!.id;
    expect(() => validateTacticalReview(report, corrections, { decisions: { [id]: { status: "reviewed", note: "Stale" } } })).toThrow();
  });
  it("requires reviewed source-bound court evidence before producing defensive shapes", () => {
    for (const advanced of [false, true]) {
      const { report, ground } = defenseFixture(advanced);
      expect(extractTacticalProposals(report).proposals.some((p) => p.kind.startsWith("defense"))).toBe(false);
      const shapes = extractTacticalProposals(report, {}, ground).proposals.filter((p) => p.kind.startsWith("defense"));
      expect(shapes).toHaveLength(1); expect(shapes[0]!.kind).toBe(advanced ? "defense_5_1" : "defense_6_0");
      expect(shapes[0]!.team).toBe("A"); expect(shapes[0]!.track_ids).toHaveLength(6);
    }
  });
  it("rejects wrong sources/models, unreviewed calibration, duplicate/absent tracks and invalid metres", () => {
    const { report, ground } = defenseFixture();
    for (const mutate of [
      (g: typeof ground) => { g.source_sha256 = "d".repeat(64); },
      (g: typeof ground) => { g.model_sha256 = "d".repeat(64); },
      (g: typeof ground) => { g.frames[0]!.persons[0]!.x_m = 41; },
      (g: typeof ground) => { g.frames[0]!.persons[0]!.track_id = 99; },
      (g: typeof ground) => { g.frames[0]!.persons[1]!.track_id = 1; },
      (g: typeof ground) => { g.frames[0]!.frame_index = 1; },
    ]) { const input = structuredClone(ground); mutate(input); expect(() => parseTacticalGround(input, report)).toThrow(); }
    expect(() => parseTacticalGround({ ...ground, frames: [{ ...ground.frames[0], calibration_reviewed: false }] }, report)).toThrow();
  });
  it("requires recalibration against the exact correction basis and never uses a hidden observation", () => {
    const { report, ground } = defenseFixture();
    const corrections = { "0:0:1": { frame_index: 0, scene: 0, track_id: 1,
      box: [.1, .3, .14, .7] as [number, number, number, number], note: "Moved foot" } };
    expect(() => parseTacticalGround(ground, report, corrections)).toThrow();
    expect(parseTacticalGround({ ...ground, corrections }, report, corrections).corrections).toEqual(corrections);
    const hidden = { "0:0:1": { ...corrections["0:0:1"], box: null } };
    expect(() => parseTacticalGround({ ...ground, corrections: hidden }, report, hidden)).toThrow();
  });
  it("requires two continuous seconds and exactly six outfield defenders; does not bridge gaps or direction changes", () => {
    for (const mode of ["gap", "missing", "direction", "team"] as const) {
      const { report, ground } = defenseFixture();
      if (mode === "gap") ground.frames.splice(15, 1);
      if (mode === "missing") ground.frames.forEach((f) => f.persons.splice(0, 1));
      if (mode === "direction") ground.frames.slice(15).forEach((f) => { f.goal_x = 40; f.persons.forEach((p) => { p.x_m = 40 - p.x_m; }); });
      if (mode === "team") ground.frames.forEach((f) => { f.persons[0]!.team = "B"; });
      expect(extractTacticalProposals(report, {}, ground).proposals.filter((p) => p.kind.startsWith("defense"))).toEqual([]);
    }
  });
});
