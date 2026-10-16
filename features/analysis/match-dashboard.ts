import { shotSummary, ratio } from "@/lib/analytics/metrics";
import { n, s, type Row } from "@/types/workspace";
import { spatialSample } from "./spatial-sample";
export type EvidenceTrendPoint = {
  value: number;
  sample: number;
  events: Row[];
};
function cumulativeTrend(
  rows: Row[],
  events: Row[],
  key: "event_id" | "possession_id",
): EvidenceTrendPoint[] {
  let goals = 0;
  const points: EvidenceTrendPoint[] = [];
  const step = Math.max(1, Math.ceil(rows.length / 10));
  rows.forEach((row, index) => {
    if (row.result === "goal") goals++;
    if (index % step !== 0 && index !== rows.length - 1) return;
    const prefix = new Set(
      rows
        .slice(0, index + 1)
        .map((entry) => (key === "event_id" ? entry.event_id : entry.id)),
    );
    points.push({
      value: goals / (index + 1),
      sample: index + 1,
      events: events.filter((event) =>
        prefix.has(key === "event_id" ? event.id : s(event.possession_id)),
      ),
    });
  });
  return points;
}
export function recentMatchForm(teamId: string, matches: Row[]) {
  return matches
    .filter(
      (m) =>
        [m.home_team_id, m.away_team_id].includes(teamId) &&
        [m.home_score, m.away_score].every(
          (v) =>
            (typeof v === "number" ||
              (typeof v === "string" && v.trim() !== "")) &&
            Number.isInteger(Number(v)) &&
            Number(v) >= 0,
        ),
    )
    .sort(
      (a, b) =>
        s(b.starts_at).localeCompare(s(a.starts_at)) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 5)
    .map((match) => {
      const isHome = match.home_team_id === teamId;
      const goalsFor = n(isHome ? match.home_score : match.away_score);
      const goalsAgainst = n(isHome ? match.away_score : match.home_score);
      const outcome: "W" | "D" | "L" =
        goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
      return { match, goalsFor, goalsAgainst, outcome };
    });
}
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
  const locatedTurnovers = spatialSample(
    turnovers,
    "shot_x",
    "shot_y",
  ).points.map((p) => p.row);
  const reviewed = attempts
    .filter(
      (shot) =>
        !shot.review_required &&
        ["goal", "save", "miss", "blocked"].includes(s(shot.result)),
    )
    .sort(
      (a, b) =>
        n(sample.find((e) => e.id === a.event_id)?.timestamp_ms) -
          n(sample.find((e) => e.id === b.event_id)?.timestamp_ms) ||
        a.id.localeCompare(b.id),
    );
  const shotTrend = cumulativeTrend(reviewed, sample, "event_id");
  const ordered = [...resolved].sort(
    (a, b) => n(a.end_ms) - n(b.end_ms) || a.id.localeCompare(b.id),
  );
  const possessionTrend = cumulativeTrend(ordered, sample, "possession_id");
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
    locatedTurnovers,
    shotTrend,
    possessionTrend,
    phases,
  };
}
