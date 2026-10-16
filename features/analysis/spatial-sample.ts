import type { Row } from "@/types/workspace";
export type SpatialPoint = { row: Row; x: number; y: number };
export type SpatialBin = {
  key: string;
  column: number;
  band: number;
  points: SpatialPoint[];
  share: number;
};
const coordinate = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null;
};
// Fixed normalized sectors; no mirroring, inferred positions, movement or probability model.
export const spatialSample = (rows: Row[], xField: string, yField: string) => {
  const points: SpatialPoint[] = [],
    missing: Row[] = [];
  for (const row of rows) {
    const x = coordinate(row[xField]),
      y = coordinate(row[yField]);
    if (x == null || y == null) missing.push(row);
    else points.push({ row, x, y });
  }
  const bins: SpatialBin[] = [];
  for (let band = 0; band < 2; band++)
    for (let column = 0; column < 5; column++) {
      const subset = points.filter(
        (p) =>
          Math.min(4, Math.floor(p.x * 5)) === column &&
          Math.min(1, Math.floor(p.y * 2)) === band,
      );
      if (subset.length)
        bins.push({
          key: `${column}:${band}`,
          column,
          band,
          points: subset,
          share: subset.length / points.length,
        });
    }
  return { points, missing, bins };
};
