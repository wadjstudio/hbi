import { expect, it } from "vitest";
import { lineupSnapshot } from "@/features/players/lineup-snapshot";
import type { Row } from "@/types/workspace";
const scope = { organizationId: "org", matchId: "match", sessionId: "session" };
const row = (id: string, fields: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  match_id: "match",
  analysis_session_id: "session",
  team_id: "home",
  player_id: id,
  position: "RB",
  period: 1,
  start_clock_ms: 0,
  end_clock_ms: 30000,
  verified: true,
  ...fields,
});
it("uses half-open period-clock intervals and scopes organization, match, session and team", () => {
  const input = {
    roster: [
      row("starter", { starting: true }),
      row("other-team", { team_id: "away" }),
    ],
    intervals: [
      row("active"),
      row("second-period", { period: 2 }),
      row("foreign", { organization_id: "other" }),
      row("other-session", { analysis_session_id: "other" }),
      row("other-match", { match_id: "other" }),
      row("other-team", { team_id: "away" }),
    ],
  };
  expect(
    lineupSnapshot(scope, "home", { period: 1, clockMs: 0 }, input).active.map(
      (row) => row.id,
    ),
  ).toEqual(["active"]);
  expect(
    lineupSnapshot(scope, "home", { period: 1, clockMs: 30000 }, input).active,
  ).toEqual([]);
  expect(
    lineupSnapshot(scope, "home", { period: 2, clockMs: 0 }, input).active.map(
      (row) => row.id,
    ),
  ).toEqual(["second-period"]);
  const unknown = lineupSnapshot(scope, "home", null, input);
  expect(unknown.hasClock).toBe(false);
  expect(unknown.active).toEqual([]);
  expect(unknown.roster.map((row) => row.id)).toEqual(["starter"]);
});
it("preserves unverified/open records and separates overlaps, unknown roles and invalid timing without guessing", () => {
  const result = lineupSnapshot(
    scope,
    "home",
    { period: 1, clockMs: 1000 },
    {
      roster: [],
      intervals: [
        row("open", { end_clock_ms: null, verified: false }),
        row("a", { player_id: "same" }),
        row("b", { player_id: "same" }),
        row("unknown-role", { position: "unknown" }),
        row("missing-start", { start_clock_ms: null }),
        row("negative", { start_clock_ms: -1 }),
        row("inverted", { end_clock_ms: 0 }),
      ],
    },
  );
  expect(result.placed.map((row) => row.id)).toEqual(["open"]);
  expect(result.placed[0]!.verified).toBe(false);
  expect(result.ambiguous.map((row) => row.id)).toEqual(["a", "b"]);
  expect(result.unplaced.map((row) => row.id)).toEqual(["unknown-role"]);
  expect(result.invalid.map((row) => row.id)).toEqual([
    "missing-start",
    "negative",
    "inverted",
  ]);
  expect(
    lineupSnapshot(
      { ...scope, sessionId: "" },
      "home",
      { period: 1, clockMs: 1000 },
      { roster: [], intervals: [row("open")] },
    ).active,
  ).toEqual([]);
});
