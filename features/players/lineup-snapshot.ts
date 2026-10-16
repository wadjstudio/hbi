import type { SessionScope } from "@/features/analysis/session-statistics";
import { n, s, positions, type Row } from "@/types/workspace";

export type LineupClock = { period: number; clockMs: number } | null;
export const lineupSnapshot = (
  scope: SessionScope,
  teamId: string,
  clock: LineupClock,
  input: { roster: Row[]; intervals: Row[] },
) => {
  const roster = input.roster.filter(
    (row) =>
      row.organization_id === scope.organizationId &&
      row.match_id === scope.matchId &&
      row.team_id === teamId,
  );
  const intervals = input.intervals.filter(
    (row) =>
      Boolean(scope.sessionId) &&
      row.organization_id === scope.organizationId &&
      row.match_id === scope.matchId &&
      row.analysis_session_id === scope.sessionId &&
      row.team_id === teamId,
  );
  const hasClock = Boolean(
    clock &&
    Number.isInteger(clock.period) &&
    clock.period > 0 &&
    clock.period <= 4 &&
    Number.isFinite(clock.clockMs) &&
    clock.clockMs >= 0,
  );
  const valid = (row: Row) =>
    Number.isInteger(row.period) &&
    n(row.period) >= 1 &&
    n(row.period) <= 4 &&
    typeof row.start_clock_ms === "number" &&
    Number.isFinite(row.start_clock_ms) &&
    row.start_clock_ms >= 0 &&
    (row.end_clock_ms == null ||
      (typeof row.end_clock_ms === "number" &&
        Number.isFinite(row.end_clock_ms) &&
        row.end_clock_ms > row.start_clock_ms));
  const invalid = intervals.filter((row) => !valid(row));
  const candidates = hasClock
    ? intervals.filter(
        (row) =>
          valid(row) &&
          n(row.period) === clock!.period &&
          n(row.start_clock_ms) <= clock!.clockMs &&
          (row.end_clock_ms == null || clock!.clockMs < n(row.end_clock_ms)),
      )
    : [];
  const counts = new Map<string, number>();
  for (const row of candidates)
    counts.set(s(row.player_id), (counts.get(s(row.player_id)) ?? 0) + 1);
  const ambiguous = candidates.filter(
    (row) => !s(row.player_id) || counts.get(s(row.player_id))! > 1,
  );
  const active = candidates.filter((row) => !ambiguous.includes(row));
  const placed = active.filter((row) =>
    positions.some((position) => position === row.position),
  );
  const unplaced = active.filter((row) => !placed.includes(row));
  return {
    roster,
    intervals,
    hasClock,
    active,
    placed,
    unplaced,
    ambiguous,
    invalid,
  };
};

// Schematic role anchors, never measured/tracked coordinates or an inferred defensive formation.
export const lineupAnchors = {
  GK: [0.12, 0.5],
  LW: [0.75, 0.15],
  LB: [0.48, 0.23],
  CB: [0.4, 0.5],
  RB: [0.48, 0.77],
  RW: [0.75, 0.85],
  P: [0.75, 0.5],
} as const;
