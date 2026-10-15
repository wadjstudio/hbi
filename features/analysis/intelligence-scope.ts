import { s, type Row } from "@/types/workspace";

export type IntelligenceScope = "session" | 3 | 5 | 10;
type ScopeRows = {
  matches: Row[];
  sessions: Row[];
  events: Row[];
  possessions: Row[];
  shots: Row[];
};

export function historicalIntelligence(
  org: string,
  team: string,
  anchorId: string,
  count: 3 | 5 | 10,
  rows: ScopeRows,
) {
  const owned = (row: Row) => row.organization_id === org;
  const anchor = rows.matches.find((m) => owned(m) && m.id === anchorId);
  const anchorTime = Date.parse(s(anchor?.starts_at));
  const matches = Number.isFinite(anchorTime)
    ? rows.matches
        .filter(
          (m) =>
            owned(m) &&
            [m.home_team_id, m.away_team_id].includes(team) &&
            Number.isFinite(Date.parse(s(m.starts_at))) &&
            Date.parse(s(m.starts_at)) <= anchorTime,
        )
        .sort(
          (a, b) =>
            Date.parse(s(b.starts_at)) - Date.parse(s(a.starts_at)) ||
            a.id.localeCompare(b.id),
        )
        .slice(0, count)
    : [];
  const selected = new Map<string, Row>();
  let missing = 0,
    ambiguous = 0;
  for (const match of matches) {
    const primary = rows.sessions.filter(
      (session) =>
        owned(session) &&
        session.match_id === match.id &&
        session.is_primary === true,
    );
    if (!primary.length) missing++;
    else if (primary.length !== 1) ambiguous++;
    else selected.set(primary[0]!.id, match);
  }
  const inSample = (row: Row) => {
    const match = selected.get(s(row.analysis_session_id));
    return Boolean(
      match &&
      owned(row) &&
      match.id === row.match_id &&
      [match.home_team_id, match.away_team_id].includes(row.team_id),
    );
  };
  const events = rows.events.filter(inSample);
  const ids = new Set(events.map((e) => e.id));
  return {
    matches,
    sessions: selected.size,
    missing,
    ambiguous,
    needsDate: !Number.isFinite(anchorTime),
    events,
    possessions: rows.possessions.filter(inSample),
    shots: rows.shots.filter(
      (shot) => owned(shot) && ids.has(s(shot.event_id)),
    ),
  };
}

export function evidenceSource(
  org: string,
  event: Row,
  matches: Row[],
  sessions: Row[],
  videos: Row[],
) {
  if (event.organization_id !== org) return null;
  const match = matches.find(
    (m) => m.organization_id === org && m.id === event.match_id,
  );
  const session = sessions.find(
    (a) =>
      a.organization_id === org &&
      a.id === event.analysis_session_id &&
      a.match_id === match?.id,
  );
  if (
    !match ||
    !session ||
    ![match.home_team_id, match.away_team_id].includes(event.team_id)
  )
    return null;
  const video = videos.find(
    (v) =>
      v.organization_id === org &&
      v.id === session.video_id &&
      (v.match_id == null || v.match_id === match.id),
  );
  return { match, session, video };
}
