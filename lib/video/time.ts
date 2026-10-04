import { n, type Row } from "@/types/workspace";
export function matchClock(
  rows: Row[],
  ms: number,
): { period: number; clockMs: number } | null {
  const r = rows.find(
    (r) => n(r.video_start_ms) <= ms && ms < n(r.video_end_ms),
  );
  return r
    ? {
        period: n(r.period),
        clockMs:
          n(r.clock_start_ms) + (r.running ? ms - n(r.video_start_ms) : 0),
      }
    : null;
}
export function formatTime(ms: number): string {
  return `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
}
