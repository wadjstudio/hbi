import { s, type Row } from "@/types/workspace";
import { brand } from "@/lib/brand";

export const eventColors: Record<string, string> = {
  goal: brand.colors.goal,
  save: brand.colors.save,
  miss: "#ff9b54",
  blocked: "#f17987",
  turnover: brand.colors.turnover,
  two_min: "#F2CC44",
  two_minute_penalty: "#F2CC44",
  seven_meter_won: "#B77BFF",
  shot: "#B6C4CF",
};
export const workbenchFilters = [
  { value: "all", ar: "الكل", en: "All", color: null },
  { value: "result:goal", ar: "أهداف", en: "Goals", color: brand.colors.goal },
  { value: "shot", ar: "تصويبات", en: "Shots", color: brand.colors.save },
  { value: "result:save", ar: "تصديات", en: "Saves", color: brand.colors.cyan },
  {
    value: "turnover",
    ar: "فقد الكرة",
    en: "Turnovers",
    color: brand.colors.turnover,
  },
  { value: "seven_meter", ar: "7م", en: "7m", color: "#B77BFF" },
  { value: "two_minute_penalty", ar: "دقيقتان", en: "2 min", color: "#F2CC44" },
  {
    value: "phase:fast_break",
    ar: "هجوم سريع",
    en: "Fast break",
    color: brand.colors.cyan,
  },
  { value: "defense:6:0", ar: "6:0", en: "6:0", color: brand.colors.save },
  { value: "defense:5:1", ar: "5:1", en: "5:1", color: brand.colors.gold },
  { value: "numerical:7:6", ar: "7 ضد 6", en: "7v6", color: "#B77BFF" },
] as const;
export type TacticalFilterContext = {
  possessions: Row[];
  assignments: Row[];
  terms: (Omit<Row, "organization_id"> & { organization_id: string | null })[];
};
export function filterWorkbenchEvents(
  events: Row[],
  shots: Row[],
  kind: string,
  player = "",
  context?: TacticalFilterContext,
) {
  const attempts = new Map(shots.map((shot) => [s(shot.event_id), shot]));
  const possessionMap = new Map(
    context?.possessions.map((p) => [p.id, p]) ?? [],
  );
  const systems = new Map<string, Set<string>>();
  if (kind.startsWith("defense:") && context) {
    const terms = new Map(context.terms.map((term) => [term.id, term]));
    for (const assignment of context.assignments) {
      const p = possessionMap.get(s(assignment.possession_id)),
        term = terms.get(s(assignment.term_id));
      if (
        !p ||
        !term ||
        term.category !== "defense_system" ||
        assignment.organization_id !== p.organization_id ||
        (term.organization_id !== null &&
          term.organization_id !== p.organization_id)
      )
        continue;
      const codes = systems.get(p.id) ?? new Set<string>();
      codes.add(s(term.code));
      systems.set(p.id, codes);
    }
  }
  const isShot = (event: Row) =>
    attempts.has(event.id) ||
    [
      "shot",
      "goal",
      "save",
      "miss",
      "blocked_shot",
      "seven_meter_shot",
    ].includes(s(event.event_type));
  const numerical = (value: unknown, target: number) =>
    (typeof value === "number" || typeof value === "string") &&
    String(value).trim() !== "" &&
    Number(value) === target;
  const matches = (event: Row) => {
    if (kind === "all") return true;
    if (kind === "shot") return isShot(event);
    if (kind.startsWith("result:"))
      return attempts.get(event.id)?.result === kind.slice(7);
    if (kind === "seven_meter")
      return (
        event.event_type === "seven_meter_won" ||
        attempts.get(event.id)?.zone === "seven_meter" ||
        (!attempts.has(event.id) && event.event_type === "seven_meter_shot")
      );
    if (kind.startsWith("phase:")) return event.phase === kind.slice(6);
    if (kind === "numerical:7:6")
      return (
        numerical(event.numerical_for, 7) &&
        numerical(event.numerical_against, 6)
      );
    if (kind.startsWith("defense:")) {
      const p = possessionMap.get(s(event.possession_id));
      return Boolean(
        p &&
        p.organization_id === event.organization_id &&
        p.match_id === event.match_id &&
        p.analysis_session_id === event.analysis_session_id &&
        systems.get(p.id)?.has(kind.slice(8)),
      );
    }
    return event.event_type === kind;
  };
  return events.filter(
    (event) => (!player || event.actor_player_id === player) && matches(event),
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
