import { describe, expect, it } from "vitest";
import { preparationFixture } from "@/tests/fixtures/spatial-preparation";
import { crossingFixture } from "@/tests/fixtures/tactical-results";
import { parseSpatialPreparation } from "@/features/analysis/spatial-preparation";

describe("unreviewed spatial preparation", () => {
  it("retains provisional groups and accepts null unknown positions without creating events", () => {
    const report = crossingFixture();
    for (const calibrated of [false, true]) {
      const value = parseSpatialPreparation(preparationFixture(calibrated), report);
      expect(value.status).toBe("unreviewed"); expect(value.confirmed_events).toEqual([]);
      expect(value.frames[0]!.persons[0]!.court_point).toEqual(calibrated ? [20, 10] : null);
    }
  });
  it("rejects a different source/model, frame time, scene, missing/duplicate tracks and kit mapping", () => {
    for (const mutate of [
      (v: ReturnType<typeof preparationFixture>) => { v.source.sha256 = "d".repeat(64); },
      (v: ReturnType<typeof preparationFixture>) => { v.tracking_model_sha256 = "d".repeat(64); },
      (v: ReturnType<typeof preparationFixture>) => { v.frames[1]!.video_ms = 1000; },
      (v: ReturnType<typeof preparationFixture>) => { v.frames[1]!.scene = 1; },
      (v: ReturnType<typeof preparationFixture>) => { v.frames[1]!.persons[0]!.track_id = 2; },
      (v: ReturnType<typeof preparationFixture>) => { v.frames[1]!.persons.pop(); },
      (v: ReturnType<typeof preparationFixture>) => { v.frames[1]!.persons[0]!.colour.team = "B"; },
    ]) { const v = preparationFixture(); mutate(v); expect(() => parseSpatialPreparation(v, crossingFixture())).toThrow(); }
  });
  it("requires current same-scene camera estimates and never bridges unavailable calibration", () => {
    const v = preparationFixture();
    v.frames[1]!.calibration = { state: "unavailable", anchor_frame_index: null };
    v.frames[1]!.persons.forEach((p) => { p.court_point = null; });
    expect(() => parseSpatialPreparation(v, crossingFixture())).toThrow();
    const cut = crossingFixture(), crossed = preparationFixture();
    cut.frames.slice(10).forEach((f) => { f.scene = 1; });
    crossed.frames.slice(10).forEach((f) => { f.scene = 1; });
    expect(() => parseSpatialPreparation(crossed, cut)).toThrow();
  });
  it("rejects metric points without calibration, invalid metres and false reviewed labels", () => {
    const v = preparationFixture(false); v.frames[0]!.persons[0]!.court_point = [20, 10];
    expect(() => parseSpatialPreparation(v, crossingFixture())).toThrow();
    const outside = preparationFixture(); outside.frames[0]!.persons[0]!.court_point = [41, 10];
    expect(() => parseSpatialPreparation(outside, crossingFixture())).toThrow();
    expect(() => parseSpatialPreparation({ ...preparationFixture(), status: "reviewed" }, crossingFixture())).toThrow();
  });
  it("does not reuse raw preparation after manual corrections or classify overlapping evidence", () => {
    const report = crossingFixture();
    expect(() => parseSpatialPreparation(preparationFixture(), report, { "0:0:1": {
      frame_index: 0, scene: 0, track_id: 1, box: null, note: "Hidden" } })).toThrow();
    const v = preparationFixture(); v.frames[0]!.persons[0]!.colour.reason = "torso_overlap";
    expect(() => parseSpatialPreparation(v, report)).toThrow();
  });
});
