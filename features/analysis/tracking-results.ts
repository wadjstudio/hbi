import { z } from "zod";
import { localResultsSchema } from "./local-results";

const ms = z.number().int().nonnegative().max(86_400_000);
const box = z.tuple([z.number().finite().min(-2).max(3), z.number().finite().min(-2).max(3),
  z.number().finite().min(-2).max(3), z.number().finite().min(-2).max(3)])
  .refine((b) => b[2] > b[0] && b[3] > b[1], "A box needs positive area");
export type TrackingBox = z.infer<typeof box>;
const person = z.object({ track_id: z.number().int().min(1).max(10_000_000),
  box, score: z.number().min(0).max(1) }).strict();
export const trackingSchema = z.object({
  schema: z.literal("sesen.workbench-tracking.v1"),
  source: localResultsSchema.shape.source.extend({
    width: z.number().int().min(1).max(16384), height: z.number().int().min(1).max(16384),
  }).strict(),
  engine: z.object({ name: z.string().min(1).max(200), model: z.string().min(1).max(200),
    model_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    limitations: z.array(z.string().max(1000)).min(1).max(30) }).strict(),
  time_basis: z.literal("nominal-source-samples"),
  start_ms: ms, end_ms: ms, sample_fps: z.number().int().min(1).max(60),
  frames: z.array(z.object({ video_ms: ms, scene: z.number().int().min(0).max(900),
    persons: z.array(person).max(100) }).strict()).min(1).max(900),
}).strict().superRefine((report, ctx) => {
  if (report.end_ms <= report.start_ms || report.end_ms > report.source.duration_ms ||
      report.end_ms - report.start_ms > 90000 ||
      report.frames.length !== (report.end_ms - report.start_ms) * report.sample_fps / 1000)
    ctx.addIssue({ code: "custom", message: "Invalid bounded sample coverage" });
  report.frames.forEach((frame, index) => {
    const expected = Math.round(report.start_ms + index * 1000 / report.sample_fps);
    const previousScene = report.frames[index - 1]?.scene ?? frame.scene;
    const ids = new Set(frame.persons.map((p) => p.track_id));
    if (Math.abs(frame.video_ms - expected) > 1 || frame.scene < previousScene ||
        frame.scene > previousScene + 1 || ids.size !== frame.persons.length)
      ctx.addIssue({ code: "custom", path: ["frames", index], message: "Invalid sample grid, scene or repeated track" });
  });
});
export type TrackingReport = z.infer<typeof trackingSchema>;
export type TrackingFrame = TrackingReport["frames"][number];
export const correctionSchema = z.object({
  frame_index: z.number().int().min(0).max(899),
  scene: z.number().int().min(0).max(900), track_id: z.number().int().positive(),
  box: box.refine((b) => b.every((v) => v >= 0 && v <= 1), "Manual box outside video").nullable(),
  note: z.string().max(500),
}).strict();
export type TrackingCorrection = z.infer<typeof correctionSchema>;
export const trackingCorrectionsSchema = z.record(z.string().max(64), correctionSchema);
export type TrackingCorrections = z.infer<typeof trackingCorrectionsSchema>;
export const trackingCorrectionKey = (frame: number, scene: number, track: number) => `${frame}:${scene}:${track}`;
export function validateCorrections(report: TrackingReport, input: unknown) {
  const corrections = trackingCorrectionsSchema.parse(input);
  for (const [key, c] of Object.entries(corrections)) {
    const frame = report.frames[c.frame_index];
    if (key !== trackingCorrectionKey(c.frame_index, c.scene, c.track_id) ||
        !frame || frame.scene !== c.scene || !frame.persons.some((p) => p.track_id === c.track_id))
      throw new Error("Correction belongs to another frame or scene");
  }
  return corrections;
}
export function parseTracking(input: unknown, source: {
  local_fingerprint?: unknown; file_size_bytes?: unknown; duration_ms?: unknown;
  width?: unknown; height?: unknown;
}) {
  const report = trackingSchema.parse(input);
  if (!source.local_fingerprint || source.local_fingerprint !== report.source.local_fingerprint ||
      source.file_size_bytes !== report.source.size_bytes || typeof source.duration_ms !== "number" ||
      Math.abs(source.duration_ms - report.source.duration_ms) > 1000 ||
      source.width !== report.source.width || source.height !== report.source.height)
    throw new Error("Tracking belongs to a different video / التتبّع لا يخص الفيديو الحالي");
  return report;
}
export function trackingFrameIndex(report: TrackingReport, time: number) {
  if (!Number.isFinite(time) || time < report.start_ms || time >= report.end_ms) return -1;
  // Source sampling is nominal. Never borrow a future sample or fill a missing detection.
  let low = 0, high = report.frames.length - 1, found = -1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (report.frames[mid]!.video_ms <= time) { found = mid; low = mid + 1; }
    else high = mid - 1;
  }
  return found >= 0 && time - report.frames[found]!.video_ms < 1000 / report.sample_fps + 1 ? found : -1;
}
export function visibleTrackingBox(raw: TrackingBox): TrackingBox | null {
  const clipped = raw.map((v) => Math.max(0, Math.min(1, v))) as TrackingBox;
  return clipped[2] > clipped[0] && clipped[3] > clipped[1] ? clipped : null;
}
