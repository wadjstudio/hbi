import { n, s, type Row } from "@/types/workspace";
export function ratio(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}
export function shotSummary(shots: Row[]) {
  const reviewed = shots.filter(
    (r) => !r.review_required && r.result !== "unknown",
  );
  const goals = reviewed.filter((r) => r.result === "goal").length;
  return {
    sample: reviewed.length,
    goals,
    efficiency: ratio(goals, reviewed.length),
    pending: shots.length - reviewed.length,
  };
}
export function keeperSummary(shots: Row[], id: string) {
  const faced = shots.filter(
    (r) =>
      !r.review_required &&
      !r.empty_goal &&
      r.goalkeeper_id === id &&
      ["goal", "save"].includes(s(r.result)),
  );
  const saves = faced.filter((r) => r.result === "save").length;
  return {
    sample: faced.length,
    saves,
    conceded: faced.length - saves,
    percentage: ratio(saves, faced.length),
  };
}
export function intervalMinutes(rows: Row[]): number | null {
  if (!rows.length || rows.some((r) => !r.verified || r.end_clock_ms == null))
    return null;
  return rows.reduce(
    (v, r) => v + (n(r.end_clock_ms) - n(r.start_clock_ms)) / 60000,
    0,
  );
}
export function percent(v: number | null): string {
  return v == null ? "—" : `${(100 * v).toFixed(1)}%`;
}
export function positionAt(
  rows: Row[],
  id: string,
  period: number,
  clock: number,
): string | null {
  return (
    s(
      rows.find(
        (r) =>
          r.player_id === id &&
          n(r.period) === period &&
          n(r.start_clock_ms) <= clock &&
          (r.end_clock_ms == null || clock < n(r.end_clock_ms)),
      )?.position,
    ) || null
  );
}
