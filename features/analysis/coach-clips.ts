import { z } from "zod";
import { canWrite } from "@/lib/permissions/roles";
import { proposalClipId } from "./local-results";
import { type Row, type Rows, type Table } from "@/types/workspace";

export type CoachClipScope = { organizationId: string; matchId: string; sessionId: string; videoId: string };
export type CoachClipStore = { role: string; rows: Rows; save: (table: Table, row: Partial<Row>) => Promise<Row> };
export const coachClipInput = z.object({ title: z.string().trim().min(1).max(160),
  start_ms: z.number().int().nonnegative().safe(), end_ms: z.number().int().positive().safe(),
}).strict().refine((v) => v.end_ms > v.start_ms, "invalid_clip");

export function clipRange(start: string, end: string, durationMs: number) {
  const seconds = (value: string) => /^\d+(?:\.\d{1,3})?$/.test(value.trim()) ? Number(value) * 1000 : NaN;
  const startMs = Math.round(seconds(start)), endMs = Math.round(seconds(end));
  if (![startMs, endMs, durationMs].every(Number.isSafeInteger) ||
      startMs < 0 || endMs <= startMs || endMs > durationMs) throw new Error("invalid_clip");
  return { start_ms: startMs, end_ms: endMs };
}

export function coachClipSource(scope: CoachClipScope, rows: Rows) {
  const owned = (table: Table, id: string) => rows[table]?.find((r) => r.id === id && r.organization_id === scope.organizationId);
  const match = owned("matches", scope.matchId), session = owned("analysis_sessions", scope.sessionId), video = owned("videos", scope.videoId);
  if (!match || !session || !video || session.match_id !== match.id || session.video_id !== video.id || video.match_id !== match.id ||
      typeof video.duration_ms !== "number" || !Number.isSafeInteger(video.duration_ms) || video.duration_ms <= 0)
    throw new Error("source_scope");
  return { match, session, video, durationMs: video.duration_ms };
}

export function scopedCoachClips(scope: CoachClipScope, rows: Rows) {
  const { durationMs } = coachClipSource(scope, rows);
  return (rows.clips ?? []).filter((r) => r.organization_id === scope.organizationId && r.video_id === scope.videoId &&
    r.match_id === scope.matchId && Number.isSafeInteger(r.start_ms) && Number.isSafeInteger(r.end_ms) &&
    Number(r.start_ms) >= 0 && Number(r.end_ms) > Number(r.start_ms) && Number(r.end_ms) <= durationMs)
    .sort((a, b) => Number(a.start_ms) - Number(b.start_ms) || a.id.localeCompare(b.id));
}

export async function saveCoachClip(scope: CoachClipScope, input: unknown, store: CoachClipStore) {
  if (!canWrite(store.role, "clips")) throw new Error("denied");
  const { durationMs } = coachClipSource(scope, store.rows);
  const parsed = coachClipInput.safeParse(input);
  if (!parsed.success || parsed.data.end_ms > durationMs) throw new Error("invalid_clip");
  const value = parsed.data;
  const id = await proposalClipId(scope.organizationId, scope.sessionId, scope.videoId,
    JSON.stringify(["coach-range-v1", value.start_ms, value.end_ms, value.title]));
  const existing = store.rows.clips?.find((r) => r.id === id);
  if (existing) {
    if (existing.organization_id !== scope.organizationId || existing.video_id !== scope.videoId || existing.match_id !== scope.matchId ||
        existing.start_ms !== value.start_ms || existing.end_ms !== value.end_ms || existing.title !== value.title) throw new Error("stale_clip");
    return existing;
  }
  return store.save("clips", { id, video_id: scope.videoId, match_id: scope.matchId, ...value });
}

export async function addCoachClipToMeeting(scope: CoachClipScope, clipId: string, meetingId: string, note: string, store: CoachClipStore) {
  if (!canWrite(store.role, "presentation_items")) throw new Error("denied");
  const clip = scopedCoachClips(scope, store.rows).find((r) => r.id === clipId);
  const meeting = store.rows.presentations?.find((r) => r.id === meetingId && r.organization_id === scope.organizationId);
  if (!clip || !meeting || note.length > 2000) throw new Error("invalid_meeting");
  const items = (store.rows.presentation_items ?? []).filter((r) => r.organization_id === scope.organizationId && r.presentation_id === meetingId);
  const existing = items.find((r) => r.clip_id === clipId && !r.tactic_id && !r.insight_id && !r.body);
  if (existing) return { item: existing, added: false };
  if (items.some((r) => !Number.isSafeInteger(r.position) || Number(r.position) < 0)) throw new Error("invalid_meeting");
  const position = Math.max(-1, ...items.map((r) => Number(r.position))) + 1;
  if (position > 2147483647) throw new Error("invalid_meeting");
  const id = await proposalClipId(scope.organizationId, scope.sessionId, scope.videoId, JSON.stringify(["meeting-clip-v1", meetingId, clipId]));
  const collision = store.rows.presentation_items?.find((r) => r.id === id);
  if (collision) throw new Error("invalid_meeting");
  const item = await store.save("presentation_items", { id, presentation_id: meetingId, clip_id: clipId,
    position, speaker_note: note.trim() || null, autoplay: false });
  return { item, added: true };
}

export async function saveCoachMeeting(scope: CoachClipScope, title: string, store: CoachClipStore) {
  if (!canWrite(store.role, "presentations")) throw new Error("denied");
  coachClipSource(scope, store.rows);
  const parsed = z.string().trim().min(1).max(160).safeParse(title);
  if (!parsed.success) throw new Error("invalid_meeting");
  const id = await proposalClipId(scope.organizationId, scope.sessionId, scope.videoId, JSON.stringify(["coach-meeting-v1", parsed.data]));
  const existing = store.rows.presentations?.find((r) => r.id === id);
  if (existing) {
    if (existing.organization_id !== scope.organizationId || existing.title !== parsed.data) throw new Error("invalid_meeting");
    return existing;
  }
  return store.save("presentations", { id, title: parsed.data });
}
