import { expect, it } from "vitest";
import {
  sessionSample,
  teamSessionMetrics,
} from "@/features/analysis/session-statistics";
import type { Row } from "@/types/workspace";
const row = (id: string, fields: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  match_id: "m",
  analysis_session_id: "s",
  team_id: "home",
  ...fields,
});
const input = {
  events: [
    row("goal", { event_type: "goal", possession_id: "p" }),
    row("award", { event_type: "seven_meter_won" }),
    row("pending"),
    row("save", { team_id: "away" }),
    row("turnover", { event_type: "turnover" }),
    row("penalty", { event_type: "two_minute_penalty" }),
    row("otherSession", { analysis_session_id: "secondary" }),
    row("foreign", { organization_id: "other" }),
  ],
  shots: [
    row("g", { event_id: "goal", result: "goal" }),
    row("u", { event_id: "pending", result: "unknown", review_required: true }),
    row("s", { event_id: "save", result: "save" }),
    row("foreignShot", { event_id: "goal", organization_id: "other" }),
    row("secondaryShot", { event_id: "otherSession", result: "goal" }),
  ],
  possessions: [
    row("p", { end_ms: 1000, result: "goal" }),
    row("unknown", { end_ms: 2000, result: "unknown" }),
    row("open", { end_ms: null, result: "goal" }),
    row("secondary", {
      analysis_session_id: "secondary",
      end_ms: 1000,
      result: "goal",
    }),
  ],
  intervals: [row("i"), row("other", { analysis_session_id: "secondary" })],
};
it("scopes every statistics input to one organization, match and analysis session", () => {
  const sample = sessionSample(
    { organizationId: "org", matchId: "m", sessionId: "s" },
    input,
  );
  expect(sample.events.map((e) => e.id)).toEqual([
    "goal",
    "award",
    "pending",
    "save",
    "turnover",
    "penalty",
  ]);
  expect(sample.shots.map((sh) => sh.id)).toEqual(["g", "u", "s"]);
  expect(sample.possessions.map((p) => p.id)).toEqual(["p", "unknown", "open"]);
  expect(sample.intervals.map((i) => i.id)).toEqual(["i"]);
  expect(
    sessionSample({ organizationId: "org", matchId: "m", sessionId: "" }, input)
      .events,
  ).toEqual([]);
});
it("uses canonical reviewed attempts, excludes open or unresolved possessions and keeps exact evidence", () => {
  const sample = sessionSample(
    { organizationId: "org", matchId: "m", sessionId: "s" },
    input,
  );
  const metrics = teamSessionMetrics("home", sample);
  const find = (key: string) => metrics.find((m) => m.key === key)!;
  expect(find("efficiency")).toMatchObject({ value: 1, denominator: 1 });
  expect(find("efficiency").evidence.map((e) => e.id)).toEqual(["goal"]);
  expect(find("pending")).toMatchObject({ value: 1, denominator: 2 });
  expect(find("pending").evidence.map((e) => e.id)).toEqual(["pending"]);
  expect(find("scoring")).toMatchObject({ value: 1, denominator: 1 });
  expect(find("seven_meter_won").evidence.map((e) => e.id)).toEqual(["award"]);
  expect(find("two_minute_penalty").evidence.map((e) => e.id)).toEqual([
    "penalty",
  ]);
  expect(
    teamSessionMetrics("missing", sample).find((m) => m.key === "efficiency"),
  ).toMatchObject({ value: null, denominator: 0, evidence: [] });
});
