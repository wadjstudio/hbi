import { s, type Row } from "@/types/workspace";

export type AccountIdentity = { name: string; email: string; initials: string };
export const accountIdentity = (
  user: { email?: string; user_metadata?: Record<string, unknown> } | null,
): AccountIdentity => {
  const text = (value: unknown, limit: number) =>
    typeof value === "string" ? value.trim().slice(0, limit) : "";
  const email = text(user?.email, 254);
  const metadata = user?.user_metadata;
  const name =
    [metadata?.display_name, metadata?.full_name, metadata?.name]
      .map((v) => text(v, 80))
      .find(Boolean) ||
    email.split("@")[0] ||
    "";
  const initials = name
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("")
    .toUpperCase();
  return { name, email, initials };
};

export const analysisPath = (
  matchId: string,
  sessionId: string,
  timeMs: number,
) => {
  const query = new URLSearchParams();
  if (sessionId) query.set("session", sessionId);
  if (Number.isSafeInteger(timeMs) && timeMs > 0)
    query.set("at", String(timeMs));
  return `/matches/${encodeURIComponent(matchId)}${query.size ? `?${query}` : ""}`;
};

// Relevance follows real clip/event/insight links; titles and free text imply no match relationship.
export const relatedPresentations = (
  organizationId: string,
  matchId: string,
  rows: {
    presentations: Row[];
    items: Row[];
    clips: Row[];
    events: Row[];
    evidence: Row[];
  },
) => {
  const events = new Set(
    rows.events
      .filter(
        (e) => e.organization_id === organizationId && e.match_id === matchId,
      )
      .map((e) => e.id),
  );
  const clips = new Set(
    rows.clips
      .filter(
        (c) => c.organization_id === organizationId && c.match_id === matchId,
      )
      .map((c) => c.id),
  );
  const insights = new Set(
    rows.evidence
      .filter(
        (l) =>
          l.organization_id === organizationId && events.has(s(l.event_id)),
      )
      .map((l) => s(l.insight_id)),
  );
  const ids = new Set(
    rows.items
      .filter(
        (i) =>
          i.organization_id === organizationId &&
          (clips.has(s(i.clip_id)) || insights.has(s(i.insight_id))),
      )
      .map((i) => s(i.presentation_id)),
  );
  return rows.presentations.filter(
    (p) => p.organization_id === organizationId && ids.has(p.id),
  );
};
