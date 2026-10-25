"use client";
import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { analysisReviews } from "@/lib/local/analysis-reviews";
import { parseTracking, validateCorrections } from "./tracking-results";
import { validateTacticalReview } from "./tactical-proposals";
import type { Row } from "@/types/workspace";

export function useTrackingReview(key: string, video: Row | undefined) {
  const saved = useLiveQuery(async () => (await analysisReviews.tracking.get(key)) ?? null, [key]);
  return useMemo(() => {
    // Async queries can retain their prior value while a new account/session loads.
    if (saved && saved.key !== key) return { draft: null, error: "", loading: true };
    if (!saved || !video) return { draft: null, error: "", loading: saved === undefined };
    try {
      const report = parseTracking(saved.report, { local_fingerprint: video.local_fingerprint,
        file_size_bytes: video.file_size_bytes, duration_ms: video.duration_ms,
        width: video.width, height: video.height });
      const corrections = validateCorrections(report, saved.corrections);
      const tactics = saved.tactics ? validateTacticalReview(report, corrections, saved.tactics) : undefined;
      return { draft: { key, report, corrections, tactics }, error: "", loading: false };
    } catch {
      return { draft: null, error: "Saved tracking is incompatible / التتبّع المحفوظ غير متوافق", loading: false };
    }
  }, [saved, key, video]);
}
