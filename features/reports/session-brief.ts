import {
  sessionSample,
  type SessionScope,
} from "@/features/analysis/session-statistics";
import { n, s, type Row } from "@/types/workspace";

export const sessionBrief = (
  scope: SessionScope,
  teamId: string,
  input: { events: Row[]; insights: Row[]; links: Row[] },
) => {
  const events = sessionSample(scope, {
    events: input.events,
    shots: [],
    possessions: [],
    intervals: [],
  })
    .events.filter((event) => event.team_id === teamId)
    .sort(
      (a, b) =>
        n(a.timestamp_ms) - n(b.timestamp_ms) || a.id.localeCompare(b.id),
    );
  const insights = input.insights
    .filter(
      (insight) =>
        insight.organization_id === scope.organizationId &&
        insight.team_id === teamId &&
        (!insight.match_id || insight.match_id === scope.matchId),
    )
    .map((insight) => {
      const ids = new Set(
        input.links
          .filter(
            (link) =>
              link.organization_id === scope.organizationId &&
              link.insight_id === insight.id,
          )
          .map((link) => s(link.event_id)),
      );
      return { insight, evidence: events.filter((event) => ids.has(event.id)) };
    })
    .filter((entry) => entry.evidence.length > 0);
  return { events, insights };
};
