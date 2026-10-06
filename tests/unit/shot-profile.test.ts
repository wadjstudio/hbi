import { it, expect } from "vitest";
import { shotProfile } from "../../features/analysis/shot-profile";
import type { Row } from "../../types/workspace";
it("keeps pending and legacy shot origins visible without inventing locations", () => {
  const row = (
    id: string,
    result: string,
    zone: string,
    review_required = false,
  ) => ({ id, organization_id: "org", result, zone, review_required }) as Row;
  const profile = shotProfile([
    row("a", "goal", "lw"),
    row("b", "save", "nine_meter_right"),
    row("c", "miss", "center"),
    row("d", "unknown", "rw"),
    row("e", "goal", "rw", true),
  ]);
  expect(profile.sample).toBe(3);
  expect(profile.pending).toBe(2);
  expect(
    profile.groups.find((g) => g.key === "9m")?.shots.map((s) => s.id),
  ).toEqual(["b"]);
  expect(profile.missing.map((s) => s.id)).toEqual(["c"]);
  expect(profile.groups.find((g) => g.key === "rw")?.shots).toHaveLength(0);
});
