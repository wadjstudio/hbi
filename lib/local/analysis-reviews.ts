import Dexie, { type EntityTable } from "dexie";
import type { LocalResults, ReviewDecision } from "@/features/analysis/local-results";
import type { TrackingReport, TrackingCorrections } from "@/features/analysis/tracking-results";
import type { TacticalReview } from "@/features/analysis/tactical-proposals";

export type AnalysisReview = {
  key: string;
  report: LocalResults;
  decisions: Record<string, ReviewDecision>;
};
export type TrackingReview = { key: string; report: TrackingReport; corrections: TrackingCorrections; tactics?: TacticalReview };
class ReviewDB extends Dexie {
  reviews!: EntityTable<AnalysisReview, "key">;
  tracking!: EntityTable<TrackingReview, "key">;
  constructor() {
    super("sesen-analysis-reviews-v1");
    this.version(1).stores({ reviews: "key" });
    this.version(2).stores({ reviews: "key", tracking: "key" });
  }
}
export const analysisReviews = new ReviewDB();
