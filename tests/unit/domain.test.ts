import { describe, it, expect } from "vitest";
import {
  shotSummary,
  keeperSummary,
  intervalMinutes,
  positionAt,
} from "../../lib/analytics/metrics";
import { matchClock } from "../../lib/video/time";
import { type Row } from "../../types/workspace";
const row = (props: Partial<Row>): Row => ({
  id: crypto.randomUUID(),
  organization_id: crypto.randomUUID(),
  ...props,
});
describe("canonical handball analysis", () => {
  it("counts one attempt and excludes unresolved attempts", () => {
    expect(
      shotSummary([
        row({ result: "goal" }),
        row({ result: "save" }),
        row({ result: "unknown" }),
        row({ result: "goal", review_required: true }),
      ]),
    ).toEqual({ sample: 2, goals: 1, efficiency: 0.5, pending: 2 });
  });
  it("does not turn missing samples into zero", () => {
    expect(shotSummary([]).efficiency).toBeNull();
    expect(intervalMinutes([])).toBeNull();
  });
  it("uses saves and goals faced, excluding misses, blocks and empty goals", () => {
    const shots = ["save", "goal", "miss", "blocked"].map((result) =>
      row({ result, goalkeeper_id: "g" }),
    );
    shots.push(row({ result: "goal", goalkeeper_id: "g", empty_goal: true }));
    expect(keeperSummary(shots, "g").percentage).toBe(0.5);
    expect(keeperSummary(shots, "other").percentage).toBeNull();
  });
  it("respects half-open intervals and actual playing position", () => {
    const intervals = [
      row({
        player_id: "p",
        position: "CB",
        period: 1,
        start_clock_ms: 0,
        end_clock_ms: 60000,
        verified: true,
      }),
      row({
        player_id: "p",
        position: "LB",
        period: 1,
        start_clock_ms: 60000,
        end_clock_ms: 120000,
        verified: true,
      }),
    ];
    expect(positionAt(intervals, "p", 1, 60000)).toBe("LB");
    expect(intervalMinutes(intervals)).toBe(2);
    expect(
      intervalMinutes([row({ verified: true, end_clock_ms: null })]),
    ).toBeNull();
  });
  it("maps periods independently and holds a stopped clock", () => {
    const segments = [
      row({
        period: 1,
        video_start_ms: 1000,
        video_end_ms: 4000,
        clock_start_ms: 0,
        running: true,
      }),
      row({
        period: 1,
        video_start_ms: 4000,
        video_end_ms: 5000,
        clock_start_ms: 3000,
        running: false,
      }),
      row({
        period: 2,
        video_start_ms: 6000,
        video_end_ms: 9000,
        clock_start_ms: 0,
        running: true,
      }),
    ];
    expect(matchClock(segments, 2500)).toEqual({ period: 1, clockMs: 1500 });
    expect(matchClock(segments, 4500)?.clockMs).toBe(3000);
    expect(matchClock(segments, 5500)).toBeNull();
    expect(matchClock(segments, 6500)).toEqual({ period: 2, clockMs: 500 });
  });
});
