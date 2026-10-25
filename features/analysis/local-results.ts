import { z } from "zod";

const ms = z.number().int().nonnegative().max(86_400_000);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const score = z.tuple([z.number().int().min(0).max(200), z.number().int().min(0).max(200)]);
export const localCandidateSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["score_change_candidate", "scoreboard_discontinuity"]),
  video_start_ms: ms,
  video_end_ms: ms,
  before: score,
  after: score,
  side: z.enum(["left", "right"]).nullable(),
  note: z.string().max(1000),
}).strict().refine((c) => c.video_end_ms > c.video_start_ms, "Empty candidate interval");
export const localResultsSchema = z.object({
  schema: z.literal("sesen.workbench-analysis.v1"),
  source: z.object({
    name: z.string().min(1).max(500),
    size_bytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    sha256: digest,
    local_fingerprint: digest,
    fingerprint_scheme: z.literal("hbi-head-tail-size-v1"),
    duration_ms: ms.positive(),
  }).strict(),
  engine: z.object({
    name: z.string().min(1).max(200),
    model_sha256: digest,
    limitations: z.array(z.string().max(1000)).min(1).max(30),
  }).strict(),
  candidates: z.array(localCandidateSchema).max(5000),
}).strict().superRefine((report, ctx) => {
  const ids = new Set<string>();
  report.candidates.forEach((candidate, i) => {
    if (ids.has(candidate.id) || candidate.video_end_ms > report.source.duration_ms)
      ctx.addIssue({ code: "custom", path: ["candidates", i], message: "Duplicate identity or interval outside video" });
    ids.add(candidate.id);
    if (candidate.kind === "score_change_candidate") {
      const delta = [candidate.after[0] - candidate.before[0], candidate.after[1] - candidate.before[1]];
      if (!((delta[0] === 1 && delta[1] === 0 && candidate.side === "left") ||
        (delta[0] === 0 && delta[1] === 1 && candidate.side === "right")))
        ctx.addIssue({ code: "custom", path: ["candidates", i], message: "Score change is inconsistent" });
    }
  });
});
export type LocalResults = z.infer<typeof localResultsSchema>;
export type LocalCandidate = z.infer<typeof localCandidateSchema>;
export type ReviewDecision = { status: "unreviewed" | "reviewed" | "dismissed"; note: string };
export const decisionsSchema = z.record(z.uuid(), z.object({
  status: z.enum(["unreviewed", "reviewed", "dismissed"]),
  note: z.string().max(1000),
}).strict());
export function parseLocalResults(input: unknown, source: {
  local_fingerprint?: unknown; file_size_bytes?: unknown; duration_ms?: unknown;
}): LocalResults {
  const report = localResultsSchema.parse(input);
  if (!source.local_fingerprint || report.source.local_fingerprint !== source.local_fingerprint ||
      report.source.size_bytes !== source.file_size_bytes ||
      typeof source.duration_ms !== "number" ||
      Math.abs(report.source.duration_ms - source.duration_ms) > 1000)
    throw new Error("Analysis belongs to a different video / نتائج التحليل لا تخص الفيديو الحالي");
  return report;
}
export function reviewKey(user: string, org: string, session: string, video: string) {
  return JSON.stringify([user, org, session, video]);
}
export async function proposalClipId(org: string, session: string, video: string, candidate: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256",
    new TextEncoder().encode(JSON.stringify(["sesen-proposal-clip-v1", org, session, video, candidate]))));
  // UUIDv8: deterministic identity scoped to the destination, not a player identity.
  digest[6] = (digest[6]! & 15) | 128;
  digest[8] = (digest[8]! & 63) | 128;
  const hex = Array.from(digest.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
