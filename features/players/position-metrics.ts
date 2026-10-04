import {
  shotSummary,
  keeperSummary,
  intervalMinutes,
  ratio,
} from "@/lib/analytics/metrics";
import { positions, s, type Row } from "@/types/workspace";
export type PositionMetric = {
  position: string;
  labelAr: string;
  labelEn: string;
  value: number | null;
  unit: "percent" | "per30";
  sample: number;
  evidence: string[];
};
// Every rate has a visible denominator; unknown match positions do not inherit the profile position.
export function positionMetrics(
  playerId: string,
  events: Row[],
  shots: Row[],
  intervals: Row[],
): PositionMetric[] {
  const result: PositionMetric[] = [];
  for (const position of positions) {
    const atPosition = shots.filter(
      (shot) =>
        shot.shooter_id === playerId && shot.shooter_position === position,
    );
    const ownEvents = events.filter(
      (event) =>
        event.actor_player_id === playerId && event.actor_position === position,
    );
    const stints = intervals.filter(
      (interval) =>
        interval.player_id === playerId && interval.position === position,
    );
    if (position === "GK") {
      const summary = keeperSummary(shots, playerId);
      if (stints.length || summary.sample)
        result.push({
          position,
          labelAr: "نسبة التصدي",
          labelEn: "Save percentage",
          value: summary.percentage,
          unit: "percent",
          sample: summary.sample,
          evidence: shots
            .filter(
              (shot) =>
                shot.goalkeeper_id === playerId &&
                !shot.empty_goal &&
                ["goal", "save"].includes(s(shot.result)) &&
                !shot.review_required,
            )
            .map((shot) => s(shot.event_id)),
        });
      continue;
    }
    if (!atPosition.length && !ownEvents.length && !stints.length) continue;
    const sample = ["LB", "RB"].includes(position)
      ? atPosition.filter((shot) => s(shot.zone).startsWith("nine_meter"))
      : atPosition;
    const summary = shotSummary(sample);
    result.push({
      position,
      labelAr: ["LB", "RB"].includes(position)
        ? "كفاءة تصويب 9م"
        : "كفاءة الإنهاء",
      labelEn: ["LB", "RB"].includes(position)
        ? "9m efficiency"
        : "Finishing efficiency",
      value: summary.efficiency,
      unit: "percent",
      sample: summary.sample,
      evidence: sample
        .filter((shot) => !shot.review_required && shot.result !== "unknown")
        .map((shot) => s(shot.event_id)),
    });
    if (position === "CB" || position === "P") {
      const action = position === "CB" ? "assist" : "seven_meter_won";
      const supporting = ownEvents.filter(
        (event) => event.event_type === action,
      );
      const minutes = intervalMinutes(stints);
      result.push({
        position,
        labelAr:
          position === "CB"
            ? "صناعة أهداف لكل 30 دقيقة"
            : "كسب 7م لكل 30 دقيقة",
        labelEn: position === "CB" ? "Assists per 30 min" : "7m won per 30 min",
        value: minutes == null ? null : ratio(supporting.length * 30, minutes),
        unit: "per30",
        sample: supporting.length,
        evidence: supporting.map((event) => event.id),
      });
    }
  }
  return result;
}
