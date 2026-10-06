import { z } from "zod";
import type { Row, Table } from "@/types/workspace";
import { canWrite } from "@/lib/permissions/roles";
export const youtubeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);
export function youtubeId(input: string) {
  const value = input.trim();
  if (youtubeIdSchema.safeParse(value).success) return value;
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Use an HTTPS YouTube URL");
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1);
  else if (
    [
      "youtube.com",
      "www.youtube.com",
      "m.youtube.com",
      "www.youtube-nocookie.com",
    ].includes(host)
  ) {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else if (/^\/(embed|live|shorts)\/[^/]+$/.test(url.pathname))
      id = url.pathname.split("/")[2] ?? null;
  }
  return youtubeIdSchema.parse(id);
}
export const videoInput = z
  .object({
    storage_mode: z.enum(["local", "r2", "youtube"]),
    duration_ms: z.number().int().nonnegative().nullable().optional(),
    local_fingerprint: z.string().nullable().optional(),
    r2_object_key: z.string().nullable().optional(),
    youtube_video_id: youtubeIdSchema.nullable().optional(),
  })
  .passthrough()
  .superRefine((video, ctx) => {
    const valid =
      video.storage_mode === "youtube"
        ? Boolean(
            video.youtube_video_id &&
            video.local_fingerprint == null &&
            video.r2_object_key == null,
          )
        : video.youtube_video_id == null &&
          Boolean(
            video.storage_mode === "local"
              ? video.local_fingerprint
              : video.r2_object_key,
          );
    if (!valid)
      ctx.addIssue({
        code: "custom",
        message: "Video source identity is incomplete or mixed",
      });
  });
async function scopedId(key: string) {
  const bytes = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key)),
  ).slice(0, 16);
  bytes[6] = (bytes[6]! & 15) | 128;
  bytes[8] = (bytes[8]! & 63) | 128;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
export async function attachYouTubeSource(input: {
  org: string;
  role: string;
  match: Row;
  url: string;
  videos: Row[];
  sessions: Row[];
  save: (table: Table, row: Partial<Row>) => Promise<Row>;
}) {
  if (
    !canWrite(input.role, "videos") ||
    !canWrite(input.role, "analysis_sessions")
  )
    throw new Error("Your role cannot attach a source");
  if (input.match.organization_id !== input.org)
    throw new Error("Match belongs to another organization");
  const id = youtubeId(input.url);
  const video =
    input.videos.find(
      (v) =>
        v.organization_id === input.org &&
        v.match_id === input.match.id &&
        v.storage_mode === "youtube" &&
        v.youtube_video_id === id,
    ) ??
    (await input.save("videos", {
      id: await scopedId(`youtube:${input.org}:${input.match.id}:${id}`),
      match_id: input.match.id,
      storage_mode: "youtube",
      youtube_video_id: id,
      status: "pending",
      original_filename: `YouTube · ${id}`,
    }));
  const session =
    input.sessions.find(
      (a) =>
        a.organization_id === input.org &&
        a.match_id === input.match.id &&
        a.video_id === video.id,
    ) ??
    (await input.save("analysis_sessions", {
      id: await scopedId(`youtube-session:${input.org}:${video.id}`),
      match_id: input.match.id,
      video_id: video.id,
      title:
        typeof input.match.title === "string"
          ? input.match.title
          : `YouTube · ${id}`,
      is_primary: !input.sessions.some(
        (a) =>
          a.organization_id === input.org &&
          a.match_id === input.match.id &&
          a.is_primary,
      ),
    }));
  return { video, session };
}
