import { describe, expect, it, vi } from "vitest";
import { addCoachClipToMeeting, clipRange, coachClipSource, saveCoachClip, saveCoachMeeting, scopedCoachClips, type CoachClipStore } from "@/features/analysis/coach-clips";
import { type Row, type Rows, type Table } from "@/types/workspace";
const scope = { organizationId: "org", matchId: "match", sessionId: "session", videoId: "video" };
function fixture() {
  const row = (id: string, value: Partial<Row> = {}): Row => ({ id, organization_id: "org", ...value });
  const rows: Rows = { matches: [row("match")], analysis_sessions: [row("session", { match_id: "match", video_id: "video" })],
    videos: [row("video", { match_id: "match", duration_ms: 10000 })], clips: [], presentations: [row("meeting", { title: "Team review" })], presentation_items: [] };
  const save = vi.fn(async (table: Table, input: Partial<Row>) => {
    const result = row(input.id!, input);
    rows[table] = [...(rows[table] ?? []).filter((r) => r.id !== result.id), result];
    return result;
  });
  return { rows, save, role: "analyst" } satisfies CoachClipStore;
}
const input = { title: "  Pivot cooperation  ", start_ms: 1000, end_ms: 4500 };
describe("source-bound coach clips and meeting handoff", () => {
  it("accepts exact millisecond boundaries and rejects empty, inverted, unsafe and out-of-source times", () => {
    expect(clipRange("0", "1.234", 1234)).toEqual({ start_ms: 0, end_ms: 1234 });
    for (const [start, end, duration] of [["", "2", 10000], ["-1", "2", 10000], ["1e1", "20", 30000],
      ["2", "2", 10000], ["0", "1.2345", 10000], ["0", "11", 10000], ["0", "1", NaN]] as const)
      expect(() => clipRange(start, end, duration)).toThrow("invalid_clip");
  });
  it("requires compatible organization, match, session, video and duration before writing", async () => {
    for (const mutate of [
      (r: Rows) => { r.analysis_sessions![0]!.video_id = "other"; },
      (r: Rows) => { r.videos![0]!.organization_id = "foreign"; },
      (r: Rows) => { r.videos![0]!.match_id = "other"; },
      (r: Rows) => { r.videos![0]!.duration_ms = null; },
    ]) {
      const store = fixture(); mutate(store.rows);
      await expect(saveCoachClip(scope, input, store)).rejects.toThrow("source_scope");
      expect(store.save).not.toHaveBeenCalled();
    }
    expect(coachClipSource(scope, fixture().rows).durationMs).toBe(10000);
  });
  it("reuses exact saved clip IDs on retries, scopes different sessions and never overwrites an edited clip", async () => {
    const store = fixture();
    const clip = await saveCoachClip(scope, input, store);
    expect(clip.title).toBe("Pivot cooperation");
    expect(await saveCoachClip(scope, input, store)).toEqual(clip);
    expect(store.save).toHaveBeenCalledTimes(1);
    store.rows.analysis_sessions!.push({ ...store.rows.analysis_sessions![0]!, id: "second" });
    expect((await saveCoachClip({ ...scope, sessionId: "second" }, input, store)).id).not.toBe(clip.id);
    clip.title = "Coach changed this";
    await expect(saveCoachClip(scope, input, store)).rejects.toThrow("stale_clip");
    expect(store.save.mock.calls.every(([table]) => table === "clips")).toBe(true);
  });
  it("keeps read-only and invalid clip writes out of the queue", async () => {
    const store = fixture(); store.role = "viewer";
    await expect(saveCoachClip(scope, input, store)).rejects.toThrow("denied");
    await expect(addCoachClipToMeeting(scope, "clip", "meeting", "", store)).rejects.toThrow("denied");
    await expect(saveCoachMeeting(scope, "Meeting", store)).rejects.toThrow("denied");
    store.role = "analyst";
    await expect(saveCoachClip(scope, { ...input, end_ms: 20000 }, store)).rejects.toThrow("invalid_clip");
    expect(store.save).not.toHaveBeenCalled();
  });
  it("appends a typed clip with the presenter note and does not duplicate or rewrite an existing meeting item", async () => {
    const store = fixture(), clip = await saveCoachClip(scope, input, store);
    store.rows.presentation_items!.push({ id: "text", organization_id: "org", presentation_id: "meeting", position: 4, body: "Prepare defense" });
    const result = await addCoachClipToMeeting(scope, clip.id, "meeting", "  Watch the pivot  ", store);
    expect(result.added).toBe(true);
    expect(result.item).toMatchObject({ presentation_id: "meeting", clip_id: clip.id, position: 5, speaker_note: "Watch the pivot", autoplay: false });
    const retry = await addCoachClipToMeeting(scope, clip.id, "meeting", "Different note", store);
    expect(retry.added).toBe(false); expect(retry.item.speaker_note).toBe("Watch the pivot");
    expect(store.save.mock.calls.filter(([table]) => table === "presentation_items")).toHaveLength(1);
  });
  it("rejects foreign meetings, unrelated clips and invalid positions before queuing meeting content", async () => {
    for (const mode of ["foreign", "clip", "position"] as const) {
      const store = fixture(), clip = await saveCoachClip(scope, input, store); store.save.mockClear();
      if (mode === "foreign") store.rows.presentations![0]!.organization_id = "other";
      if (mode === "clip") clip.video_id = "other";
      if (mode === "position") store.rows.presentation_items!.push({ id: "bad", organization_id: "org", presentation_id: "meeting", position: -1, body: "Text" });
      await expect(addCoachClipToMeeting(scope, clip.id, "meeting", "", store)).rejects.toThrow("invalid_meeting");
      expect(store.save).not.toHaveBeenCalled();
    }
  });
  it("filters invalid/foreign clips and creates a retry-stable meeting without replacing its edited title", async () => {
    const store = fixture(), clip = await saveCoachClip(scope, input, store);
    store.rows.clips!.push({ ...clip, id: "foreign", organization_id: "other" }, { ...clip, id: "bad", end_ms: 20000 });
    expect(scopedCoachClips(scope, store.rows).map((r) => r.id)).toEqual([clip.id]);
    const meeting = await saveCoachMeeting(scope, " Match review ", store);
    expect(await saveCoachMeeting(scope, "Match review", store)).toEqual(meeting);
    meeting.title = "Edited meeting";
    await expect(saveCoachMeeting(scope, "Match review", store)).rejects.toThrow("invalid_meeting");
  });
});
