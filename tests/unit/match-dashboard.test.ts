import { describe, expect, it } from "vitest";
import { matchDashboard } from "@/features/analysis/match-dashboard";
import type { Row } from "@/types/workspace";
const row = (value: { id: string; [key: string]: unknown }): Row => ({
  ...value,
  organization_id: "org",
});
describe("match dashboard samples", () => {
  it("keeps attempts canonical, pending outcomes unknown, and opposing data excluded", () => {
    const events: Row[] = [
      { id: "e1", team_id: "t", possession_id: "p1" },
      { id: "e2", team_id: "t" },
      { id: "e3", team_id: "opponent" },
    ].map(row);
    const shots: Row[] = [
      { id: "s1", event_id: "e1", result: "goal", shooter_id: "a" },
      { id: "s2", event_id: "e2", result: "unknown", shooter_id: "a" },
      { id: "s3", event_id: "e3", result: "goal" },
    ].map(row);
    const possessions: Row[] = [
      { id: "p1", team_id: "t", end_ms: 2000, result: "goal" },
      { id: "p2", team_id: "t", end_ms: 3000, result: null },
      { id: "p3", team_id: "t", end_ms: null, result: "goal" },
    ].map(row);
    const d = matchDashboard("t", events, shots, possessions);
    expect(d.summary).toMatchObject({ goals: 1, sample: 1, pending: 1 });
    expect(d.players[0]?.summary.sample).toBe(1);
    expect(d.closed).toHaveLength(2);
    expect(d.resolved).toHaveLength(1);
    expect(d.possessionEfficiency).toBe(1);
  });
  it("returns an unknown denominator for unclassified possessions and retains unknown turnover phase", () => {
    const d = matchDashboard(
      "t",
      [row({ id: "e", team_id: "t", event_type: "turnover", phase: null })],
      [],
      [row({ id: "p", team_id: "t", end_ms: 1000, result: null })],
    );
    expect(d.possessionEfficiency).toBeNull();
    expect(d.summary.efficiency).toBeNull();
    expect(d.phases[0]?.phase).toBe("other");
  });
});
