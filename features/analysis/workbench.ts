import { s, type Row } from "@/types/workspace";

export const eventColors: Record<string, string> = {
  goal: "#b7f34a",
  save: "#25d9f5",
  miss: "#ff9b54",
  blocked: "#f17987",
  turnover: "#ff4d5e",
  two_min: "#f5c84c",
  shot: "#4ca8ed",
};
export function filterWorkbenchEvents(
  events: Row[],
  shots: Row[],
  kind: string,
  player = "",
) {
  const results = new Map(
    shots.map((shot) => [s(shot.event_id), s(shot.result)]),
  );
  return events.filter(
    (event) =>
      (!player || event.actor_player_id === player) &&
      (kind === "all" ||
        (kind.startsWith("result:")
          ? results.get(event.id) === kind.slice(7)
          : event.event_type === kind)),
  );
}
export function eventColor(event: Row, shots: Row[]) {
  const result = shots.find((shot) => shot.event_id === event.id)?.result;
  return (
    eventColors[s(result)] ?? eventColors[s(event.event_type)] ?? "#91a7bb"
  );
}
export function timelineWindow(
  durationMs: number,
  startMs: number,
  zoom: number,
) {
  const duration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  const scale = Number.isFinite(zoom) ? Math.min(16, Math.max(1, zoom)) : 1;
  const width = duration / scale;
  const start = Math.min(
    Math.max(0, Number.isFinite(startMs) ? startMs : 0),
    duration - width,
  );
  return { start, end: start + width, width, duration };
}
export type TacticalGroup = { term: Row; possessions: Row[]; events: Row[] };
export function tacticalGroups(
  possessions: Row[],
  assignments: Row[],
  terms: Row[],
  events: Row[],
  category: string,
): TacticalGroup[] {
  const selected = new Map(
    possessions.map((possession) => [possession.id, possession]),
  );
  return terms
    .filter((term) => term.category === category)
    .map((term) => {
      const ids = new Set(
        assignments
          .filter(
            (a) => a.term_id === term.id && selected.has(s(a.possession_id)),
          )
          .map((a) => s(a.possession_id)),
      );
      return {
        term,
        possessions: [...ids].map((id) => selected.get(id)!),
        events: events.filter((e) => ids.has(s(e.possession_id))),
      };
    })
    .filter((group) => group.possessions.length > 0)
    .sort((a, b) => b.possessions.length - a.possessions.length);
}
