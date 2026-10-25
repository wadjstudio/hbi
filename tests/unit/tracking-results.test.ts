import { describe, expect, it } from "vitest";
import { trackingFixture } from "@/tests/fixtures/tracking-results";
import { parseTracking, trackingSchema, trackingFrameIndex, visibleTrackingBox,
  trackingCorrectionKey, validateCorrections } from "@/features/analysis/tracking-results";
describe("source-bound tracking", () => {
  it("matches the original file and geometry without creating match events", () => {
    const report = trackingFixture();
    expect(parseTracking(report, { ...report.source, file_size_bytes: 500 })).toEqual(report);
    expect(report).not.toHaveProperty("events");
    for (const patch of [{ local_fingerprint: "d".repeat(64) }, { width: 720 }, { file_size_bytes: 501 }, { duration_ms: 1000 }])
      expect(() => parseTracking(report, { ...report.source, file_size_bytes: 500, ...patch })).toThrow();
  });
  it("does not look ahead, interpolate a missing box, or carry boxes beyond the sample", () => {
    const report = trackingFixture();
    expect(trackingFrameIndex(report, 999)).toBe(-1);
    expect(trackingFrameIndex(report, 1099)).toBe(0);
    expect(report.frames[trackingFrameIndex(report, 1100)]?.persons).toEqual([]);
    expect(trackingFrameIndex(report, 1300)).toBe(-1);
    expect(trackingFrameIndex(report, Number.NaN)).toBe(-1);
  });
  it("rejects duplicate track IDs, scene jumps and invalid time grids", () => {
    const duplicate = trackingFixture(); duplicate.frames[0]!.persons.push(duplicate.frames[0]!.persons[0]!);
    expect(() => trackingSchema.parse(duplicate)).toThrow();
    const cut = trackingFixture(); cut.frames[2]!.scene = 3;
    expect(() => trackingSchema.parse(cut)).toThrow();
    const time = trackingFixture(); time.frames[1]!.video_ms = 1000;
    expect(() => trackingSchema.parse(time)).toThrow();
  });
  it("bounds raw boxes and clips only their visible portion for rendering", () => {
    const report = trackingFixture(); report.frames[0]!.persons[0]!.box = [0, 0, 0, 1];
    expect(() => trackingSchema.parse(report)).toThrow();
    expect(visibleTrackingBox([-.2, .1, .3, 1.2])).toEqual([0, .1, .3, 1]);
    expect(visibleTrackingBox([-1, 0, -.5, .5])).toBeNull();
  });
  it("keeps corrections local to an exact frame and scene; null explicitly hides", () => {
    const report = trackingFixture(), key = trackingCorrectionKey(0, 0, 1);
    const correction = { frame_index: 0, scene: 0, track_id: 1, box: null, note: "Not a player" };
    expect(validateCorrections(report, { [key]: correction })[key]?.box).toBeNull();
    expect(() => validateCorrections(report, { [key]: { ...correction, scene: 1 } })).toThrow();
    expect(() => validateCorrections(report, { [trackingCorrectionKey(1, 0, 1)]: { ...correction, frame_index: 1 } })).toThrow();
    expect(() => validateCorrections(report, { [key]: { ...correction, box: [-.1, 0, .5, .5] } })).toThrow();
    expect(validateCorrections(report, { [key]: correction })).not.toHaveProperty(trackingCorrectionKey(2, 1, 1));
  });
});
