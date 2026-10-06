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
