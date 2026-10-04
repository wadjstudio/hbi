import { s, type Row } from "@/types/workspace";

// Keep raw milliseconds and stable IDs so exported observations can be audited.
const fields = [
  "id",
  "event_id",
  "match_id",
  "analysis_session_id",
  "team_id",
  "video_ms",
  "period",
  "match_clock_ms",
  "actor_position",
  "result",
  "shooter_id",
  "goalkeeper_id",
  "zone",
  "empty_goal",
  "review_required",
] as const;

function cell(value: unknown) {
  const text = s(value);
  const safe = /^[\s]*[=+@-]/u.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function shotsCsv(shots: Row[], events: Row[]) {
  const byId = new Map(events.map((event) => [event.id, event]));
  return (
    "\uFEFF" +
    [
      fields.map(cell).join(","),
      ...shots.map((shot) => {
        const event = byId.get(s(shot.event_id));
      const row: Row = {
          ...shot,
          match_id: event?.match_id,
          analysis_session_id: event?.analysis_session_id,
          team_id: event?.team_id,
          video_ms: event?.timestamp_ms,
          period: event?.period,
          match_clock_ms: event?.match_clock_ms,
          actor_position: event?.actor_position,
        };
        return fields.map((field) => cell(row[field])).join(",");
      }),
    ].join("\r\n")
  );
}
