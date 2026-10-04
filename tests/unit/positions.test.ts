import { describe, it, expect } from "vitest";
import { positionMetrics } from "@/features/players/position-metrics";
import {
  shotInput,
  clockInput,
  intervalInput,
} from "@/features/analysis/contracts";
import type { Row } from "@/types/workspace";
const org = "20000000-0000-4000-8000-000000000001",
  id = "10000000-0000-4000-8000-000000000001";
const row = (data: Record<string, unknown>) =>
  ({ id, organization_id: org, ...data }) as Row;
describe("position metrics and operation boundaries", () => {
  it("uses match positions and nine-metre samples for backs", () => {
    const shots = [
      row({
        event_id: "a",
        shooter_id: id,
        shooter_position: "RB",
        result: "goal",
        zone: "nine_meter_right",
      }),
      row({
        event_id: "b",
        shooter_id: id,
        shooter_position: "LW",
        result: "miss",
        zone: "lw",
      }),
      row({
        event_id: "c",
        shooter_id: id,
        shooter_position: null,
        result: "goal",
      }),
    ];
    const metrics = positionMetrics(id, [], shots, []);
    expect(metrics.find((m) => m.position === "RB")).toMatchObject({
      sample: 1,
      value: 1,
      evidence: ["a"],
    });
    expect(metrics.find((m) => m.position === "LW")).toMatchObject({
      sample: 1,
      value: 0,
    });
    expect(metrics).toHaveLength(2);
  });
  it("keeps rates unknown until minutes are verified", () => {
    const event = row({
      event_type: "assist",
      actor_player_id: id,
      actor_position: "CB",
    });
    const metric = positionMetrics(id, [event], [], []).find(
      (m) => m.unit === "per30",
    );
    expect(metric?.value).toBeNull();
    expect(metric?.evidence).toEqual([id]);
  });
  it("rejects empty-goal saves and nonpositive time ranges", () => {
    expect(
      shotInput.safeParse({ event_id: id, result: "save", empty_goal: true })
        .success,
    ).toBe(false);
    expect(
      clockInput.safeParse({
        analysis_session_id: id,
        period: 1,
        video_start_ms: 10,
        video_end_ms: 10,
        clock_start_ms: 0,
        running: true,
      }).success,
    ).toBe(false);
    expect(
      intervalInput.safeParse({
        analysis_session_id: id,
        match_id: id,
        team_id: id,
        player_id: id,
        position: "CB",
        period: 1,
        start_clock_ms: 10,
        end_clock_ms: 0,
      }).success,
    ).toBe(false);
  });
});
