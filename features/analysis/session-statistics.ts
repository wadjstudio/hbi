import { ratio } from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";

export type SessionScope = {
  organizationId: string;
  matchId: string;
  sessionId: string;
};
export type SessionSample = {
  events: Row[];
  shots: Row[];
  possessions: Row[];
  intervals: Row[];
};
export type SessionMetric = {
  key: string;
  ar: string;
  en: string;
  value: number | null;
  denominator: number | null;
  evidence: Row[];
  percent?: boolean;
};
export const sessionSample = (
  scope: SessionScope,
  input: SessionSample,
): SessionSample => {
  const inSession = (row: Row) =>
    Boolean(scope.sessionId) &&
    row.organization_id === scope.organizationId &&
    row.match_id === scope.matchId &&
    row.analysis_session_id === scope.sessionId;
  const events = input.events.filter(inSession);
  const ids = new Set(events.map((e) => e.id));
  return {
    events,
    shots: input.shots.filter(
      (sh) =>
        sh.organization_id === scope.organizationId && ids.has(s(sh.event_id)),
    ),
    possessions: input.possessions.filter(inSession),
    intervals: input.intervals.filter(inSession),
  };
};

// Counts describe recorded observations, never a claim of complete match coverage.
export const teamSessionMetrics = (
  teamId: string,
  sample: SessionSample,
): SessionMetric[] => {
  const events = sample.events.filter((e) => e.team_id === teamId);
  const ids = new Set(events.map((e) => e.id));
  const shots = sample.shots.filter((sh) => ids.has(s(sh.event_id)));
  const reviewed = shots.filter(
    (sh) =>
      !sh.review_required &&
      ["goal", "save", "miss", "blocked"].includes(s(sh.result)),
  );
  const shotEvents = (rows: Row[]) => {
    const ids = new Set(rows.map((sh) => s(sh.event_id)));
    return events.filter((e) => ids.has(e.id));
  };
  const goals = reviewed.filter((sh) => sh.result === "goal");
  const possessions = sample.possessions.filter(
    (p) =>
      p.team_id === teamId &&
      p.end_ms != null &&
      p.result != null &&
      p.result !== "unknown",
  );
  const scoring = possessions.filter((p) => p.result === "goal").length;
  const pids = new Set(possessions.map((p) => p.id));
  const eventCount = (key: string, ar: string, en: string): SessionMetric => {
    const rows = events.filter((e) => e.event_type === key);
    return {
      key,
      ar,
      en,
      value: rows.length,
      denominator: null,
      evidence: rows,
    };
  };
  return [
    {
      key: "goals",
      ar: "أهداف مراجعة",
      en: "Reviewed goals",
      value: goals.length,
      denominator: reviewed.length,
      evidence: shotEvents(goals),
    },
    {
      key: "efficiency",
      ar: "كفاءة التصويب",
      en: "Shot efficiency",
      value: ratio(goals.length, reviewed.length),
      denominator: reviewed.length,
      evidence: shotEvents(reviewed),
      percent: true,
    },
    {
      key: "pending",
      ar: "تصويبات للمراجعة",
      en: "Attempts to review",
      value: shots.length - reviewed.length,
      denominator: shots.length,
      evidence: shotEvents(shots.filter((sh) => !reviewed.includes(sh))),
    },
    {
      key: "possessions",
      ar: "هجمات مكتملة مصنفة",
      en: "Classified closed possessions",
      value: possessions.length,
      denominator: null,
      evidence: events.filter((e) => pids.has(s(e.possession_id))),
    },
    {
      key: "scoring",
      ar: "نسبة الهجمات المسجلة",
      en: "Scoring possessions",
      value: ratio(scoring, possessions.length),
      denominator: possessions.length,
      evidence: events.filter((e) => pids.has(s(e.possession_id))),
      percent: true,
    },
    eventCount("turnover", "فقد الكرة", "Turnovers"),
    eventCount("assist", "تمريرات حاسمة", "Assists"),
    eventCount("seven_meter_won", "كسب 7م", "7m won"),
    eventCount("two_minute_penalty", "إيقاف دقيقتين", "2-minute suspensions"),
  ];
};
