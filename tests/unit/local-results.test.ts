import { describe, expect, it } from "vitest";
import { parseLocalResults, proposalClipId, reviewKey } from "@/features/analysis/local-results";
const source = { local_fingerprint: "a".repeat(64), file_size_bytes: 500, duration_ms: 60000 };
const report = () => ({
  schema: "sesen.workbench-analysis.v1",
  source: { name: "match.mp4", sha256: "b".repeat(64), local_fingerprint: source.local_fingerprint,
    fingerprint_scheme: "hbi-head-tail-size-v1", size_bytes: 500, duration_ms: 60000 },
  engine: { name: "OCR", model_sha256: "c".repeat(64), limitations: ["Unreviewed score intervals only"] },
  candidates: [{ id: "55c9f4a1-1173-499c-bb98-9707cb40388e", kind: "score_change_candidate",
    video_start_ms: 5000, video_end_ms: 15000, before: [4, 4], after: [4, 5], side: "right", note: "Review" }],
});
describe("local analysis import", () => {
  it("preserves proposals without manufacturing confirmed events", () => {
    const parsed = parseLocalResults(report(), source);
    expect(parsed.candidates[0]?.video_start_ms).toBe(5000);
    expect(parsed).not.toHaveProperty("events");
  });
  it("rejects another file, wrong size, missing binding and wrong duration", () => {
    for (const patch of [{ local_fingerprint: "d".repeat(64) }, { file_size_bytes: 501 }, { local_fingerprint: null }, { duration_ms: 1000 }])
      expect(() => parseLocalResults(report(), { ...source, ...patch })).toThrow();
  });
  it("rejects duplicate candidates and times outside the source", () => {
    const duplicate = report(); duplicate.candidates.push(duplicate.candidates[0]!);
    expect(() => parseLocalResults(duplicate, source)).toThrow();
    const outside = report(); outside.candidates[0]!.video_end_ms = 60001;
    expect(() => parseLocalResults(outside, source)).toThrow();
  });
  it("rejects inconsistent scoring sides and non-forward intervals", () => {
    const wrong = report(); wrong.candidates[0]!.side = "left";
    expect(() => parseLocalResults(wrong, source)).toThrow();
    const backwards = report(); backwards.candidates[0]!.video_end_ms = 5000;
    expect(() => parseLocalResults(backwards, source)).toThrow();
  });
  it("does not trust a confirmed-events field", () => {
    expect(() => parseLocalResults({ ...report(), confirmed_events: [{ result: "goal" }] }, source)).toThrow();
  });
  it("isolates review storage by user, organization, session and video", () => {
    expect(new Set([reviewKey("a", "o", "s", "v"), reviewKey("b", "o", "s", "v"), reviewKey("a", "p", "s", "v"), reviewKey("a", "o", "t", "v"), reviewKey("a", "o", "s", "w")]).size).toBe(5);
  });
  it("creates retry-stable clip identities with separate destination scopes", async () => {
    const id = await proposalClipId("o", "s", "v", "c");
    expect(await proposalClipId("o", "s", "v", "c")).toBe(id);
    expect(await proposalClipId("p", "s", "v", "c")).not.toBe(id);
    expect(await proposalClipId("o", "t", "v", "c")).not.toBe(id);
    expect(id).toMatch(/^[a-f0-9-]{14}8/);
  });
});
