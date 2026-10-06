import { shotSummary, ratio } from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
export function matchDashboard(
  teamId: string,
  events: Row[],
  shots: Row[],
  possessions: Row[],
) {
  const sample = events.filter((e) => e.team_id === teamId),
    ids = new Set(sample.map((e) => e.id));
  const attempts = shots.filter((sh) => ids.has(s(sh.event_id))),
    summary = shotSummary(attempts);
  const players = [
    ...new Set(attempts.map((sh) => s(sh.shooter_id)).filter(Boolean)),
  ]
    .map((id) => {
      const rows = attempts.filter((sh) => sh.shooter_id === id);
      return { id, rows, summary: shotSummary(rows) };
    })
    .sort((a, b) => b.summary.sample - a.summary.sample);
  const closed = possessions.filter(
    (p) => p.team_id === teamId && p.end_ms != null,
  );
  const resolved = closed.filter((p) => p.result != null),
    scoring = resolved.filter((p) => p.result === "goal");
  const turnovers = sample.filter((e) => e.event_type === "turnover");
  const phases = [...new Set(turnovers.map((e) => s(e.phase) || "other"))].map(
    (phase) => ({
      phase,
      events: turnovers.filter((e) => (s(e.phase) || "other") === phase),
    }),
  );
  return {
    sample,
    attempts,
    summary,
    players,
    closed,
    resolved,
    scoring,
    possessionEfficiency: ratio(scoring.length, resolved.length),
    turnovers,
    phases,
  };
}
