import { describe, expect, it } from "vitest";
import {
  matchDashboard,
  recentMatchForm,
} from "@/features/analysis/match-dashboard";
import { parseEventCourtPosition } from "@/features/analysis/contracts";
import type { Row } from "@/types/workspace";
const row = (value: { id: string; [key: string]: unknown }): Row => ({
  ...value,
  organization_id: "org",
});
describe("match dashboard samples", () => {
  it("orders cumulative readings and returns their exact reviewed evidence prefixes", () => {
    const events = [
      row({ id: "late", team_id: "t", timestamp_ms: 300, possession_id: "p2" }),
      row({
        id: "early",
        team_id: "t",
        timestamp_ms: 100,
        possession_id: "p1",
      }),
      row({
        id: "middle",
        team_id: "t",
        timestamp_ms: 200,
        possession_id: "p1",
      }),
      row({ id: "pending", team_id: "t", timestamp_ms: 150 }),
      row({ id: "opponent", team_id: "other", timestamp_ms: 50 }),
    ];
    const shots = [
      row({ id: "s1", event_id: "late", result: "goal" }),
      row({ id: "s2", event_id: "early", result: "save" }),
      row({ id: "s3", event_id: "middle", result: "goal" }),
      row({
        id: "s4",
        event_id: "pending",
        result: "goal",
        review_required: true,
      }),
      row({ id: "s5", event_id: "opponent", result: "goal" }),
    ];
    const d = matchDashboard("t", events, shots, [
      row({ id: "p2", team_id: "t", end_ms: 350, result: "goal" }),
      row({ id: "p1", team_id: "t", end_ms: 250, result: "shot" }),
      row({ id: "unresolved", team_id: "t", end_ms: 400, result: null }),
      row({ id: "open", team_id: "t", end_ms: null, result: "goal" }),
    ]);
    expect(d.shotTrend.map((p) => p.value)).toEqual([0, 0.5, 2 / 3]);
    expect(d.shotTrend.map((p) => p.sample)).toEqual([1, 2, 3]);
    expect(d.shotTrend[0]?.events.map((e) => e.id)).toEqual(["early"]);
    expect(new Set(d.shotTrend[1]?.events.map((e) => e.id))).toEqual(
      new Set(["early", "middle"]),
    );
    expect(d.possessionTrend.map((p) => p.value)).toEqual([0, 0.5]);
    expect(d.possessionTrend[1]?.events).toHaveLength(3);
  });
  it("never converts missing court coordinates into zero locations", () => {
    const events = [
      { id: "origin", shot_x: 0, shot_y: 0 },
      { id: "missing" },
      { id: "partial", shot_x: 0.2 },
      { id: "outside", shot_x: 1.1, shot_y: 0.3 },
      { id: "invalid", shot_x: "NaN", shot_y: 0.3 },
      { id: "blank", shot_x: "", shot_y: 0.3 },
      { id: "boolean", shot_x: false, shot_y: 0.3 },
    ].map((entry) => row({ ...entry, team_id: "t", event_type: "turnover" }));
    const d = matchDashboard("t", events, [], []);
    expect(d.locatedTurnovers.map((e) => e.id)).toEqual(["origin"]);
    expect(d.shotTrend).toEqual([]);
    expect(d.possessionTrend).toEqual([]);
    expect(parseEventCourtPosition("", " ")).toEqual({
      shot_x: null,
      shot_y: null,
    });
    expect(parseEventCourtPosition("0", "1")).toEqual({ shot_x: 0, shot_y: 1 });
    for (const [x, y] of [
      ["0", ""],
      ["", "1"],
      ["1.1", "0"],
      ["NaN", ".5"],
    ])
      expect(() => parseEventCourtPosition(x!, y!)).toThrow();
  });
  it("computes recent form from the selected team's side and excludes unknown scores", () => {
    const matches = [
      row({
        id: "awayWin",
        home_team_id: "other",
        away_team_id: "t",
        home_score: 20,
        away_score: 25,
        starts_at: "2025-01-02",
      }),
      row({
        id: "homeLoss",
        home_team_id: "t",
        away_team_id: "other",
        home_score: 19,
        away_score: 22,
        starts_at: "2025-01-03",
      }),
      row({
        id: "draw",
        home_team_id: "t",
        away_team_id: "other",
        home_score: 0,
        away_score: 0,
        starts_at: "2025-01-01",
      }),
      ...[null, "", false, "bad"].map((home_score, i) =>
        row({
          id: `missing${i}`,
          home_team_id: "t",
          away_team_id: "other",
          home_score,
          away_score: 10,
        }),
      ),
      row({
        id: "foreign",
        home_team_id: "elsewhere",
        away_team_id: "other",
        home_score: 30,
        away_score: 20,
      }),
    ];
    expect(
      recentMatchForm("t", matches).map((entry) => [
        entry.match.id,
        entry.goalsFor,
        entry.goalsAgainst,
        entry.outcome,
      ]),
    ).toEqual([
      ["homeLoss", 19, 22, "L"],
      ["awayWin", 25, 20, "W"],
      ["draw", 0, 0, "D"],
    ]);
    expect(recentMatchForm("t", [])).toEqual([]);
  });
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
