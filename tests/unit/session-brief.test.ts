import { expect, it } from "vitest";
import { sessionBrief } from "@/features/reports/session-brief";
import type { Row } from "@/types/workspace";
const scope = { organizationId: "org", matchId: "match", sessionId: "session" };
const row = (id: string, fields: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  match_id: "match",
  analysis_session_id: "session",
  team_id: "home",
  ...fields,
});
const input = {
  events: [
    row("later", { timestamp_ms: 2000 }),
    row("first", { timestamp_ms: 1000 }),
    row("secondary", { analysis_session_id: "other" }),
    row("away", { team_id: "away" }),
    row("foreign", { organization_id: "other" }),
  ],
  insights: [
    row("valid", { match_id: null }),
    row("wrong-match", { match_id: "other" }),
    row("wrong-org", { organization_id: "other" }),
    row("wrong-team", { team_id: "away" }),
    row("foreign-link"),
    row("secondary-only"),
    row("json-only", { evidence: ["first"] }),
  ],
  links: [
    row("a", { insight_id: "valid", event_id: "later" }),
    row("b", { insight_id: "valid", event_id: "first" }),
    row("duplicate", { insight_id: "valid", event_id: "first" }),
    row("c", { insight_id: "wrong-match", event_id: "first" }),
    row("d", { insight_id: "wrong-org", event_id: "first" }),
    row("e", { insight_id: "wrong-team", event_id: "first" }),
    row("f", {
      insight_id: "foreign-link",
      event_id: "first",
      organization_id: "other",
    }),
    row("g", { insight_id: "secondary-only", event_id: "secondary" }),
  ],
};
it("keeps the report team/session/organization and typed event links exact and chronologically ordered", () => {
  const brief = sessionBrief(scope, "home", input);
  expect(brief.events.map((event) => event.id)).toEqual(["first", "later"]);
  expect(brief.insights.map(({ insight }) => insight.id)).toEqual(["valid"]);
  expect(brief.insights[0]!.evidence.map((event) => event.id)).toEqual([
    "first",
    "later",
  ]);
  expect(input.events[0]!.id).toBe("later");
});
it("respects the filtered selection and never invents a sample from legacy JSON or an unavailable session", () => {
  const brief = sessionBrief(scope, "home", {
    ...input,
    events: input.events.filter((event) => event.id === "later"),
  });
  expect(brief.insights[0]!.evidence.map((event) => event.id)).toEqual([
    "later",
  ]);
  expect(sessionBrief({ ...scope, sessionId: "" }, "home", input)).toEqual({
    events: [],
    insights: [],
  });
});
