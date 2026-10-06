import { describe, expect, it } from "vitest";
import {
  attachYouTubeSource,
  videoInput,
  youtubeId,
} from "../../features/video/source";
import type { Row, Table } from "../../types/workspace";
const org = "20000000-0000-4000-8000-000000000001",
  match: Row = {
    id: "50000000-0000-4000-8000-000000000001",
    organization_id: org,
  };
describe("online video source boundaries", () => {
  it("accepts official URL forms and rejects foreign, malformed and insecure sources", () => {
    for (const url of [
      "q-_grNLweEE",
      "https://youtu.be/q-_grNLweEE?t=5604",
      "https://www.youtube.com/watch?v=q-_grNLweEE",
      "https://www.youtube-nocookie.com/embed/q-_grNLweEE",
    ])
      expect(youtubeId(url)).toBe("q-_grNLweEE");
    for (const url of [
      "https://youtube.com.evil.test/watch?v=q-_grNLweEE",
      "http://youtube.com/watch?v=q-_grNLweEE",
      "https://youtube.com/watch?v=bad",
      "https://youtu.be/q-_grNLweEE/extra",
    ])
      expect(() => youtubeId(url)).toThrow();
  });
  it("uses distinct validated identities for local, shared and online sources", () => {
    expect(
      videoInput.safeParse({
        storage_mode: "youtube",
        youtube_video_id: "q-_grNLweEE",
      }).success,
    ).toBe(true);
    expect(
      videoInput.safeParse({
        storage_mode: "youtube",
        youtube_video_id: "q-_grNLweEE",
        local_fingerprint: "",
      }).success,
    ).toBe(false);
    expect(
      videoInput.safeParse({
        storage_mode: "local",
        local_fingerprint: "fp",
        r2_object_key: "optional-share",
      }).success,
    ).toBe(true);
    expect(
      videoInput.safeParse({
        storage_mode: "r2",
        r2_object_key: "object",
        local_fingerprint: "fp",
      }).success,
    ).toBe(true);
    expect(
      videoInput.safeParse({
        storage_mode: "local",
        youtube_video_id: "q-_grNLweEE",
        local_fingerprint: "fp",
      }).success,
    ).toBe(false);
  });
  it("reuses source and session on retries without replacing a local session or its primary flag", async () => {
    const saved: { table: Table; row: Row }[] = [];
    const save = async (table: Table, input: Partial<Row>) => {
      const row = { ...input, id: input.id!, organization_id: org } as Row;
      saved.push({ table, row });
      return row;
    };
    const local: Row = {
      id: crypto.randomUUID(),
      organization_id: org,
      video_id: crypto.randomUUID(),
      is_primary: true,
      match_id: match.id,
    };
    const input = {
      org,
      role: "analyst",
      match,
      url: "https://youtu.be/q-_grNLweEE",
      videos: [] as Row[],
      sessions: [local],
      save,
    };
    const first = await attachYouTubeSource(input);
    expect(first.session.is_primary).toBe(false);
    expect(first.session.video_id).toBe(first.video.id);
    const retry = await attachYouTubeSource({
      ...input,
      videos: [first.video],
      sessions: [local, first.session],
    });
    expect(retry).toEqual(first);
    expect(saved).toHaveLength(2);
    await expect(
      attachYouTubeSource({ ...input, role: "viewer" }),
    ).rejects.toThrow();
    await expect(
      attachYouTubeSource({ ...input, org: crypto.randomUUID() }),
    ).rejects.toThrow("another organization");
    expect(saved).toHaveLength(2);
  });
});
