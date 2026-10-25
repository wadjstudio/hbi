// @vitest-environment jsdom
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { useRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TrackingReview } from "@/components/workspace/tracking-review";
import { TrackingOverlay } from "@/components/workspace/tracking-overlay";
import { useTrackingReview } from "@/features/analysis/use-tracking-review";
import { analysisReviews } from "@/lib/local/analysis-reviews";
import { trackingFixture } from "@/tests/fixtures/tracking-results";
import { reviewKey } from "@/features/analysis/local-results";
vi.mock("@/components/workspace/provider", () => ({ useWorkspace: () => ({ t: (_ar: string, en: string) => en }) }));
const video = { id: "video", organization_id: "org", local_fingerprint: "b".repeat(64), file_size_bytes: 500, duration_ms: 60000, width: 1280, height: 720 };
const scope = reviewKey("coach", "org", "session", "video");
function Harness({ time = 1000, keyScope = scope }: { time?: number; keyScope?: string }) {
  const state = useTrackingReview(keyScope, video), ref = useRef<HTMLVideoElement>(null);
  return <><TrackingReview scope={keyScope} video={video} {...state} timeMs={time}
    selection={{ scope: keyScope, frame: 0, track: 1 }} isAvailable isVisible
    onVisibility={() => {}} onSeek={() => {}} onSelect={() => {}} />
    {state.draft && <TrackingOverlay report={state.draft.report} corrections={state.draft.corrections} videoRef={ref} timeMs={time} onSelect={() => {}} />}</>;
}
afterEach(async () => { cleanup(); await analysisReviews.tracking.clear(); });
it("imports source-bound samples and restores manual frame corrections after remount", async () => {
  render(<Harness />);
  const file = new File(["{}"], "tracks.json");
  Object.defineProperty(file, "text", { value: async () => JSON.stringify(trackingFixture()) });
  fireEvent.change(await screen.findByLabelText("Import tracking sample or review"), { target: { files: [file] } });
  await screen.findByText(/Correct this frame only/);
  expect(document.querySelector('[data-track-id="0:1"]')).not.toBeNull();
  fireEvent.change(screen.getByLabelText("x1"), { target: { value: "0.15" } });
  fireEvent.click(screen.getByRole("button", { name: "Save frame correction" }));
  await waitFor(() => expect(document.querySelector('[data-track-id="0:1"]')?.getAttribute("data-manual")).toBe("true"));
  cleanup(); render(<Harness />);
  await waitFor(() => expect((screen.getByLabelText("x1") as HTMLInputElement).value).toBe("0.15"));
  fireEvent.click(screen.getByRole("button", { name: "Hide this proposal" }));
  await waitFor(() => expect(document.querySelector('[data-track-id="0:1"]')).toBeNull());
  fireEvent.click(screen.getByRole("button", { name: "Restore model proposal" }));
  await waitFor(() => expect(document.querySelector('[data-track-id="0:1"]')?.getAttribute("data-manual")).toBe("false"));
});
it("shows no stale boxes on a lost-observation frame or outside the sample", async () => {
  await analysisReviews.tracking.put({ key: scope, report: trackingFixture(), corrections: {} });
  const { rerender } = render(<Harness time={1100} />);
  await screen.findByText(/0 observed proposals/);
  expect(document.querySelectorAll("[data-track-id]").length).toBe(0);
  rerender(<Harness time={1300} />);
  await screen.findByText(/Outside sample interval/);
  expect(document.querySelector('[data-slot="tracking-overlay"]')).toBeNull();
  rerender(<Harness time={1000} />);
  await waitFor(() => expect(document.querySelector('[data-track-id="0:1"]')).not.toBeNull());
  rerender(<Harness time={1000} keyScope={reviewKey("another-coach", "org", "session", "video")} />);
  expect(document.querySelector('[data-slot="tracking-overlay"]')).toBeNull();
  await screen.findByText(/Import the source-bound local ByteTrack sample/);
  expect(document.querySelector('[data-slot="tracking-overlay"]')).toBeNull();
});
it("upgrades the review database without losing existing scoreboard review rows", async () => {
  analysisReviews.close();
  await analysisReviews.delete();
  const old = new Dexie("sesen-analysis-reviews-v1");
  old.version(1).stores({ reviews: "key" });
  await old.table("reviews").put({ key: "saved-scoreboard", decisions: { note: "Keep" } });
  old.close();
  await analysisReviews.open();
  expect((await analysisReviews.reviews.get("saved-scoreboard"))?.decisions).toEqual({ note: "Keep" });
  expect(analysisReviews.tables.map((t) => t.name)).toContain("tracking");
  await analysisReviews.reviews.clear();
});
