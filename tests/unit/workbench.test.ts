import { expect, it, vi } from "vitest";
import {
  filterWorkbenchEvents,
  tacticalGroups,
  timelineWindow,
} from "@/features/analysis/workbench";
import {
  importReferenceMatch,
  isReferenceMatch,
  referenceMarker,
} from "@/features/matches/reference-match";
import type { Row, Table } from "@/types/workspace";
const row = (id: string, props: Partial<Row> = {}): Row => ({
  id,
  organization_id: "org",
  ...props,
});

it("filters goal evidence through the canonical attempt rather than the legacy event label", () => {
  const events = [
    row("e1", { event_type: "shot", actor_player_id: "p1" }),
    row("e2", { event_type: "goal", actor_player_id: "p2" }),
    row("e3", { event_type: "turnover" }),
  ];
  const shots = [
    row("s1", { event_id: "e1", result: "goal" }),
    row("s2", { event_id: "e2", result: "save" }),
  ];
  expect(
    filterWorkbenchEvents(events, shots, "result:goal").map((e) => e.id),
  ).toEqual(["e1"]);
  expect(filterWorkbenchEvents(events, shots, "result:goal", "p2")).toEqual([]);
  expect(
    filterWorkbenchEvents(events, shots, "turnover").map((e) => e.id),
  ).toEqual(["e3"]);
});
it("filters shots and seven-metre awards without inventing attempts or trusting conflicting legacy labels", () => {
  const events = [
    row("award", { event_type: "seven_meter_won" }),
    row("shot", { event_type: "shot" }),
    row("legacy", { event_type: "seven_meter_shot" }),
    row("conflict", { event_type: "seven_meter_shot" }),
  ];
  const shots = [
    row("s1", { event_id: "shot", zone: "seven_meter" }),
    row("s2", { event_id: "conflict", zone: "lw" }),
  ];
  expect(
    filterWorkbenchEvents(events, shots, "seven_meter").map((e) => e.id),
  ).toEqual(["award", "shot", "legacy"]);
  expect(filterWorkbenchEvents(events, shots, "shot").map((e) => e.id)).toEqual(
    ["shot", "legacy", "conflict"],
  );
});
it("filters numerical superiority from recorded counts and transition from the recorded phase", () => {
  const events = [
    row("counted", {
      numerical_for: 7,
      numerical_against: "6",
      phase: "fast_break",
    }),
    row("phaseOnly", { phase: "seven_vs_six" }),
    row("invalid", { numerical_for: [7], numerical_against: 6 }),
    row("missing", { numerical_for: null, numerical_against: 6 }),
  ];
  expect(
    filterWorkbenchEvents(events, [], "numerical:7:6").map((e) => e.id),
  ).toEqual(["counted"]);
  expect(
    filterWorkbenchEvents(events, [], "phase:fast_break").map((e) => e.id),
  ).toEqual(["counted"]);
});
it("filters coded defensive systems only through compatible possession and organization links", () => {
  const possession = row("p", {
    match_id: "m",
    analysis_session_id: "session",
  });
  const events = [
    row("valid", {
      possession_id: "p",
      match_id: "m",
      analysis_session_id: "session",
    }),
    row("foreign", {
      possession_id: "p",
      match_id: "m",
      analysis_session_id: "another",
    }),
  ];
  const context = {
    possessions: [possession],
    assignments: [
      row("a", { possession_id: "p", term_id: "t" }),
      row("duplicate", { possession_id: "p", term_id: "t" }),
    ],
    terms: [
      {
        ...row("t", { category: "defense_system", code: "6:0" }),
        organization_id: null,
      },
    ],
  };
  expect(
    filterWorkbenchEvents(events, [], "defense:6:0", "", context).map(
      (e) => e.id,
    ),
  ).toEqual(["valid"]);
  expect(filterWorkbenchEvents(events, [], "defense:5:1", "", context)).toEqual(
    [],
  );
  expect(
    filterWorkbenchEvents(events, [], "defense:6:0", "", {
      ...context,
      assignments: [
        row("bad", {
          organization_id: "another",
          possession_id: "p",
          term_id: "t",
        }),
      ],
    }),
  ).toEqual([]);
});
it("does not count another session's possessions or repeated descriptors in a tactical sample", () => {
  const groups = tacticalGroups(
    [row("p1")],
    [
      row("a1", { possession_id: "p1", term_id: "t1" }),
      row("a2", { possession_id: "p1", term_id: "t1" }),
      row("a3", { possession_id: "p2", term_id: "t1" }),
    ],
    [row("t1", { category: "attack_action" })],
    [row("e1", { possession_id: "p1" }), row("e2", { possession_id: "p2" })],
    "attack_action",
  );
  expect(groups[0]?.possessions.map((p) => p.id)).toEqual(["p1"]);
  expect(groups[0]?.events.map((e) => e.id)).toEqual(["e1"]);
});
it("clamps zoom to the known source duration and handles missing duration", () => {
  expect(timelineWindow(120000, 119000, 4)).toEqual({
    start: 90000,
    end: 120000,
    width: 30000,
    duration: 120000,
  });
  expect(timelineWindow(NaN, Infinity, 0)).toEqual({
    start: 0,
    end: 0,
    width: 0,
    duration: 0,
  });
});
it("checks all import permissions before writing any team", async () => {
  const save = vi.fn();
  await expect(
    importReferenceMatch({
      org: "org",
      role: "viewer",
      teams: [],
      matches: [],
      save,
    }),
  ).rejects.toThrow();
  await expect(
    importReferenceMatch({
      org: "org",
      role: "analyst",
      teams: [],
      matches: [],
      save,
    }),
  ).rejects.toThrow();
  expect(save).not.toHaveBeenCalled();
});
it("retries a partial reference import using the same IDs and never creates synthetic analysis", async () => {
  const calls: { table: Table; data: Partial<Row> }[] = [];
  const save = async (table: Table, data: Partial<Row>) => {
    calls.push({ table, data });
    return row(data.id!, data);
  };
  const input = { org: "org", role: "owner", teams: [], matches: [], save };
  const first = await importReferenceMatch(input);
  const second = await importReferenceMatch(input);
  expect(first.id).toBe(second.id);
  expect(calls.map((c) => c.table)).toEqual([
    "teams",
    "teams",
    "matches",
    "teams",
    "teams",
    "matches",
  ]);
  expect(first).toMatchObject({ home_score: 31, away_score: 28 });
  expect(first.starts_at).toBeUndefined();
  expect(isReferenceMatch(first)).toBe(true);
  expect(calls[0]?.data.id).toBe(calls[3]?.data.id);
  const third = await importReferenceMatch({ ...input, org: "another-org" });
  expect(third.id).not.toBe(first.id);
  const noWrite = vi.fn();
  expect(
    await importReferenceMatch({
      ...input,
      role: "viewer",
      matches: [row("existing", { notes: referenceMarker })],
      save: noWrite,
    }),
  ).toMatchObject({ id: "existing" });
  expect(noWrite).not.toHaveBeenCalled();
});
