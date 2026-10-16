import { expect, it } from "vitest";
import { spatialSample } from "@/features/analysis/spatial-sample";
import type { Row } from "@/types/workspace";
const row = (id: string, x: Row[string], y: Row[string]): Row => ({
  id,
  organization_id: "org",
  x,
  y,
});
it("keeps zero/boundary locations and excludes absent, blank, nonfinite or malformed coordinates", () => {
  const sample = spatialSample(
    [
      row("zero", 0, 0),
      row("end", 1, "1"),
      row("null", null, 0.5),
      row("blank", " ", 0.5),
      row("array", [0.5], 0.5),
      row("bool", true, 0.5),
      row("infinity", Infinity, 0.5),
      row("outside", 1.1, 0.5),
      row("partial", 0.5, undefined),
    ],
    "x",
    "y",
  );
  expect(sample.points.map((p) => p.row.id)).toEqual(["zero", "end"]);
  expect(sample.missing).toHaveLength(7);
  expect(sample.bins.map((b) => b.key)).toEqual(["0:0", "4:1"]);
});
it("assigns every located observation once and preserves exact group evidence", () => {
  const sample = spatialSample(
    [
      row("a", 0.21, 0.49),
      row("b", 0.39, 0.1),
      row("c", 0.4, 0.5),
      row("unknown", null, null),
    ],
    "x",
    "y",
  );
  expect(
    sample.bins.map((b) => [b.key, b.points.map((p) => p.row.id), b.share]),
  ).toEqual([
    ["1:0", ["a", "b"], 2 / 3],
    ["2:1", ["c"], 1 / 3],
  ]);
  expect(sample.bins.reduce((n, b) => n + b.points.length, 0)).toBe(
    sample.points.length,
  );
  expect(sample.bins.reduce((n, b) => n + b.share, 0)).toBeCloseTo(1);
  expect(spatialSample([], "x", "y").bins).toEqual([]);
});
